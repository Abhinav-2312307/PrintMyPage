#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Puppeteer dependencies
npm install
npx puppeteer browsers install chrome # Explicitly install Chrome

echo "Build complete."