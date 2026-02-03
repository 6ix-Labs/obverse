# Dashboard Feature Migration Guide

## Pre-Deployment Steps

### 1. Clean Old Dashboard Sessions

If you've previously deployed dashboard features, clean old sessions:

```javascript
// MongoDB Shell
use obverse_launch
db.dashboardsessions.deleteMany({})
```

### 2. Performance Indexes (Auto-created)

The following indexes will be automatically created when the app starts:

```javascript
// These are now part of the Payment schema
// MongoDB will create them automatically on first run
db.payments.createIndex({ paymentLinkId: 1, createdAt: -1 })
db.payments.createIndex({ merchantId: 1, createdAt: -1 })
db.payments.createIndex({ status: 1 })
```

**Note:** Mongoose will create these indexes automatically. No manual action needed!

### 3. Verify Environment Variables

Ensure these are set in `.env`:

```env
JWT_SECRET="your-secure-random-secret-here"
DASHBOARD_URL=https://www.obverse.cc/dashboard
```

### 4. Test the Flow

1. Run the server: `pnpm run start`
2. Open Telegram bot
3. Send `/dashboard`
4. Select a payment link
5. Copy credentials
6. Test login at dashboard URL

## Rollback Plan

If issues occur, simply:

1. Stop the server
2. Remove AuthModule and DashboardModule from app.module.ts
3. Remove `/dashboard` command from telegram.gateway.ts
4. Restart server

No data will be lost as this is a read-only feature.
