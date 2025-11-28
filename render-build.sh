#!/usr/bin/env bash
# Render build script for automatic deployment
# This script is executed by Render during the build phase

set -e

echo "🔨 Building TaskFlow Backend and Frontend..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Build backend
echo "🏗️  Building backend..."
cd backend
npm install
npm run build
cd ..

# Build frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build complete! Ready for deployment."
