#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Updating apt and installing dependencies for Chrome..."
# Install dependencies needed by Puppeteer/Chrome
apt-get update && apt-get install -y \
    wget \
    gnupg \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxkbcommon0 libxrandr2 libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
echo "Dependencies installed."

# Install project dependencies (Puppeteer will download its browser here)
echo "Running npm install..."
npm install
echo "npm install complete."

echo "Build script finished."