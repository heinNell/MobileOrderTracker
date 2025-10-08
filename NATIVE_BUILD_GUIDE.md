# 📦 Mobile Order Tracker - Native Build Guide

## 🏗️ Building Native APK/IPA Files

### Prerequisites

```bash
# Install EAS CLI globally
npm install -g @expo/eas-cli

# Login to Expo account
eas login
```

### 🤖 Android APK Build

```bash
cd /workspaces/MobileOrderTracker/mobile-app

# Build production APK
eas build --platform android --profile production

# Build preview APK (for testing)
eas build --platform android --profile preview

# Build development client (for testing with Expo Dev Tools)
eas build --platform android --profile development
```

### 🍎 iOS IPA Build

```bash
cd /workspaces/MobileOrderTracker/mobile-app

# Build production IPA (requires Apple Developer account)
eas build --platform ios --profile production

# Build preview IPA
eas build --platform ios --profile preview

# Build development client
eas build --platform ios --profile development
```

### 📱 Quick APK Build (Recommended for Testing)

```bash
# Create APK file for direct installation
eas build --platform android --profile preview --local
```

## 🔧 Build Configuration

### Current EAS Configuration (`eas.json`):

- **Development**: Creates development client with hot reload
- **Preview**: Creates installable app for testing
- **Production**: Creates optimized app for store distribution

### Build Outputs:

- **Android**: `.apk` or `.aab` files
- **iOS**: `.ipa` files
- **Download Links**: Provided via Expo dashboard

## 📥 Installation Methods

### Android APK:

1. Download APK from build link
2. Enable "Unknown Sources" on Android device
3. Install APK directly

### iOS IPA:

1. Requires Apple Developer account for device installation
2. Use TestFlight for distribution
3. Or install via Xcode for development

## 🚀 Quick Start Commands

```bash
# Quick development build
eas build --platform android --profile development

# Production-ready build
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile preview
```

## 📊 Build Status Monitoring

- Check build progress at: https://expo.dev/
- Builds typically take 10-15 minutes
- Download links provided via email and dashboard

## 🔧 Local Development

```bash
# Start development server for QR scanning
cd /workspaces/MobileOrderTracker/mobile-app
npm start

# This will show:
# - QR code for Expo Go app
# - Web URL: http://localhost:8082
# - Platform options: Android/iOS/Web
```

## 📱 Testing on Device

1. **Install Expo Go** from App Store/Google Play
2. **Scan QR code** from terminal
3. **Test all features** including QR scanner and GPS
4. **Build native app** when ready for production
