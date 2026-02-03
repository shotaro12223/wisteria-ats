#!/bin/bash
echo "=== Page Rendering Test ==="
echo ""

pages=(
  "/"
  "/login"
  "/companies"
  "/analytics"
  "/applicants"
  "/work-queue"
)

for page in "${pages[@]}"; do
  echo -n "Testing $page ... "
  response=$(curl -s "http://localhost:3000$page" 2>&1)
  status=$?
  
  if [ $status -eq 0 ]; then
    if echo "$response" | grep -q "<!DOCTYPE html" || echo "$response" | grep -q "<html"; then
      # Check for common error patterns
      if echo "$response" | grep -qi "error\|exception\|failed"; then
        echo "⚠ Rendered with potential errors"
      else
        echo "✓ Rendered successfully"
      fi
    else
      echo "⚠ No HTML detected"
    fi
  else
    echo "✗ Failed to fetch"
  fi
done
