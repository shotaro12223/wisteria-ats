#!/bin/bash
echo "=== Import Optimization ==="
echo ""

# 1. Find unused React imports
echo "1. Checking for unnecessary React imports..."
count=0
for file in $(find src -name "*.tsx" -o -name "*.ts"); do
  # Check if file imports React but doesn't use JSX
  if grep -q "^import React" "$file" && ! grep -q "React\." "$file" && ! grep -q "<" "$file"; then
    echo "  ⚠ $file: Unused React import"
    ((count++))
  fi
done
echo "   Found: $count files"

echo ""
echo "2. Finding duplicate type imports..."
grep -r "import.*type.*from.*@/lib/types" src --include="*.tsx" --include="*.ts" | wc -l

echo ""
echo "3. Checking for barrel export opportunities..."
# Count files importing from same directory
find src -name "index.ts" | wc -l

echo ""
echo "4. Detecting heavy dependencies..."
du -sh node_modules 2>/dev/null | head -1
