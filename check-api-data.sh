#!/bin/bash
echo "=== API Data Response Check ==="
echo ""

# Test data-returning endpoints
echo "1. Home Metrics API:"
response=$(curl -s http://localhost:3000/api/home/metrics)
if echo "$response" | jq . > /dev/null 2>&1; then
  ok=$(echo "$response" | jq -r '.ok // "undefined"')
  error=$(echo "$response" | jq -r '.error.message // "none"' 2>/dev/null)
  echo "   - ok: $ok"
  echo "   - error: $error"
else
  echo "   ✗ Invalid JSON response"
fi
echo ""

echo "2. Companies API:"
response=$(curl -s http://localhost:3000/api/companies)
if echo "$response" | jq . > /dev/null 2>&1; then
  ok=$(echo "$response" | jq -r '.ok // "undefined"')
  count=$(echo "$response" | jq -r '.companies | length // 0' 2>/dev/null)
  echo "   - ok: $ok"
  echo "   - companies count: $count"
else
  echo "   ✗ Invalid JSON response"
fi
echo ""

echo "3. Jobs API:"
response=$(curl -s http://localhost:3000/api/jobs)
if echo "$response" | jq . > /dev/null 2>&1; then
  ok=$(echo "$response" | jq -r '.ok // "undefined"')
  count=$(echo "$response" | jq -r '.jobs | length // 0' 2>/dev/null)
  echo "   - ok: $ok"
  echo "   - jobs count: $count"
else
  echo "   ✗ Invalid JSON response"
fi
