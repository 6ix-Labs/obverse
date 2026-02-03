#!/bin/bash

# Dashboard API Test Script (curl version)
#
# Usage: ./test-dashboard.sh <identifier> <password>
# Example: ./test-dashboard.sh @johndoe P4ssw0rd1234

# Configuration
API_URL="${API_URL:-http://localhost:3000}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
  echo -e "${YELLOW}"
  echo "⚠️  Usage: $0 <identifier> <password>"
  echo ""
  echo "Steps to get credentials:"
  echo "  1. Open Telegram bot"
  echo "  2. Send /dashboard command"
  echo "  3. Select a payment link"
  echo "  4. Copy the identifier and password"
  echo "  5. Run: $0 <identifier> <password>"
  echo ""
  echo "Example:"
  echo "  $0 @johndoe P4ssw0rd1234"
  echo -e "${NC}"
  exit 1
fi

IDENTIFIER="$1"
PASSWORD="$2"

echo -e "${CYAN}"
echo "🧪 Dashboard API Test Suite (curl)"
echo "🔗 Testing API at: $API_URL"
echo -e "${NC}"

echo -e "${BLUE}"
echo "📝 Test Credentials:"
echo "  Identifier: $IDENTIFIER"
echo "  Password: ${PASSWORD//?/*}"
echo -e "${NC}"

# Test 1: Login
echo ""
echo "============================================================"
echo -e "${CYAN}TEST 1: POST /auth/login${NC}"
echo "============================================================"
echo ""

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Dashboard-Test-Script/1.0" \
  -d "{\"identifier\":\"$IDENTIFIER\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo -e "${BLUE}Status: $HTTP_CODE${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

  # Extract JWT token
  TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.access_token' 2>/dev/null)

  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ JWT token received${NC}"
  else
    echo -e "${RED}✗ No access_token in response${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Login failed${NC}"
  echo -e "${RED}Status: $HTTP_CODE${NC}"
  echo "Error:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  exit 1
fi

# Test 2: Dashboard Overview
echo ""
echo "============================================================"
echo -e "${CYAN}TEST 2: GET /dashboard/overview${NC}"
echo "============================================================"
echo ""

OVERVIEW_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$API_URL/dashboard/overview" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$OVERVIEW_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$OVERVIEW_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Dashboard overview fetched${NC}"
  echo -e "${BLUE}Status: $HTTP_CODE${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

  # Display key metrics if available
  if echo "$RESPONSE_BODY" | jq -e '.stats' > /dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}📊 Key Metrics:${NC}"
    echo "$RESPONSE_BODY" | jq -r '.stats | "  Total Payments: \(.totalPayments)\n  Pending: \(.pendingPayments)\n  Confirmed: \(.confirmedPayments)\n  Failed: \(.failedPayments)\n  Total Amount: \(.totalAmount) \(.currency // "")"'
  fi
else
  echo -e "${RED}✗ Failed to fetch overview${NC}"
  echo -e "${RED}Status: $HTTP_CODE${NC}"
  echo "Error:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

# Test 3: Dashboard Payments
echo ""
echo "============================================================"
echo -e "${CYAN}TEST 3: GET /dashboard/payments?limit=10&skip=0${NC}"
echo "============================================================"
echo ""

PAYMENTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$API_URL/dashboard/payments?limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$PAYMENTS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PAYMENTS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Payments fetched${NC}"
  echo -e "${BLUE}Status: $HTTP_CODE${NC}"

  PAYMENT_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.payments | length' 2>/dev/null)

  if [ -n "$PAYMENT_COUNT" ] && [ "$PAYMENT_COUNT" != "null" ]; then
    echo -e "${YELLOW}📋 Found $PAYMENT_COUNT payments${NC}"

    if [ "$PAYMENT_COUNT" -gt 0 ]; then
      echo ""
      echo "Recent Payments:"
      echo "$RESPONSE_BODY" | jq -r '.payments[:5] | to_entries[] | "  \(.key + 1). \(.value.status) - \(.value.amount) \(.value.currency // "")\n     ID: \(.value._id // .value.id)\n     Created: \(.value.createdAt // "N/A")"'
    else
      echo -e "${YELLOW}  No payments found for this payment link${NC}"
    fi
  fi

  echo ""
  echo "Full Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
  echo -e "${RED}✗ Failed to fetch payments${NC}"
  echo -e "${RED}Status: $HTTP_CODE${NC}"
  echo "Error:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

# Test 4: Logout
echo ""
echo "============================================================"
echo -e "${CYAN}TEST 4: POST /auth/logout${NC}"
echo "============================================================"
echo ""

LOGOUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGOUT_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Logout successful${NC}"
  echo -e "${BLUE}Status: $HTTP_CODE${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
  echo -e "${RED}✗ Logout failed${NC}"
  echo -e "${RED}Status: $HTTP_CODE${NC}"
  echo "Error:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

# Test 5: Unauthorized Access
echo ""
echo "============================================================"
echo -e "${CYAN}TEST 5: Unauthorized Access (no token)${NC}"
echo "============================================================"
echo ""

UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$API_URL/dashboard/overview")

HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UNAUTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Correctly blocked unauthorized request${NC}"
  echo -e "${BLUE}Status: $HTTP_CODE${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
  echo -e "${RED}✗ Should have returned 401 Unauthorized${NC}"
  echo -e "${RED}Status: $HTTP_CODE${NC}"
  echo "Response:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

# Summary
echo ""
echo "============================================================"
echo -e "${CYAN}TEST SUMMARY${NC}"
echo "============================================================"
echo ""
echo -e "${GREEN}🎉 Tests completed!${NC}"
echo ""
