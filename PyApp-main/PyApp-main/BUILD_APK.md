# Building an APK from Your Web App

Your Flask app can be packaged as an Android APK using several methods. Here are the recommended approaches:

## ✅ Used: PWA Builder (Completed)

**App URL**: https://pyapp-vilo.onrender.com/  
**Status**: APK generated successfully using PWA Builder

### Steps Used:
1. Visited https://www.pwabuilder.com/
2. Entered app URL: `https://pyapp-vilo.onrender.com/`
3. Clicked "Start" to analyze the app
4. Selected "Package For Stores" → "Android"
5. Configured package ID: `com.justjas.recipeai`
6. Downloaded APK/AAB file
7. Ready to install on Android devices

**Benefits**: Proper camera permissions, better performance, professional quality

---

## Option 1: PWA Builder (Easiest - No Coding Required)

1. **Deploy your app** to a public HTTPS URL (Render, Heroku, etc.)
   - Your app MUST be accessible via HTTPS
   - Example: `https://your-app.onrender.com`

2. **Go to PWA Builder**: https://www.pwabuilder.com/

3. **Enter your app URL** and click "Start"

4. **Click "Package for Stores"** and select Android

5. **Configure options**:
   - Package ID: `com.yourname.recipeai`
   - App name: `AI Recipe Assistant`
   - Choose "Signed" for Google Play Store or "Unsigned" for testing

6. **Download the APK** or Android App Bundle (.aab)

7. **Install on Android**:
   - Transfer APK to your phone
   - Enable "Install from Unknown Sources" in Settings
   - Open the APK file to install

---

## Option 2: Using Bubblewrap CLI (More Control)

### Prerequisites
- Node.js installed
- Your app deployed with HTTPS
- Android SDK (optional, for signing)

### Steps

1. **Install Bubblewrap**:
```bash
npm install -g @bubblewrap/cli
```

2. **Initialize your TWA project**:
```bash
bubblewrap init --manifest https://your-app.onrender.com/static/manifest.json
```

3. **Answer the prompts**:
   - Application package name: `com.yourname.recipeai`
   - Display mode: `standalone`
   - Signing key: Generate new or use existing

4. **Build the APK**:
```bash
bubblewrap build
```

5. **Find your APK** in `./app-release-signed.apk`

---

## Option 3: Android Studio + WebView (Full Native App)

For complete control, create a native Android app with WebView:

1. Install Android Studio
2. Create new project
3. Add WebView that loads your app URL
4. Configure permissions in AndroidManifest.xml
5. Build APK from Android Studio

---

## Important: Your App Must Be Deployed

Your Flask app needs to be publicly accessible via HTTPS:

1. **Deploy to Render** (recommended):
   - Already configured with `render.yaml`
   - Push to GitHub
   - Connect GitHub repo to Render
   - Get your HTTPS URL

2. **Update manifest.json** with your production URL:
   - Edit `/static/manifest.json`
   - Update `start_url` and `scope` to your deployed URL

3. **Test PWA features**:
   - Visit your HTTPS URL
   - Check service worker is registered
   - Verify manifest.json loads correctly

---

## Quick Test: Generate APK Now

**Using PWA Builder (5 minutes)**:

1. Deploy your app to Render (if not already deployed)
2. Visit: https://www.pwabuilder.com/
3. Enter your deployed URL
4. Click "Package" → "Android" → "Download"
5. Transfer APK to phone and install

**Note**: The APK will simply wrap your web app - it loads your website inside a native Android container, making it work offline and feel like a native app.

---

## Recommended Approach for Your App

Since you have `render.yaml` configured, I recommend:

1. **Deploy to Render** → Get HTTPS URL
2. **Use PWA Builder** → Generate APK instantly
3. **Distribute APK** → Share with users or upload to Google Play Store

This gives you a real Android app without any Java/Kotlin coding!
