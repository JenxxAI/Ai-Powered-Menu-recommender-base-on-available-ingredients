# AI Recipe Assistant - Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Render (Recommended - Free & Easy)

**Step 1: Prepare Your Code**
1. Make sure all files are in your project folder
2. Your project already has `requirements.txt`, `render.yaml`, and `Procfile`

**Step 2: Deploy to Render**
1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub account (or upload files directly)
4. If using GitHub:
   - Push your code to a GitHub repository
   - Select the repository in Render
5. If uploading directly:
   - Choose "Deploy from a Git repository" → "Public Git repository"
   - Or use "Deploy an existing repository"

**Step 3: Configure Service**
- **Name**: ai-recipe-assistant (or your choice)
- **Environment**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python app.py`
- **Plan**: Free

**Step 4: Add Environment Variables**
1. In Render dashboard, go to "Environment"
2. Add these variables:
   - `ROBOFLOW_API_KEY` = (your Roboflow API key from config.py)
   - `PORT` = 10000 (Render's default, optional)

**Step 5: Deploy!**
- Click "Create Web Service"
- Wait 2-5 minutes for deployment
- Your app URL: `https://ai-recipe-assistant.onrender.com` (or similar)

---

### Option 2: Heroku

**Step 1: Install Heroku CLI**
Download from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)

**Step 2: Deploy via CLI**
```powershell
# Login to Heroku
heroku login

# Navigate to your project
cd c:\JasDocuments\Pyapp

# Create Heroku app
heroku create ai-recipe-assistant

# Set environment variables
heroku config:set ROBOFLOW_API_KEY=your_api_key_here

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Deploy to Heroku
git push heroku main
# (or git push heroku master if your branch is named master)

# Open your app
heroku open
```

**Your app URL**: `https://ai-recipe-assistant.herokuapp.com`

---

### Option 3: PythonAnywhere (Free Tier)

**Step 1: Sign Up**
1. Go to [pythonanywhere.com](https://www.pythonanywhere.com)
2. Create free account

**Step 2: Upload Code**
1. Go to "Files" tab
2. Upload all your project files
3. Or use "Open Bash console" and clone from GitHub

**Step 3: Create Web App**
1. Go to "Web" tab → "Add a new web app"
2. Choose "Flask" framework
3. Python version: 3.10 or later
4. Set paths:
   - **Source code**: `/home/yourusername/Pyapp`
   - **Working directory**: `/home/yourusername/Pyapp`

**Step 4: Configure WSGI**
1. Click on WSGI configuration file link
2. Replace contents with:
```python
import sys
import os

project_home = '/home/yourusername/Pyapp'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

from app import app as application
```

**Step 5: Install Dependencies**
1. Open Bash console
2. Run:
```bash
cd Pyapp
pip install -r requirements.txt --user
```

**Step 6: Reload & Test**
- Click "Reload" button on Web tab
- Your app URL: `https://yourusername.pythonanywhere.com`

---

## 📱 Testing PWA Installation

### On Android (Chrome)
1. Open your deployed URL in Chrome
2. Look for "Install App" button in navbar (top right)
3. Click it or tap menu (⋮) → "Install app" / "Add to Home Screen"
4. App icon appears on home screen
5. Opens in full screen like native app

### On iOS (Safari)
1. Open your deployed URL in Safari
2. Tap Share button (⬆️)
3. Scroll and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. App icon appears on home screen

### On Desktop (Chrome/Edge)
1. Open your deployed URL
2. Click "Install App" button in navbar
3. Or click install icon (⊕) in address bar
4. App opens in standalone window

---

## 🔧 Environment Variables Needed

Make sure to set these on your hosting platform:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `ROBOFLOW_API_KEY` | Your API key | config.py file |
| `PORT` | (auto-set by host) | Not needed manually |

---

## ✅ Verify Deployment

After deployment, test these features:
- [ ] Upload/camera detection works
- [ ] Recommendations show correctly
- [ ] PWA install button appears
- [ ] Install app on mobile device
- [ ] Offline mode works (after first load)

---

## 🐛 Troubleshooting

**Problem**: Service worker not registering
- **Solution**: Make sure your app is served over HTTPS (all hosting platforms provide this)

**Problem**: Install button doesn't appear
- **Solution**: This is normal if:
  - App is already installed
  - Browser doesn't support PWA (use Chrome/Edge/Safari)
  - Viewing on localhost (use deployed URL)

**Problem**: Uploads fail on hosting
- **Solution**: Check that `static/uploads/` folder exists (it's created by `.gitkeep` file)

**Problem**: Import errors on Heroku/Render
- **Solution**: Make sure `requirements.txt` lists all dependencies

---

## 📝 Notes

- **Free tier limits**: Render/Heroku may sleep after inactivity, first request takes ~10-30 seconds
- **Storage**: Uploaded images are temporary on free tiers (cleared periodically)
- **HTTPS**: Required for PWA features - all hosting platforms provide free SSL
- **API costs**: Watch your Roboflow API usage limits

---

## 🎉 Success!

Once deployed, share your app URL with anyone. They can:
- Use it in browser instantly
- Install it as a mobile/desktop app
- Use it offline (after first visit)

**Your Recipe Assistant is now live!** 🍳
