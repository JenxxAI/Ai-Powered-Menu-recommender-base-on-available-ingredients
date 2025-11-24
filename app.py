from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import requests
import os
import json
import base64
from werkzeug.utils import secure_filename
from functools import wraps
from config import ROBOFLOW_API_URL, ROBOFLOW_API_KEY, CONFIDENCE_THRESHOLD, UPLOAD_FOLDER, SECRET_KEY, ADMIN_PASSWORD

app = Flask(__name__)
app.secret_key = SECRET_KEY

# Absolute path for uploads on disk
UPLOAD_DIR = os.path.join(app.root_path, UPLOAD_FOLDER)

# Admin authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            flash('Please log in to access the admin panel.', 'warning')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function


def match_recipes(available_ingredients: list):
    """Build matched recipe list using available ingredients (case-insensitive)."""
    available_lower = [i.lower() for i in available_ingredients]
    matched_recipes = []
    for recipe in RECIPES:
        recipe_ingredients_lower = [ing.lower() for ing in recipe["ingredients"]]
        matched_ingredients = [det for det in available_lower if det in recipe_ingredients_lower]
        num_matches = len(matched_ingredients)
        total_ingredients = len(recipe["ingredients"])
        match_percent = round((num_matches / total_ingredients) * 100) if total_ingredients > 0 else 0
        recipe_info = {
            "name": recipe["name"],
            "time": recipe["time"],
            "servings": recipe["servings"],
            "difficulty": recipe["difficulty"],
            "image": recipe["image"],
            "instructions": recipe["instructions"],
            "match_percent": match_percent,
            "matched_count": num_matches,
            "total_count": total_ingredients,
            "matched_ingredients": matched_ingredients,
            "needed_ingredients": [ing for ing in recipe["ingredients"] if ing.lower() not in matched_ingredients],
            "all_ingredients": recipe["ingredients"]
        }
        matched_recipes.append(recipe_info)

    matched_recipes = sorted(matched_recipes, key=lambda r: r["match_percent"], reverse=True)
    return matched_recipes

