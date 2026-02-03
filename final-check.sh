#!/bin/bash
echo "=== Final API Functionality Check ==="
echo ""

# Check multiple endpoints
endpoints=(
  "/api/companies:companies"
  "/api/jobs:jobs"
  "/api/applicants:applicants"
  "/api/work-queue/analytics:data"
)

for endpoint_data in "${endpoints[@]}"; do
  IFS=':' read -r endpoint key <<< "$endpoint_data"
  echo -n "Testing $endpoint ... "
  
  response=$(curl -s "http://localhost:3000$endpoint")
  
  # Check if response contains the key and "ok":true
  if echo "$response" | grep -q '"ok":true'; then
    if [ -n "$key" ] && echo "$response" | grep -q "\"$key\""; then
      echo "✓ Data returned successfully"
    elif echo "$response" | grep -q '"ok":true'; then
      echo "✓ OK response"
    fi
  elif echo "$response" | grep -q '"ok":false'; then
    error=$(echo "$response" | grep -o '"message":"[^"]*"' | head -1)
    echo "⚠ Error response: $error"
  else
    echo "⚠ Unexpected response format"
  fi
done

echo ""
echo "=== Gmail Integration Check ==="
curl -s http://localhost:3000/api/gmail/inbox | grep -q '"ok":true' && echo "✓ Gmail API responding" || echo "⚠ Gmail API issue"

