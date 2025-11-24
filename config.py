import os

# Roboflow API Configuration
ROBOFLOW_API_URL = "https://detect.roboflow.com/app-jqdgo/13"
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "azvtlf6ccogUJKtpM2m9")

# Detection Configuration
CONFIDENCE_THRESHOLD = 0.5
# Flask Configuration
UPLOAD_FOLDER = 'static/uploads'
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-to-a-random-secret-key-in-production")

# Admin Configuration
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")