# Dashboard API Integration Guide for Frontend

## Overview
The dashboard allows merchants to view statistics and payments for their payment links. This guide covers the complete integration flow.

---

## 🔐 Authentication Flow

### Step 1: Login to Get JWT Token

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "identifier": "username_or_telegram_id",
  "paymentLinkId": "payment_link_mongodb_id"
}
```

**Example:**
```javascript
const loginResponse = await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    identifier: 'Ofuzoremeke',  // Username or Telegram ID
    paymentLinkId: '6981e985c1dbc49ab16a572d'  // Payment Link MongoDB _id
  })
});

const { token } = await loginResponse.json();
```

**Response:**
```json
{
  "success": true,
  "response_code": "000",
  "response_description": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "merchant": {
      "id": "694a6641cb9874799b94e33c",
      "username": "Ofuzoremeke",
      "telegramId": "5384395418"
    },
    "paymentLink": {
      "id": "6981e985c1dbc49ab16a572d",
      "linkId": "bv4G893l",
      "description": "tests"
    },
    "session": {
      "id": "6981ea9fc1dbc49ab16a5733",
      "expiresAt": "2026-02-04T12:26:45.643Z"
    }
  }
}
```

**Important Notes:**
- The JWT token expires in 2 hours
- The token is scoped to a specific payment link
- Store the token securely (localStorage/sessionStorage)

---

## 📊 Dashboard Endpoints

### 1. Get Dashboard Overview

**Endpoint:** `GET /dashboard/overview`

**Headers:**
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

**Example:**
```javascript
const dashboard = await fetch('http://localhost:4000/dashboard/overview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await dashboard.json();
```

**Response:**
```json
{
  "paymentLink": {
    "linkId": "bv4G893l",
    "description": "tests",
    "amount": 0.01,
    "token": "USDC",
    "chain": "solana",
    "isActive": true,
    "isReusable": true,
    "createdAt": "2026-02-03T12:26:45.643Z"
  },
  "stats": {
    "totalPayments": 3,
    "totalAmount": 0.03,
    "pendingPayments": 0,
    "confirmedPayments": 3,
    "failedPayments": 0,
    "successRate": 100,
    "lastPaidAt": "2026-02-03T21:51:07.781Z"
  },
  "recentPayments": [
    {
      "_id": "69826dcbb706fbe498ac0e00",
      "amount": 0.01,
      "token": "USDC",
      "status": "confirmed",
      "txSignature": "2vBF7cinPuDqFeUBFwHyLb...",
      "customerData": {
        "name": "Emeke",
        "email": "reteg@gmail.com"
      },
      "createdAt": "2026-02-03T21:51:07.697Z"
    }
    // ... up to 10 most recent payments
  ],
  "chartData": [
    {
      "date": "2026-02-03",
      "count": 3,
      "amount": 0.03
    }
  ]
}
```

---

### 2. Get Paginated Payments

**Endpoint:** `GET /dashboard/payments?limit=50&skip=0`

**Headers:**
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

**Query Parameters:**
- `limit` (optional, default: 50) - Number of results per page
- `skip` (optional, default: 0) - Offset for pagination

**Example:**
```javascript
// Get first page (50 payments)
const page1 = await fetch('http://localhost:4000/dashboard/payments?limit=50&skip=0', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get second page (next 50 payments)
const page2 = await fetch('http://localhost:4000/dashboard/payments?limit=50&skip=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "payments": [
    {
      "_id": "69826dcbb706fbe498ac0e00",
      "amount": 0.01,
      "token": "USDC",
      "status": "confirmed",
      "txSignature": "2vBF7cinPuDqFeUBFwHyLb...",
      "chain": "solana",
      "fromAddress": "MHjUsJ6NNNZJboc53qq7TEBgVRDYk37dfNEXdB29ePy",
      "toAddress": "3ZX4FwhLuA42HUA4PQLbwD7iBpT4VnPVa86g3KzS8CMZ",
      "customerData": {
        "name": "Emeke",
        "email": "reteg@gmail.com"
      },
      "confirmations": 1,
      "createdAt": "2026-02-03T21:51:07.697Z",
      "confirmedAt": "2026-02-03T21:51:07.781Z"
    }
    // ... more payments
  ],
  "pagination": {
    "total": 3,
    "limit": 50,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## 🔓 Public Endpoints (No Authentication Required)

### Get Payments by Payment Link Code

**Endpoint:** `GET /payments/link/:linkCode`

**Example:**
```javascript
// No authentication needed!
const payments = await fetch('http://localhost:4000/payments/link/bv4G893l');
const data = await payments.json();
```

**Response:**
```json
[
  {
    "_id": "69826dcbb706fbe498ac0e00",
    "paymentLinkId": {
      "_id": "6981e985c1dbc49ab16a572d",
      "linkId": "bv4G893l",
      "amount": 0.01,
      "token": "USDC",
      "description": "tests"
    },
    "amount": 0.01,
    "token": "USDC",
    "status": "confirmed",
    "customerData": {
      "name": "Emeke",
      "email": "reteg@gmail.com"
    },
    "createdAt": "2026-02-03T21:51:07.697Z"
  }
  // ... all payments for this link
]
```

---

## 📝 Complete Integration Example

```javascript
class DashboardAPI {
  constructor(baseURL = 'http://localhost:4000') {
    this.baseURL = baseURL;
    this.token = null;
  }

  // Step 1: Login
  async login(identifier, paymentLinkId) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, paymentLinkId })
    });

    const data = await response.json();

    if (data.success) {
      this.token = data.data.token;
      // Store token for later use
      localStorage.setItem('dashboardToken', this.token);
      return data.data;
    }

    throw new Error(data.message || 'Login failed');
  }

  // Step 2: Get Dashboard Overview
  async getOverview() {
    const response = await fetch(`${this.baseURL}/dashboard/overview`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard overview');
    }

    return await response.json();
  }

  // Step 3: Get Paginated Payments
  async getPayments(limit = 50, skip = 0) {
    const response = await fetch(
      `${this.baseURL}/dashboard/payments?limit=${limit}&skip=${skip}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }

    return await response.json();
  }

  // Public: Get payments by link code (no auth needed)
  async getPaymentsByLinkCode(linkCode) {
    const response = await fetch(`${this.baseURL}/payments/link/${linkCode}`);

    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }

    return await response.json();
  }

  // Helper: Load token from storage
  loadToken() {
    this.token = localStorage.getItem('dashboardToken');
    return !!this.token;
  }

  // Helper: Logout
  logout() {
    this.token = null;
    localStorage.removeItem('dashboardToken');
  }
}

