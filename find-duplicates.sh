#!/bin/bash
echo "=== Code Duplication Analysis ==="
echo ""

echo "1. Finding duplicate utility functions..."
# Search for common function patterns
patterns=("function formatDate" "function formatDateTime" "function safeParse" "function cls")

for pattern in "${patterns[@]}"; do
  count=$(grep -r "$pattern" src --include="*.ts" --include="*.tsx" | wc -l)
  if [ $count -gt 1 ]; then
    echo "  - '$pattern': $count occurrences"
    grep -r "$pattern" src --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq | sed 's/^/    /'
  fi
done

echo ""
echo "2. Finding duplicate type definitions..."
grep -r "type.*=.*{" src --include="*.ts" --include="*.tsx" | grep -E "(Company|Job|Applicant)" | cut -d: -f1 | sort | uniq -c | sort -rn | head -5

echo ""
echo "3. Checking for duplicate API call patterns..."
grep -r "fetch.*api" src --include="*.tsx" | wc -l

