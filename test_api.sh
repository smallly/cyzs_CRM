#!/bin/bash
set -e
API="http://localhost:8080"

echo "=== 1. Login ==="
RES=$(curl -s -X POST -H "Content-Type: application/json" -d '{"phone":"13800000000","password":"admin123"}' "$API/api/auth/login")
echo "$RES" | head -c 200
echo ""
TOKEN=$(echo "$RES" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "=== 2. Followups without token ==="
curl -s "$API/api/followups" | head -c 200
echo ""

echo ""
echo "=== 3. Followups with invalid token ==="
curl -s -H "Authorization: Bearer invalid" "$API/api/followups" | head -c 200
echo ""

echo ""
echo "=== 4. Followups with valid token ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/followups" | head -c 300
echo ""
