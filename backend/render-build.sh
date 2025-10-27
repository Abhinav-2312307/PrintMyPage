#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Updating apt and installing dependencies for Chrome..."
apt-get update && apt-get install -y \
    wget gnupg libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxkbcommon0 libxrandr2 libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
echo "Dependencies installed."

# Install project dependencies first
echo "Running npm install..."
npm install
echo "npm install complete."

# Explicitly install a known Chrome revision AFTER npm install
# This downloads Chrome to the cache directory defined by PUPPETEER_CACHE_DIR or default
echo "Explicitly installing Puppeteer Chrome browser..."
npx puppeteer browsers install chrome
echo "Puppeteer Chrome browser installed."

echo "Build script finished."