# 📱 Pasha Palli — Android Deployment & Integration Guide

This directory provides everything you need to package and run **Pasha Palli** as an Android application.

You have three streamlined ways to use Pasha Palli on Android:

---

## ⚡ Option 1: Instant PWA Install (No Code / Recommended)

Since Pasha Palli includes a pre-configured Web App Manifest (`manifest.json`) and Service Worker (`sw.js`):

1. Host the project (or open your GitHub Pages URL) in **Google Chrome** or **Firefox** on your Android device.
2. Tap the browser menu (**⋮** three dots in top-right).
3. Select **"Install app"** or **"Add to Home screen"**.
4. The game will install as a standalone, fullscreen Android app with its own app icon and complete offline support!

---

## 🚀 Option 2: Native Android Studio WebView APK

Use the ready-to-run files provided in this `/android` folder:

### Prerequisites
- [Android Studio Iguana / Jellyfish / Ladybug or newer](https://developer.android.com/studio)
- Android SDK (API 24 to 35+)

### Step-by-Step Instructions:

1. **Create a New Project in Android Studio**:
   - Template: **Empty Views Activity** (or **Empty Activity**)
   - Language: **Kotlin**
   - Minimum SDK: **API 24 (Android 7.0)** or higher
   - Package Name: `com.pashapalli.game`

2. **Add Dependencies in `app/build.gradle.kts`**:
   ```kotlin
   dependencies {
       implementation("androidx.core:core-ktx:1.13.1")
       implementation("androidx.appcompat:appcompat:1.7.0")
       implementation("androidx.webkit:webkit:1.11.0")
       implementation("androidx.activity:activity-ktx:1.9.0")
   }
   ```

3. **Copy Assets**:
   - In your Android Studio project, right-click on `app/src/main/` ➔ **New** ➔ **Folder** ➔ **Assets Folder**.
   - Copy the web game files into `app/src/main/assets/`:
     - `index.html`
     - `style.css`
     - `preview.js`
     - `manifest.json`
     - `sw.js`
     - `icons/` folder

4. **Replace Project Files**:
   - Replace `app/src/main/java/com/pashapalli/game/MainActivity.kt` with [MainActivity.kt](file:///android/MainActivity.kt)
   - Replace `app/src/main/res/layout/activity_main.xml` with [activity_main.xml](file:///android/activity_main.xml)
   - Add permissions and activity config from [AndroidManifest.xml](file:///android/AndroidManifest.xml)

5. **Run & Build APK**:
   - Click **Run** (green triangle) to launch on an Android phone or emulator.
   - Go to **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)** to generate a distributable `.apk`.

---

## 🛠️ Option 3: Capacitor (1-Command Cross-Platform APK)

If you prefer Node.js / CLI:

```bash
# 1. Initialize Capacitor
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor config
npx cap init "Pasha Palli" "com.pashapalli.game" --web-dir .

# 3. Add Android platform
npx cap add android

# 4. Open in Android Studio
npx cap open android
```

---

## 📦 Option 4: Google Bubblewrap (Trusted Web Activity - TWA)

Google's official tool to convert any live PWA into a Play Store APK:

```bash
# Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# Initialize project from your GitHub Pages URL
bubblewrap init --manifest="https://<your-username>.github.io/<repo-name>/manifest.json"

# Build Android APK / AAB
bubblewrap build
```

---

### Features Enabled for Android in this Build:
- **Hardware Acceleration**: Smooth animations & 60fps dice rolls.
- **Edge-to-edge / Immersive Sticky Mode**: Fullscreen without distracting status bar.
- **Safe Area Insets**: Notch and camera punch-hole padding (`viewport-fit=cover`).
- **Touch Action Manipulation**: Eliminates the 300ms mobile tap delay and prevents unwanted double-tap zooming.
- **Local Asset Isolation**: Uses secure `WebViewAssetLoader` to prevent CORS issues with local files.
