#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       Swagger Documentation Validation Script             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://localhost:4000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing Swagger endpoints..."
echo "======================================"
echo ""

# Test 1: Swagger JSON endpoint
echo "1. Testing Swagger JSON endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api-docs-json)
if [ "$STATUS" -eq 200 ]; then
    echo -e "   ${GREEN}✓${NC} Swagger JSON endpoint is accessible"
else
    echo -e "   ${RED}✗${NC} Swagger JSON endpoint failed (Status: $STATUS)"
fi

# Test 2: Swagger UI endpoint
echo ""
echo "2. Testing Swagger UI endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/api-docs)
if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 301 ] || [ "$STATUS" -eq 302 ]; then
    echo -e "   ${GREEN}✓${NC} Swagger UI is accessible"
    echo -e "   ${YELLOW}→${NC} Visit: ${BASE_URL}/api-docs"
else
    echo -e "   ${RED}✗${NC} Swagger UI failed (Status: $STATUS)"
fi

# Test 3: Check for API tags
echo ""
echo "3. Checking API tags configuration..."
TAGS=$(curl -s ${BASE_URL}/api-docs-json | grep -o '"tags":\[' | wc -l)
if [ "$TAGS" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} API tags are configured"
else
    echo -e "   ${YELLOW}⚠${NC} No API tags found (may need configuration)"
fi

# Test 4: Check payment-links endpoints
echo ""
echo "4. Checking payment-links endpoint documentation..."
PAYMENT_ENDPOINTS=$(curl -s ${BASE_URL}/api-docs-json | grep -o 'payment-links' | wc -l)
if [ "$PAYMENT_ENDPOINTS" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} Payment links endpoints documented ($PAYMENT_ENDPOINTS references)"
else
    echo -e "   ${RED}✗${NC} Payment links endpoints not found"
fi

# Test 5: Check OG image endpoint
echo ""
echo "5. Checking OG image endpoint documentation..."
OG_IMAGE=$(curl -s ${BASE_URL}/api-docs-json | grep -o 'og-image' | wc -l)
if [ "$OG_IMAGE" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} OG image endpoint documented"
else
    echo -e "   ${YELLOW}⚠${NC} OG image endpoint not found in docs"
fi

echo ""
echo "======================================"
echo "Validation complete!"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure your server is running with:"
echo "  pnpm run start:dev"
echo ""
echo -e "Then visit: ${YELLOW}${BASE_URL}/api-docs${NC}"
echo ""