#!/bin/bash
# Script to manually test CI workflow steps locally

set -e

echo "🧪 Testing CI Workflow Steps Locally"
echo "======================================"
echo ""

echo "📦 Step 1: Installing dependencies..."
npm ci
echo "✅ Dependencies installed"
echo ""

echo "🔍 Step 2: Type checking..."
npm run typecheck
echo "✅ Type check passed"
echo ""

echo "🔨 Step 3: Building..."
npm run build
echo "✅ Build successful"
echo ""

echo "🧪 Step 4: Running tests..."
npm test
echo "✅ Tests passed"
echo ""

echo "📁 Step 5: Verifying build output..."
if [ ! -d "lib" ]; then
  echo "❌ lib directory not found"
  exit 1
fi

if [ ! -f "lib/index.js" ]; then
  echo "❌ lib/index.js not found"
  exit 1
fi

if [ ! -f "lib/commands/init.js" ]; then
  echo "❌ lib/commands/init.js not found"
  exit 1
fi

echo "✅ Build output verified"
echo ""

echo "🎉 All CI steps passed successfully!"

