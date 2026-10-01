# 🎲 Pasha Palli (पासा पल्ली) — Dice-Pit Cross Race

<div align="center">

![Pasha Palli Banner](icons/icon.svg)

### *Native & Indigenous Sports of India • Centurion University of Technology and Management (CUTM)*

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-2ea44f?style=for-the-badge&logo=github)](https://github.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25_Offline-blueviolet?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Android Web Ready](https://img.shields.io/badge/Android-WebView_%26_PWA-3DDC84?style=for-the-badge&logo=android&logoColor=white)](android/)
[![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](preview.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**An authentic, cinematic, responsive web and mobile digital recreation of the ancient Indian cross-and-circle dice race game.**

[🎮 Play Live Demo](#-live-demo--deployment) • [📱 Android Guide](#-android--mobile-web-use) • [📜 Rules of Play](#-rules--mechanics) • [🚀 Quick Start](#-quick-start-local-setup) • [📤 Push to GitHub](#-pushing-to-github--live-deployment)

</div>

---

## 📖 Overview

**Pasha Palli** (also historically related to *Chaupar*, *Pachisi*, and *Chausar*) is an epic cross-and-circle board game deeply embedded in the native and indigenous sports tradition of India. Played across ancient royal courts and village squares alike, this digital edition preserves the strategic depth, symbolic quad-arm board geography, traditional Pasha dice mechanics, and vibrant folklore archetypes in a zero-dependency web experience.

Developed as part of the **Native & Indigenous Sports of India initiative (2025–2026)** by **Devesh Das**, this project combines historical accuracy with modern web technology, responsive mobile ergonomics, and full progressive web app (PWA) offline capabilities.

---

## ✨ Key Features

- **🏛️ Authentic Quad-Arm Board Geometry**:
  - Accurate cruciform board layout with 4 regional arms (North, South, East, West).
  - Central sacred goal: **Char-Koni** (the dice pit sanctuary).
  - Fortified sanctuaries marked with traditional Vedic cross-markers (*Safe Havens*).

- **🤖 Versatile Game Modes**:
  - **Solo Campaign**: 1 Human vs 3 Adaptive AI bots with distinct personalities.
  - **1v1 Duel**: Local Pass & Play for 2 players.
  - **4-Player Melee**: Full 4-player couch multiplayer / Pass & Play.
  - **AI Spectator Mode**: Sit back and watch tactical bots duel in real-time.
  - **Custom Variations**: 2 Humans vs 2 AI, 3 Players, 3 Humans vs 1 AI, and more.

- **👑 Epic Character Archetypes**:
  - Play as legendary personas: *Arjuna (Maharathi)*, *Yudhishthira (Dharmaraja)*, *Duryodhana (Samrat)*, *Shakuni (Pasha Master)*, *Karna (Danveer)*, *Bhima (Gadadhari)*, and *Vikramaditya (Chhatrapati)*.
  - Fully customizable names, titles, house avatars (☀️, 🪷, 🌙, ⚡, 🦁, 🏹, 👑, 🐘, ⚔️), and heraldry.

- **🎲 Traditional Pasha Dice System**:
  - Authentic dice probabilities with double-throw bonus rolls.
  - Tactical choice between split dice values or aggregated token thrusts.
  - Capture mechanic: Strike enemy tokens to banish them back to their home docks.

- **📱 Android & Mobile-First Design**:
  - **PWA Ready**: Works 100% offline via modern Service Worker caching.
  - **Installable**: "Add to Home screen" on Android Chrome/Firefox creates an app indistinguishable from a native APK.
  - **Hardware Accelerated**: 60fps animations and fluid canvas/DOM interactions.
  - **Safe-Area Insets**: Notch, camera cutout, and edge-to-edge mobile navigation bar handling.
  - **Zero Tap Delay**: Optimized with `touch-action: manipulation` for rapid response.

- **🎨 Dual Royal Visual Themes**:
  - **Royal Dark Mode**: Rich midnight velvet, glowing gold inlays, and ambient candlelight.
  - **Vedic Light Mode**: Parchment ivory, antique brass borders, and crisp high-contrast readability.

- **📦 Zero External Dependencies**:
  - Built with pure standards: HTML5, CSS3 Variables, and vanilla modern ES6+ JavaScript. No node build steps or bulky frameworks required!

---

## 📱 Android & Mobile Web Use

Pasha Palli has been engineered from the ground up for seamless operation on **Android phones, tablets, foldables, and Android WebViews**.

### Option A: Install via Chrome on Android (Instant PWA — Recommended)

No app store download or compiling needed:
1. Open the hosted game URL (or your GitHub Pages link) in **Google Chrome** on your Android device.
2. Tap the browser menu (**⋮** three dots in the top-right corner).
3. Select **"Install app"** or **"Add to Home screen"**.
4. Confirm installation. The Pasha Palli icon will appear on your Android home screen and app drawer.
5. Tap the icon to launch in full-screen standalone mode with **zero address bar** and **full offline support**!

### Option B: Native Android Studio WebView App (APK)

A turnkey Android native wrapper is included in the [`android/`](android/) directory:

- [MainActivity.kt](android/MainActivity.kt): Immersive full-screen Kotlin activity with hardware acceleration, back-button handling, and `WebViewAssetLoader`.
- [AndroidManifest.xml](android/AndroidManifest.xml): Manifest configured for orientation safety, hardware acceleration, and permissions.
- [activity_main.xml](android/activity_main.xml): Full-screen WebView layout.
- [android/README.md](android/README.md): Detailed 5-minute setup guide to build an APK in Android Studio or using Capacitor / Bubblewrap.

---

## 📜 Rules & Mechanics

```
                       [ NORTH ARM (Yellow / Senapati) ]
                                    ┌───┐
                                    │   │
                                    │ X │ <-- Safe Haven
                                    │   │
  [ WEST ARM (Green / Samrat) ]  ───┴───┴───  [ EAST ARM (Blue / Yoddha) ]
  ┌───┬───┬───┐              ┌─────────────┐              ┌───┬───┬───┐
  │   │ X │   │  ══════════> │  CHAR-KONI  │ <══════════  │   │ X │   │
  └───┴───┴───┘              │ (Inner Pit) │              └───┴───┴───┘
                             └─────────────┘
  [ SOUTH ARM (Red / Maharathi) ]   │   │
                                    │ X │
                                    └───┘
```

1. **Board Layout**:
   - Four colored teams: **Crimson Red (South)**, **Emerald Green (West)**, **Golden Yellow (North)**, and **Sapphire Blue (East)**.
   - Each team possesses **4 Pawns** initialized in their respective base docks.

2. **The Roll & Entry**:
   - On their turn, the active player casts the Pasha dice.
   - Rolling qualifying numbers unlocks pawns from the dock into the active outer track.
   - Rolling **doubles** awards an immediate bonus throw!

3. **Movement & Safe Havens (Charkoni / X-Squares)**:
   - Tokens travel along the outer track in a prescribed perimeter circuit before turning into their home column.
   - Squares bearing the royal cross marker (**X**) are **Safe Havens**. Pawns on these squares are protected from capture. Multiple friendly or neutral pawns may peacefully co-exist here.

4. **Combat & Captures**:
   - Landing on an unprotected enemy pawn knocks it off the board, sending it back to its starting dock.
   - Capturing an enemy pawn awards an additional strategic turn.

5. **Victory Condition**:
   - After completing the circuit, pawns ascend their colored home straight into the central sanctuary (**Char-Koni**).
   - The first player to successfully guide all 4 pawns into the Char-Koni is crowned **Supreme Chakravartin (Winner)**!

---

## 🚀 Quick Start (Local Setup)

Because Pasha Palli uses vanilla web standards, you can run it immediately without any build steps or package installations.

### Method 1: Python Built-in Server
Open your terminal in the project directory and run:
```bash
python -m http.server 8000
```
Open your browser at `http://localhost:8000`.

### Method 2: VS Code Live Server
1. Open this folder in Visual Studio Code.
2. Install the **Live Server** extension (`ritwickdey.LiveServer`).
3. Right-click `index.html` and click **"Open with Live Server"**.

### Method 3: Node.js `npx serve`
```bash
npx serve .
```

### Method 4: Direct Browser Launch
Simply double-click `index.html` in your file explorer to open it directly in Chrome, Firefox, Edge, or Safari.

---

## 📤 Pushing to GitHub & Live Deployment

Follow these exact steps to push this project to a new GitHub repository and have it live on the web in seconds:

### Step 1: Initialize Git & Commit Files
Open PowerShell or your terminal in this directory:

```bash
# 1. Initialize local repository
git init

# 2. Add all project files
git add .

# 3. Create your first commit
git commit -m "Initial release: Pasha Palli board game and Android PWA"
```

### Step 2: Link to Your GitHub Repository
1. Go to [GitHub.com/new](https://github.com/new) and create a new repository (e.g., `pasha-palli-game`). Leave it empty (do not initialize with a README or .gitignore since we already have them).
2. Run the following commands in your terminal (replace `<your-username>` with your GitHub username):

```bash
# 4. Set default branch to main
git branch -M main

# 5. Connect your remote repository
git remote add origin https://github.com/<your-username>/pasha-palli-game.git

# 6. Push code to GitHub
git push -u origin main
```

### Step 3: Enable Free 1-Click Hosting on GitHub Pages
This project includes a pre-configured GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

1. On GitHub, navigate to your repository's **Settings** tab.
2. In the left sidebar, click on **Pages**.
3. Under **Build and deployment** ➔ **Source**, select **GitHub Actions**.
4. GitHub Actions will automatically run the deploy workflow. Within 60 seconds, your game will be live at:
   ```
   https://<your-username>.github.io/pasha-palli-game/
   ```

---

## 📁 Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD deployment
├── android/                    # Android Native integration resources
│   ├── MainActivity.kt         # Immersive full-screen Android WebView host
│   ├── AndroidManifest.xml     # Android application configuration & permissions
│   ├── activity_main.xml       # Fullscreen WebView layout
│   └── README.md               # Step-by-step Android Studio & APK build guide
├── icons/                      # High-res PWA & app icons
│   ├── icon.svg                # Scalable vector insignia
│   ├── icon-192.png            # Android PWA home-screen icon (192x192)
│   ├── icon-512.png            # High-resolution Android icon (512x512)
│   ├── icon-maskable.png       # Android adaptive / maskable icon
│   └── favicon.png             # Browser tab favicon
├── index.html                  # Main application entry point & DOM markup
├── style.css                   # Custom responsive CSS design system & themes
├── preview.js                  # Game logic, state machine, AI, and dice engine
├── manifest.json               # Web App Manifest for Android PWA installation
├── sw.js                       # Service Worker for offline play & asset caching
├── .gitignore                  # Git ignore rules for Web, Android, and OS files
├── .gitattributes              # Git line endings (LF) & binary definitions
├── LICENSE                     # MIT Open Source License
└── README.md                   # Project documentation & reference manual
```

---

## 🛠️ Technical Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Markup** | HTML5 Semantic Elements | Accessible screen layout, modals, HUD, and SVG board rendering |
| **Styling** | Vanilla CSS3 + Modern Tokens | Glassmorphism, CSS Grid/Flexbox, radial gradients, safe-area insets |
| **Logic** | Vanilla JavaScript (ES6+) | State machine (FSM), dice probability engine, pathfinding & bot AI |
| **PWA** | Web App Manifest + Service Worker | Offline caching, standalone Android install, homescreen badging |
| **Android** | Android WebView + AssetLoader | Hardware-accelerated native shell for Google Play Store packaging |
| **Deployment** | GitHub Actions | Continuous deployment to GitHub Pages upon push to `main` |

---

## 👥 Authors & Academic Attribution

- **Creator & Lead Developer**: **Devesh Das**
- **Academic Context**: *Native & Indigenous Sports of India (2025–2026)*
- **Institution**: Centurion University of Technology and Management (CUTM)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, distribute, and study for educational, cultural, and recreational purposes.

<div align="center">

*Preserving and celebrating India's rich indigenous sports heritage through modern interactive technology.*

**[⬆ Back to Top](#-pasha-palli-पासा-पल्ली--dice-pit-cross-race)**

</div>
