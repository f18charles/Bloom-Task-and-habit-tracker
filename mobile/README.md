# Bloom Native Android Application (React Native)

This directory contains the standalone **React Native Android codebase** for Bloom. It connects directly to your Bloom backend API (`/api/*`) for user authentication, tasks, habits, and Google Calendar syncing.

---

## 🚀 Building a Real Native Android APK (`.apk`)

You can compile this codebase into a signed Android APK using **Expo Application Services (EAS)** or **React Native CLI**:

### Option 1: EAS Build (Recommended & Easiest)
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Run the Android APK build command:
   ```bash
   cd mobile
   eas build -p android --profile preview
   ```
4. EAS will compile the native Android package in the cloud and provide a direct link to download the compiled `.apk` file ready to install on any Android phone!

---

### Option 2: Local Android Studio Build
1. Generate native Android project files:
   ```bash
   cd mobile
   npx expo prebuild --platform android
   ```
2. Build release APK locally:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. Your compiled Android APK will be generated at:
   `android/app/build/outputs/apk/release/app-release.apk`
