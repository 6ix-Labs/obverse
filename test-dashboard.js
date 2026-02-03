/**
 * Dashboard API Test Script
 *
 * Usage:
 * 1. Get credentials from Telegram bot using /dashboard command
 * 2. Run: node test-dashboard.js <identifier> <password>
 *
 * Example:
 * node test-dashboard.js @johndoe P4ssw0rd1234
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testLogin(identifier, password) {
  logSection('TEST 1: POST /auth/login');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dashboard-Test-Script/1.0',
      },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await response.json();

    if (response.ok) {
      log('✓ Login successful', 'green');
      log(`Status: ${response.status}`, 'blue');
      console.log('Response:', JSON.stringify(data, null, 2));

      if (data.access_token) {
        log('\n✓ JWT token received', 'green');
        return data.access_token;
      } else {
        log('✗ No access_token in response', 'red');
        return null;
      }
    } else {
      log('✗ Login failed', 'red');
      log(`Status: ${response.status}`, 'red');
      console.log('Error:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    log('✗ Request failed', 'red');
    console.error('Error:', error.message);
    return null;
  }
}

async function testDashboardOverview(token) {
  logSection('TEST 2: GET /dashboard/overview');

  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('✓ Dashboard overview fetched', 'green');
      log(`Status: ${response.status}`, 'blue');
      console.log('\nPayment Link Overview:');
      console.log(JSON.stringify(data, null, 2));

      // Display key metrics
      if (data.stats) {
        log('\n📊 Key Metrics:', 'yellow');
        console.log(`  Total Payments: ${data.stats.totalPayments}`);
        console.log(`  Pending: ${data.stats.pendingPayments}`);
        console.log(`  Confirmed: ${data.stats.confirmedPayments}`);
        console.log(`  Failed: ${data.stats.failedPayments}`);
        console.log(`  Total Amount: ${data.stats.totalAmount} ${data.stats.currency || ''}`);
      }

      return true;
    } else {
      log('✗ Failed to fetch overview', 'red');
      log(`Status: ${response.status}`, 'red');
      console.log('Error:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('✗ Request failed', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function testDashboardPayments(token, limit = 10, skip = 0) {
  logSection(`TEST 3: GET /dashboard/payments?limit=${limit}&skip=${skip}`);

  try {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/payments?limit=${limit}&skip=${skip}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      log('✓ Payments fetched', 'green');
      log(`Status: ${response.status}`, 'blue');

      if (data.payments && Array.isArray(data.payments)) {
        log(`\n📋 Found ${data.payments.length} payments`, 'yellow');

        if (data.payments.length > 0) {
          console.log('\nRecent Payments:');
          data.payments.slice(0, 5).forEach((payment, idx) => {
            console.log(`  ${idx + 1}. ${payment.status} - ${payment.amount} ${payment.currency || ''}`);
            console.log(`     ID: ${payment._id || payment.id}`);
            console.log(`     Created: ${payment.createdAt || 'N/A'}`);
          });
        } else {
          log('  No payments found for this payment link', 'yellow');
        }

        console.log('\nFull Response:');
        console.log(JSON.stringify(data, null, 2));
      }

      return true;
    } else {
      log('✗ Failed to fetch payments', 'red');
      log(`Status: ${response.status}`, 'red');
      console.log('Error:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('✗ Request failed', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function testLogout(token) {
  logSection('TEST 4: POST /auth/logout');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('✓ Logout successful', 'green');
      log(`Status: ${response.status}`, 'blue');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      log('✗ Logout failed', 'red');
      log(`Status: ${response.status}`, 'red');
      console.log('Error:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('✗ Request failed', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  logSection('TEST 5: Unauthorized Access (no token)');

  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
      method: 'GET',
    });

    const data = await response.json();

    if (response.status === 401) {
      log('✓ Correctly blocked unauthorized request', 'green');
      log(`Status: ${response.status}`, 'blue');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      log('✗ Should have returned 401 Unauthorized', 'red');
      log(`Status: ${response.status}`, 'red');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    log('✗ Request failed', 'red');
    console.error('Error:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  log('\n🧪 Dashboard API Test Suite', 'cyan');
  log(`🔗 Testing API at: ${API_BASE_URL}`, 'blue');

  // Check if credentials provided
  if (args.length < 2) {
    log('\n⚠️  Usage: node test-dashboard.js <identifier> <password>', 'yellow');
    log('\nSteps to get credentials:', 'yellow');
    log('  1. Open Telegram bot', 'yellow');
    log('  2. Send /dashboard command', 'yellow');
    log('  3. Select a payment link', 'yellow');
    log('  4. Copy the identifier and password', 'yellow');
    log('  5. Run: node test-dashboard.js <identifier> <password>', 'yellow');
    log('\nExample:', 'yellow');
    log('  node test-dashboard.js @johndoe P4ssw0rd1234\n', 'yellow');
    process.exit(1);
  }

  const [identifier, password] = args;

  log('\n📝 Test Credentials:', 'blue');
  log(`  Identifier: ${identifier}`, 'blue');
  log(`  Password: ${'*'.repeat(password.length)}`, 'blue');

  // Track test results
  const results = {
    passed: 0,
    failed: 0,
  };

  // Test 1: Login
  const token = await testLogin(identifier, password);
  if (!token) {
    log('\n❌ Cannot proceed without valid token. Exiting.', 'red');
    process.exit(1);
  }
  results.passed++;

  // Test 2: Dashboard Overview
  const overviewSuccess = await testDashboardOverview(token);
  overviewSuccess ? results.passed++ : results.failed++;

  // Test 3: Dashboard Payments
  const paymentsSuccess = await testDashboardPayments(token, 10, 0);
  paymentsSuccess ? results.passed++ : results.failed++;

  // Test 4: Logout
  const logoutSuccess = await testLogout(token);
  logoutSuccess ? results.passed++ : results.failed++;

  // Test 5: Unauthorized Access
  const unauthorizedSuccess = await testUnauthorizedAccess();
  unauthorizedSuccess ? results.passed++ : results.failed++;

  // Summary
  logSection('TEST SUMMARY');
  log(`Total Tests: ${results.passed + results.failed}`, 'blue');
  log(`✓ Passed: ${results.passed}`, 'green');
  log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  if (results.failed === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check logs above.', 'yellow');
  }

  console.log('\n');
}

// Run tests
main().catch(error => {
  log('\n💥 Fatal error:', 'red');
  console.error(error);
  process.exit(1);
});
