#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (change if needed)
BASE_URL="${BASE_URL:-http://localhost:4000}"

# Counter for passed and failed tests
PASSED=0
FAILED=0

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4
    local description=$5

    echo -e "\n${YELLOW}Testing:${NC} $description"
    echo -e "${YELLOW}  $method $endpoint${NC}"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Status: $http_code"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Expected: $expected_status, Got: $http_code"
        echo -e "${RED}  Response: $body${NC}"
        ((FAILED++))
    fi
}

echo "========================================="
echo " API Endpoint Testing"
echo "========================================="
echo " Base URL: $BASE_URL"
echo "========================================="

# Check if server is running
echo -e "\nChecking server connectivity..."
if ! curl -s --max-time 3 "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}✗ ERROR: Cannot connect to server at $BASE_URL${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo -e "  ${YELLOW}npm run start:dev${NC}"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"

# Test Root Endpoint
echo -e "\n${YELLOW}=== Root Endpoint ===${NC}"
test_endpoint "GET" "/" "200" "" "GET / - should return Hello World"

# Test Payment Links Endpoints
echo -e "\n${YELLOW}=== Payment Links Endpoints ===${NC}"
test_endpoint "GET" "/payment-links/%20" "400" "" "GET /payment-links/:linkCode - should return 400 for empty link code"
test_endpoint "GET" "/payment-links/abc" "400" "" "GET /payment-links/:linkCode - should return 400 for too short code"
test_endpoint "GET" "/payment-links/abcdefghijklmnopqrstuvwxyz" "400" "" "GET /payment-links/:linkCode - should return 400 for too long code"
test_endpoint "GET" "/payment-links/validcode123" "404" "" "GET /payment-links/:linkCode - should return 404 for non-existent code"

# Test Transactions Endpoints - POST
echo -e "\n${YELLOW}=== Transactions POST Endpoints ===${NC}"
test_endpoint "POST" "/transactions" "400" '{"txSignature":"test-sig","chain":"solana","type":"payment","fromAddress":"from","toAddress":"to"}' "POST /transactions - should return 400 when merchantId missing"
test_endpoint "POST" "/transactions" "400" '{"merchantId":"merchant123","chain":"solana","type":"payment","fromAddress":"from","toAddress":"to"}' "POST /transactions - should return 400 when txSignature missing"
test_endpoint "POST" "/transactions" "400" '{"merchantId":"merchant123","txSignature":"test-sig","type":"payment","fromAddress":"from","toAddress":"to"}' "POST /transactions - should return 400 when chain missing"
test_endpoint "POST" "/transactions" "400" '{"merchantId":"merchant123","txSignature":"test-sig","chain":"solana","fromAddress":"from","toAddress":"to"}' "POST /transactions - should return 400 when type missing"
test_endpoint "POST" "/transactions" "400" '{"merchantId":"merchant123","txSignature":"test-sig","chain":"solana","type":"payment","toAddress":"to"}' "POST /transactions - should return 400 when fromAddress missing"
test_endpoint "POST" "/transactions" "400" '{"merchantId":"merchant123","txSignature":"test-sig","chain":"solana","type":"payment","fromAddress":"from"}' "POST /transactions - should return 400 when toAddress missing"

# Test Transactions Endpoints - GET
echo -e "\n${YELLOW}=== Transactions GET Endpoints ===${NC}"
test_endpoint "GET" "/transactions/signature/%20" "400" "" "GET /transactions/signature/:txSignature - should return 400 for empty signature"
test_endpoint "GET" "/transactions/signature/nonexistent-signature" "404" "" "GET /transactions/signature/:txSignature - should return 404 for non-existent"
test_endpoint "GET" "/transactions/%20" "400" "" "GET /transactions/:id - should return 400 for empty ID"
test_endpoint "GET" "/transactions/507f1f77bcf86cd799439011" "404" "" "GET /transactions/:id - should return 404 for non-existent ID"

echo -e "\n${YELLOW}=== Transactions Merchant Endpoints ===${NC}"
test_endpoint "GET" "/transactions/merchant/%20" "400" "" "GET /transactions/merchant/:merchantId - should return 400 for empty merchantId"
test_endpoint "GET" "/transactions/merchant/merchant123?limit=1001" "400" "" "GET /transactions/merchant/:merchantId - should return 400 for invalid limit"
test_endpoint "GET" "/transactions/merchant/merchant123?limit=-1" "400" "" "GET /transactions/merchant/:merchantId - should return 400 for negative limit"
test_endpoint "GET" "/transactions/merchant/merchant123?skip=-1" "400" "" "GET /transactions/merchant/:merchantId - should return 400 for negative skip"

