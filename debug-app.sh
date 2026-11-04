#!/bin/bash
# Debug script for XTEwallet app issues

echo "XTEwallet Debug Tool"
echo "===================="
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "Error: adb not found. Please install Android SDK Platform Tools."
    echo ""
    echo "On macOS with Homebrew:"
    echo "  brew install android-platform-tools"
    exit 1
fi

# Check device connection
echo "Checking connected devices..."
adb devices -l

echo ""
echo "To view live crash logs, run:"
echo "  adb logcat | grep -E '(AndroidRuntime|XTE|traaitt|io.traaitt)'"
echo ""
echo "To clear app data and try again:"
echo "  adb shell pm clear io.traaitt.cash"
echo ""
echo "To uninstall and reinstall:"
echo "  adb uninstall io.traaitt.cash"
echo "  adb install dist/XTEwallet-v1.020.0-signed.apk"
echo ""
echo "To check if app is installed:"
echo "  adb shell pm list packages | grep traaitt"
echo ""
echo "To get detailed package info:"
echo "  adb shell dumpsys package io.traaitt.cash | grep -A 5 'versionCode\|versionName'"
