#!/bin/bash
echo "=== API Endpoints Test ==="
echo ""

# Test endpoints (without auth, expecting 401 or proper error)
endpoints=(
  "/api/me"
  "/api/home/metrics"
  "/api/companies"
  "/api/jobs"
  "/api/applicants"
  "/api/gmail/inbox"
  "/api/work-queue/items"
  "/api/chat/rooms"
)

for endpoint in "${endpoints[@]}"; do
  echo -n "Testing $endpoint ... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint" 2>&1)
  if [ $? -eq 0 ]; then
    if [ "$status" = "401" ] || [ "$status" = "200" ]; then
      echo "✓ OK ($status)"
    else
      echo "⚠ Status: $status"
    fi
  else
    echo "✗ Failed to connect"
  fi
done
