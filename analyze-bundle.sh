#!/bin/bash
echo "=== Performance Optimization Analysis ==="
echo ""

echo "1. Checking for unused imports..."
npx eslint src --ext .ts,.tsx --rule 'no-unused-vars: off' --rule '@typescript-eslint/no-unused-vars: error' --format unix 2>&1 | grep "no-unused-vars" | wc -l

echo ""
echo "2. Finding large files (> 500 lines)..."
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  lines=$(wc -l < "$file")
  if [ $lines -gt 500 ]; then
    echo "  - $file: $lines lines"
  fi
done | head -10

echo ""
echo "3. Checking for duplicate code patterns..."
# Find files with similar names (potential duplicates)
find src -name "*.tsx" | sed 's/\.client\.tsx$//' | sort | uniq -d | head -5

echo ""
echo "4. Analyzing component imports..."
grep -r "^import.*from" src --include="*.tsx" | grep -v "node_modules" | cut -d: -f2 | sort | uniq -c | sort -rn | head -10

echo ""
echo "5. Checking bundle size indicators..."
du -sh .next 2>/dev/null || echo "  No build output found"