// Usage Example
async function displayDashboard() {
  const api = new DashboardAPI();

  try {
    // Login first
    const loginData = await api.login('Ofuzoremeke', '6981e985c1dbc49ab16a572d');
    console.log('Logged in:', loginData);

    // Get dashboard overview
    const overview = await api.getOverview();
    console.log('Stats:', overview.stats);
    console.log('Recent Payments:', overview.recentPayments);
    console.log('Chart Data:', overview.chartData);

    // Get paginated payments
    const payments = await api.getPayments(10, 0);
    console.log('Payments:', payments.payments);
    console.log('Pagination:', payments.pagination);

  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## 🎨 UI Implementation Tips

### Dashboard Stats Display
```javascript
function renderStats(stats) {
  return `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Payments</h3>
        <p class="stat-value">${stats.totalPayments}</p>
      </div>
      <div class="stat-card">
        <h3>Total Amount</h3>
        <p class="stat-value">${stats.totalAmount} ${overview.paymentLink.token}</p>
      </div>
      <div class="stat-card">
        <h3>Success Rate</h3>
        <p class="stat-value">${stats.successRate}%</p>
      </div>
      <div class="stat-card">
        <h3>Confirmed</h3>
        <p class="stat-value">${stats.confirmedPayments}</p>
      </div>
    </div>
  `;
}
```

### Payments Table
```javascript
function renderPaymentsTable(payments) {
  return `
    <table class="payments-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Transaction</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map(p => `
          <tr>
            <td>${new Date(p.createdAt).toLocaleDateString()}</td>
            <td>${p.customerData.name} (${p.customerData.email})</td>
            <td>${p.amount} ${p.token}</td>
            <td><span class="badge badge-${p.status}">${p.status}</span></td>
            <td>
              <a href="https://solscan.io/tx/${p.txSignature}" target="_blank">
                View →
              </a>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
```

### Pagination
```javascript
function Pagination({ total, limit, skip, onPageChange }) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return `
    <div class="pagination">
      <button
        onclick="onPageChange(${skip - limit})"
        ${skip === 0 ? 'disabled' : ''}
      >
        Previous
      </button>

      <span>Page ${currentPage} of ${totalPages}</span>

      <button
        onclick="onPageChange(${skip + limit})"
        ${skip + limit >= total ? 'disabled' : ''}
      >
        Next
      </button>
    </div>
  `;
}
```

---

## ⚠️ Error Handling

### Common Error Responses

**Unauthorized (401):**
```json
{
  "success": false,
  "response_code": "011",
  "response_description": "Unauthorized",
  "message": "Unauthorized",
  "timestamp": "2026-02-03T21:55:26.633Z",
  "path": "/dashboard/overview"
}
```

**Solution:** Token expired or invalid. User needs to login again.

**Not Found (404):**
```json
{
  "statusCode": 404,
  "message": "Payment link not found"
}
```

**Bad Request (400):**
```json
{
  "statusCode": 400,
  "message": "Invalid payment link code format"
}
```

### Error Handling Example
```javascript
async function fetchWithErrorHandling(url, options) {
  try {
    const response = await fetch(url, options);

    if (response.status === 401) {
      // Token expired, redirect to login
      api.logout();
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## 🔄 Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
└─────┬───────┘
      │
      │ 1. POST /auth/login
      │    { identifier, paymentLinkId }
      ▼
┌─────────────┐
│   Backend   │
└─────┬───────┘
      │
      │ 2. Returns JWT Token
      │    (scoped to payment link)
      ▼
┌─────────────┐
│   Frontend  │
│ Store Token │
└─────┬───────┘
      │
      │ 3. GET /dashboard/overview
      │    Authorization: Bearer {token}
      ▼
┌─────────────┐
│   Backend   │
│ Verify JWT  │
│ Extract     │
│ paymentLinkId
└─────┬───────┘
      │
      │ 4. Query payments where
      │    paymentLinkId = token.paymentLinkId
      ▼
┌─────────────┐
│  MongoDB    │
└─────┬───────┘
      │
      │ 5. Returns payments
      ▼
┌─────────────┐
│   Backend   │
│ Calculate   │
│ Stats       │
└─────┬───────┘
      │
      │ 6. Return dashboard data
      ▼
┌─────────────┐
│   Frontend  │
│  Display    │
│  Dashboard  │
└─────────────┘
```

---

## 🚀 Quick Start Checklist

- [ ] Implement login form to get JWT token
- [ ] Store token securely (localStorage/sessionStorage)
- [ ] Create API service class with authentication headers
- [ ] Fetch and display dashboard overview
- [ ] Implement payments table with pagination
- [ ] Add chart component for chartData visualization
- [ ] Handle token expiration (redirect to login)
- [ ] Add loading states and error handling
- [ ] Test with different payment link IDs

---

## 📞 Support

For questions or issues, contact the backend team or check:
- API Base URL: `http://localhost:4000`
- Postman Collection: See `postman-dashboard-collection.json`
- Test Scripts: See `test-dashboard.js`

---

## 🔍 Testing Tips

1. **Use the public endpoint first** to verify payment data without auth:
   ```bash
   curl http://localhost:4000/payments/link/bv4G893l
   ```

2. **Test login with a valid merchant**:
   ```bash
   curl -X POST http://localhost:4000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"identifier": "Ofuzoremeke", "paymentLinkId": "6981e985c1dbc49ab16a572d"}'
   ```

3. **Test dashboard with JWT**:
   ```bash
   curl http://localhost:4000/dashboard/overview \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

Happy coding! 🎉