# Load recipes from JSON file
def load_recipes():
    try:
        with open('recipes.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: recipes.json not found. Using empty recipe list.")
        return []
    except json.JSONDecodeError:
        print("Error: recipes.json is not valid JSON. Using empty recipe list.")
        return []

RECIPES = load_recipes()

@app.route('/.well-known/assetlinks.json')
def assetlinks():
    """Serve Digital Asset Links file for Android app verification"""
    import os
    assetlinks_path = os.path.join(app.root_path, '.well-known', 'assetlinks.json')
    with open(assetlinks_path, 'r') as f:
        return f.read(), 200, {'Content-Type': 'application/json'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    try:
        # Ensure upload directory exists (absolute path)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Get image data (either from file upload or camera capture)
        image_data = None
        file_path_disk = None
        filename = 'image.jpg'
        content_type = 'image/jpeg'
        
        if 'image' in request.files:
            # Traditional file upload
            file = request.files['image']
            filename = secure_filename(file.filename) or 'upload.jpg'
            file_path_disk = os.path.join(UPLOAD_DIR, filename)
            file.save(file_path_disk)
            with open(file_path_disk, "rb") as img:
                image_data = img.read()
            # Infer content-type
            ext = os.path.splitext(filename)[1].lower()
            if ext in ['.jpg', '.jpeg']:
                content_type = 'image/jpeg'
            elif ext == '.png':
                content_type = 'image/png'
            elif ext == '.gif':
                content_type = 'image/gif'
            else:
                content_type = 'application/octet-stream'
        else:
            data = request.get_json(silent=True) or {}
            if 'imageData' in data:
                # Camera capture (base64 encoded)
                image_base64 = data['imageData'].split(',')[1]
                image_data = base64.b64decode(image_base64)
                filename = 'captured_frame.jpg'
                content_type = 'image/jpeg'
                file_path_disk = os.path.join(UPLOAD_DIR, filename)
                with open(file_path_disk, 'wb') as f:
                    f.write(image_data)
            else:
                return jsonify({"success": False, "error": "No image provided"}), 400

        # Step 2: Send to Roboflow API
        files = {
            "file": (filename, image_data, content_type)
        }
        try:
            response = requests.post(
                f"{ROBOFLOW_API_URL}?api_key={ROBOFLOW_API_KEY}&confidence=1&overlap=30",
                files=files,
                timeout=30
            )
            if response.status_code != 200:
                return jsonify({
                    "success": False,
                    "error": f"Roboflow API returned status {response.status_code}: {response.text}"
                }), 500
            
            result = response.json()
        except requests.exceptions.RequestException as e:
            return jsonify({
                "success": False,
                "error": f"Failed to connect to Roboflow: {str(e)}"
            }), 500
        except json.JSONDecodeError as e:
            return jsonify({
                "success": False,
                "error": f"Invalid JSON response from Roboflow: {str(e)}"
            }), 500
        
        # Extract ingredients (filter by confidence threshold, keep only highest confidence per class)
        detected_ingredients = []
        raw_detections = []
        bounding_boxes = []
        best_detections = {} 
        
        if "predictions" in result:
            for pred in result["predictions"]:
                confidence = pred.get("confidence", 0)
                ingredient_class = pred.get("class", "").lower()
                
                # Skip detections below threshold
                if confidence <= CONFIDENCE_THRESHOLD:
                    continue
                
                # Keep only the highest confidence detection for each class
                if ingredient_class not in best_detections or confidence > best_detections[ingredient_class]["confidence"]:
                    detection_info = {
                        "class": ingredient_class,
                        "confidence": round(confidence * 100, 1),
                        "raw_confidence": confidence
                    }
                    
                    # Add bounding box coordinates if available
                    if "x" in pred and "y" in pred and "width" in pred and "height" in pred:
                        detection_info["bbox"] = {
                            "x": pred["x"],
                            "y": pred["y"],
                            "width": pred["width"],
                            "height": pred["height"]
                        }
                    
                    best_detections[ingredient_class] = detection_info
            
            # Convert best detections to lists
            for ingredient_class, detection in best_detections.items():
                detected_ingredients.append(ingredient_class)
                raw_detections.append({
                    "class": detection["class"],
                    "confidence": detection["confidence"]
                })
                if "bbox" in detection:
                    bounding_boxes.append({
                        "class": detection["class"],
                        "confidence": detection["confidence"],
                        "x": detection["bbox"]["x"],
                        "y": detection["bbox"]["y"],
                        "width": detection["bbox"]["width"],
                        "height": detection["bbox"]["height"]
                    })

        # Build recipe matches for this image's detections
        matched_recipes = match_recipes(detected_ingredients)

        # Build URL path (relative to static) regardless of disk path
        image_url = f"{UPLOAD_FOLDER}/{filename}".replace('\\', '/') if filename else None

        return jsonify({
            "success": True,
            "image": image_url,
            "raw_detections": raw_detections,
            "detected_ingredients": detected_ingredients,
            "bounding_boxes": bounding_boxes,
            "recipes": matched_recipes,
            "roboflow_response": result  # Include full response for debugging
        })
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("="*50)
        print("ERROR in /detect:")
        print(error_trace)
        print("="*50)
        return jsonify({
            "success": False,
            "error": str(e),
            "trace": error_trace
        }), 500

# New: Recommend endpoint for multi-detect stackable ingredients
@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.get_json(force=True)
        ingredients = data.get('ingredients', []) if isinstance(data, dict) else []
        if not isinstance(ingredients, list):
            return jsonify({"success": False, "error": "'ingredients' must be a list"}), 400
        # Normalize and deduplicate
        cleaned = []
        for ing in ingredients:
            if isinstance(ing, str):
                val = ing.strip().lower()
                if val and val not in cleaned:
                    cleaned.append(val)
        matched = match_recipes(cleaned)
        return jsonify({
            "success": True,
            "ingredients": cleaned,
            "recipes": matched
        })
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500


# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            flash('Successfully logged in!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid password. Please try again.', 'danger')
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('index'))

@app.route('/admin')
@admin_required
def admin_dashboard():
    return render_template('admin_dashboard.html', recipes=RECIPES)

@app.route('/admin/recipe/add', methods=['POST'])
@admin_required
def admin_add_recipe():
    try:
        data = request.get_json()
        # Validate required fields
        required = ['name', 'time', 'servings', 'difficulty', 'image', 'ingredients', 'instructions']
        if not all(field in data for field in required):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        RECIPES.append(data)
        save_recipes()
        return jsonify({"success": True, "message": "Recipe added successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/admin/recipe/edit/<int:index>', methods=['POST'])
@admin_required
def admin_edit_recipe(index):
    try:
        if index < 0 or index >= len(RECIPES):
            return jsonify({"success": False, "error": "Recipe not found"}), 404
        
        data = request.get_json()
        RECIPES[index] = data
        save_recipes()
        return jsonify({"success": True, "message": "Recipe updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/admin/recipe/delete/<int:index>', methods=['DELETE'])
@admin_required
def admin_delete_recipe(index):
    try:
        if index < 0 or index >= len(RECIPES):
            return jsonify({"success": False, "error": "Recipe not found"}), 404
        
        deleted = RECIPES.pop(index)
        save_recipes()
        return jsonify({"success": True, "message": f"Recipe '{deleted['name']}' deleted successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def save_recipes():
    """Save recipes to JSON file"""
    try:
        with open('recipes.json', 'w', encoding='utf-8') as f:
            json.dump(RECIPES, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving recipes: {e}")
        return False


if __name__ == '__main__':
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
