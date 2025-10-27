#!/usr/bin/env bash
# exit on error
set -o errexit

# Add a step to update package lists and install dependencies
apt-get update && apt-get install -y \
    wget \
    gnupg \
    # Common Chrome dependencies:
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install project dependencies
npm install

# Explicitly install Chrome using Puppeteer's tool
# This ensures we get a compatible version
npx puppeteer browsers install chrome

echo "Build complete. Dependencies and Chrome installed."