# API Endpoint Testing Guide

This document describes the testing setup for the Obverse Launch API.

## Available Test Files

### 1. E2E Test Suite ([test/endpoints.e2e-spec.ts](test/endpoints.e2e-spec.ts))

Comprehensive Jest-based E2E tests for all API endpoints. This test file includes:

- **Root Endpoint**: Tests the main `/` endpoint
- **Payment Links Endpoints**: Tests validation for payment link retrieval
- **Transactions Endpoints**: Tests all transaction CRUD operations including:
  - Creating transactions
  - Retrieving by signature and ID
  - Merchant-specific queries
  - Transaction statistics
  - Recent swaps
  - Transaction status updates (confirm/fail)
  - Confirmation updates
- **Payments Endpoints**: Tests for fetching payments by payment link code
- **Empty Controller Endpoints**: Verifies behavior for controllers with no routes

**Total Test Cases**: 51 tests covering all validation scenarios

### 2. Bash Test Script ([test-endpoints.sh](test-endpoints.sh))

A standalone bash script that tests endpoints against a running server. This is useful for:
- Integration testing against a live server
- Quick endpoint validation during development
- CI/CD pipeline integration
- Manual testing without Jest setup

## Running the Tests

### Option 1: E2E Tests (Full Jest Suite)

**Prerequisites**:
- MongoDB connection must be available
- Telegram bot token must be configured (or tests must be updated to mock it)

```bash
npm run test:e2e
```

**Note**: Currently, these tests require:
1. MongoDB to be running and accessible
2. Telegram bot not to be running (to avoid conflicts)

### Option 2: Bash Test Script (Recommended for Quick Testing)

**Prerequisites**:
- Server must be running on port 4000 (or specify `BASE_URL`)

1. Start the server:
```bash
npm run start:dev
```

2. In another terminal, run the test script:
```bash
./test-endpoints.sh
```

Or specify a custom URL:
```bash
BASE_URL=http://localhost:3000 ./test-endpoints.sh
```

## API Endpoints Tested

### Root
- `GET /` - Returns "Hello World!"

### Payment Links
- `GET /payment-links/:linkCode` - Retrieve payment link by code
  - Validates link code format (6-20 characters)
  - Returns 404 for non-existent links

### Transactions

#### Create Transaction
- `POST /transactions` - Create a new transaction
  - Required fields: merchantId, txSignature, chain, type, fromAddress, toAddress
  - Validates all required fields

#### Retrieve Transactions
- `GET /transactions/signature/:txSignature` - Get transaction by signature
- `GET /transactions/:id` - Get transaction by ID
- `GET /transactions/merchant/:merchantId` - Get merchant transactions
  - Query params: limit (0-1000), skip (≥0), type, chain, status, startDate, endDate
- `GET /transactions/merchant/:merchantId/stats` - Get transaction statistics
  - Query params: type, chain, startDate, endDate
- `GET /transactions/merchant/:merchantId/swaps` - Get recent swaps
  - Query params: limit (0-100)

#### Update Transaction Status
- `POST /transactions/:txSignature/confirm` - Confirm a transaction
  - Required: confirmations (≥0)
  - Optional: chain, blockTime
- `POST /transactions/:txSignature/fail` - Mark transaction as failed
  - Required: errorMessage
  - Optional: chain
- `POST /transactions/:txSignature/confirmations` - Update confirmations
  - Required: confirmations (≥0)
  - Optional: chain

### Payments

#### Get Payments by Payment Link Code
- `GET /payments/link/:linkCode` - Get all payments for a payment link
  - Validates link code format (6-20 characters)
  - Returns 404 for non-existent links
  - Returns array of payments with populated payment link data

### Empty Controllers (No Routes Defined)
- `/telegram` - 404
- `/blockchain` - 404
- `/merchants` - 404
- `/wallet` - 404

## Test Configuration

### Jest E2E Configuration
File: [test/jest-e2e.json](test/jest-e2e.json)

Key configurations:
- Module name mapping for TypeScript paths
- nanoid module mocking to avoid ESM issues
- 30-second timeout for module initialization

### Test Utilities
- Mock nanoid: [test/mocks/nanoid.ts](test/mocks/nanoid.ts)

## Known Issues

1. **Telegram Bot Conflict**: E2E tests may fail if the Telegram bot is already running
2. **MongoDB Connection**: E2E tests require MongoDB to be accessible
3. **Test Timeouts**: Module initialization can take 30+ seconds due to MongoDB and Telegram setup

## Recommendations

For development and quick validation:
- Use the bash script ([test-endpoints.sh](test-endpoints.sh)) with a running server

For CI/CD and comprehensive testing:
- Use E2E tests with proper test database and mock Telegram service

## Test Coverage

The tests cover:
- ✅ Input validation for all endpoints
- ✅ Required field validation
- ✅ Query parameter validation
- ✅ Error handling (400, 404 responses)
- ⚠️  Success paths (require database setup)
- ⚠️  Authentication/Authorization (not yet implemented)
