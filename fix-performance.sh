#!/bin/bash

echo "======================================"
echo "Foodily Auth App - Performance Fix"
echo "======================================"
echo ""

echo "Step 1: Checking current repository size..."
du -sh .git
echo ""

echo "Step 2: Adding new configuration files..."
git add .gitignore .gitattributes server/.gitignore server/uploads/.gitkeep
git add client/src/styles/ProductDetails.css
git add client/src/pages/ProductDetails.jsx
git add PERFORMANCE_OPTIMIZATION_GUIDE.md QUICK_FIX_STEPS.md fix-performance.sh fix-performance.bat
echo "Configuration files staged."
echo ""

echo "Step 3: Committing optimization changes..."
git commit -m "feat: Performance optimization - extract styles, update .gitignore"
echo ""

echo "Step 4: Removing previously tracked files from Git..."
echo "(Files will remain on your computer, just not tracked in Git)"
git rm -r --cached client/dist 2>/dev/null || true
git rm -r --cached server/uploads/*.jpg 2>/dev/null || true
git rm -r --cached server/uploads/*.jpeg 2>/dev/null || true
git rm -r --cached server/uploads/*.png 2>/dev/null || true
git rm -r --cached node_modules 2>/dev/null || true
git rm -r --cached client/node_modules 2>/dev/null || true
git rm -r --cached server/node_modules 2>/dev/null || true
git rm -r --cached realtime-tracking/node_modules 2>/dev/null || true
git rm -r --cached selenium-tests/venv 2>/dev/null || true
echo ""

echo "Step 5: Committing cleanup..."
git commit -m "chore: Remove build artifacts and large files from Git tracking"
echo ""

echo "======================================"
echo "Optimization Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Review changes with: git log -2"
echo "2. Push to remote: git push origin main"
echo "3. Check new size with: du -sh .git"
echo ""
echo "For advanced cleanup, see PERFORMANCE_OPTIMIZATION_GUIDE.md"
echo ""