echo -e "\n${YELLOW}=== Transactions Stats Endpoints ===${NC}"
test_endpoint "GET" "/transactions/merchant/%20/stats" "400" "" "GET /transactions/merchant/:merchantId/stats - should return 400 for empty merchantId"

echo -e "\n${YELLOW}=== Transactions Swaps Endpoints ===${NC}"
test_endpoint "GET" "/transactions/merchant/%20/swaps" "400" "" "GET /transactions/merchant/:merchantId/swaps - should return 400 for empty merchantId"
test_endpoint "GET" "/transactions/merchant/merchant123/swaps?limit=101" "400" "" "GET /transactions/merchant/:merchantId/swaps - should return 400 for invalid limit"
test_endpoint "GET" "/transactions/merchant/merchant123/swaps?limit=-1" "400" "" "GET /transactions/merchant/:merchantId/swaps - should return 400 for negative limit"

# Test Transactions POST Actions
echo -e "\n${YELLOW}=== Transactions Action Endpoints ===${NC}"
test_endpoint "POST" "/transactions/%20/confirm" "400" '{"confirmations":10}' "POST /transactions/:txSignature/confirm - should return 400 for empty signature"
test_endpoint "POST" "/transactions/test-signature/confirm" "400" '{}' "POST /transactions/:txSignature/confirm - should return 400 for missing confirmations"
test_endpoint "POST" "/transactions/test-signature/confirm" "400" '{"confirmations":-1}' "POST /transactions/:txSignature/confirm - should return 400 for negative confirmations"

test_endpoint "POST" "/transactions/%20/fail" "400" '{"errorMessage":"Test error"}' "POST /transactions/:txSignature/fail - should return 400 for empty signature"
test_endpoint "POST" "/transactions/test-signature/fail" "400" '{}' "POST /transactions/:txSignature/fail - should return 400 for missing error message"
test_endpoint "POST" "/transactions/test-signature/fail" "400" '{"errorMessage":" "}' "POST /transactions/:txSignature/fail - should return 400 for empty error message"

test_endpoint "POST" "/transactions/%20/confirmations" "400" '{"confirmations":5}' "POST /transactions/:txSignature/confirmations - should return 400 for empty signature"
test_endpoint "POST" "/transactions/test-signature/confirmations" "400" '{}' "POST /transactions/:txSignature/confirmations - should return 400 for missing confirmations"
test_endpoint "POST" "/transactions/test-signature/confirmations" "400" '{"confirmations":-1}' "POST /transactions/:txSignature/confirmations - should return 400 for negative confirmations"

# Test Payments Endpoints
echo -e "\n${YELLOW}=== Payments Endpoints ===${NC}"
test_endpoint "GET" "/payments/link/%20" "400" "" "GET /payments/link/:linkCode - should return 400 for empty link code"
test_endpoint "GET" "/payments/link/abc" "400" "" "GET /payments/link/:linkCode - should return 400 for too short code"
test_endpoint "GET" "/payments/link/abcdefghijklmnopqrstuvwxyz" "400" "" "GET /payments/link/:linkCode - should return 400 for too long code"
test_endpoint "GET" "/payments/link/validcode123" "404" "" "GET /payments/link/:linkCode - should return 404 for non-existent code"

# Test Empty Controller Endpoints
echo -e "\n${YELLOW}=== Empty Controller Endpoints ===${NC}"
test_endpoint "GET" "/telegram" "404" "" "GET /telegram - should return 404 (no routes)"
test_endpoint "GET" "/blockchain" "404" "" "GET /blockchain - should return 404 (no routes)"
test_endpoint "GET" "/merchants" "404" "" "GET /merchants - should return 404 (no routes)"
test_endpoint "GET" "/wallet" "404" "" "GET /wallet - should return 404 (no routes)"

# Summary
echo ""
echo "========================================="
echo " Test Summary"
echo "========================================="
echo -e " ${GREEN}Passed:${NC} $PASSED"
echo -e " ${RED}Failed:${NC} $FAILED"
echo -e " ${YELLOW}Total:${NC}  $((PASSED + FAILED))"
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi
