# Production Environment Variable Fix

## 🐛 Issue Fixed

**Error in Production:**
```
[Nest] 86  - 02/04/2026, 5:56:32 PM   ERROR [DashboardHandler]
Error generating dashboard: 400: Bad Request: inline keyboard button URL
'http://localhost:3000' is invalid: Wrong HTTP URL
```

**Root Cause**: The Telegram bot was using `http://localhost:3000` as a fallback when `DASHBOARD_URL` environment variable wasn't set in production.

**Why It Happened**:
- The `.env` file is **gitignored** (correctly for security)
- Environment variables must be set on your hosting platform separately
- The code had a localhost fallback, which Telegram rejects for inline keyboard URLs

---

## ✅ Solution Implemented

### 1. Updated Dashboard Handler
**File**: [src/telegram/handlers/dashboard.handler.ts](src/telegram/handlers/dashboard.handler.ts#L137-L151)

**Changes**:
- ✅ Removed dangerous `localhost:3000` fallback
- ✅ Added proper fallback chain: `DASHBOARD_URL` → `APP_URL/dashboard` → Error
- ✅ Added validation to fail gracefully with helpful error message

**Before** (Dangerous):
```typescript
const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
```

**After** (Safe):
```typescript
const dashboardUrl =
  process.env.DASHBOARD_URL ||
  (process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : null);

if (!dashboardUrl) {
  this.logger.error('DASHBOARD_URL or APP_URL environment variable not set');
  await ctx.reply('❌ Dashboard is not configured. Please contact support.');
  return;
}
```

### 2. Updated Configuration File
**File**: [src/config/configuration.ts](src/config/configuration.ts)

**Changes**:
- ✅ Added `APP_URL` with production default
- ✅ Added `DASHBOARD_URL` to exported config

```typescript
export default () => ({
  // ... other config
  APP_URL: process.env.APP_URL || 'https://www.obverse.cc',
  DASHBOARD_URL: process.env.DASHBOARD_URL,
});
```

---

## 🚀 Deployment Instructions

### Step 1: Set Environment Variables on Your Hosting Platform

You need to set these environment variables on your production server:

#### Required Variables:
```bash
APP_URL=https://www.obverse.cc
DASHBOARD_URL=https://www.obverse.cc/dashboard

# All other existing variables
MONGODB_URI=your_mongodb_connection_string
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TURNKEY_ORGANIZATION_ID=your_turnkey_org_id
TURNKEY_API_PUBLIC_KEY=your_turnkey_public_key
TURNKEY_API_PRIVATE_KEY=your_turnkey_private_key
TURNKEY_API_BASE_URL=https://api.turnkey.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://www.obverse.cc
```

### Step 2: Platform-Specific Instructions

#### If using **Render**:
1. Go to your service dashboard
2. Navigate to **Environment** tab
3. Add environment variables:
   - `APP_URL` = `https://www.obverse.cc`
   - `DASHBOARD_URL` = `https://www.obverse.cc/dashboard`
4. Click **Save Changes**
5. Render will automatically redeploy

#### If using **Heroku**:
```bash
heroku config:set APP_URL=https://www.obverse.cc
heroku config:set DASHBOARD_URL=https://www.obverse.cc/dashboard
```

#### If using **Railway**:
1. Go to your project
2. Click on **Variables** tab
3. Add:
   - `APP_URL` = `https://www.obverse.cc`
   - `DASHBOARD_URL` = `https://www.obverse.cc/dashboard`

#### If using **DigitalOcean App Platform**:
1. Go to your app
2. Click **Settings** → **App-Level Environment Variables**
3. Add the variables
4. Save and redeploy

#### If using **Docker / VPS**:
Add to your `.env` file on the server or docker-compose.yml:
```bash
APP_URL=https://www.obverse.cc
DASHBOARD_URL=https://www.obverse.cc/dashboard
```

### Step 3: Deploy the Code Changes

```bash
# Build the application
npm run build

# Deploy (method depends on your setup)
git add .
git commit -m "Fix: Use production URL for Telegram dashboard links"
git push origin main
```

### Step 4: Verify the Fix

1. **Test the /dashboard command in Telegram**:
   ```
   /dashboard
   ```

2. **Expected behavior**:
   - ✅ Bot shows list of payment links
   - ✅ Clicking a link generates credentials
   - ✅ Dashboard URL should be `https://www.obverse.cc/dashboard`
   - ✅ "Open Dashboard" button should work

3. **Check logs**:
   ```bash
   # Look for errors
   grep "DASHBOARD_URL or APP_URL environment variable not set" logs/app.log

   # Should see successful dashboard generation
   grep "Generated dashboard for merchant" logs/app.log
   ```

---

## 🔒 Security Notes

### Why .env is Gitignored (Good!)

The `.env` file contains sensitive credentials and should **NEVER** be committed to Git:
- ✅ Database credentials
- ✅ API keys (Telegram, Turnkey)
- ✅ JWT secrets

**Always set production environment variables on your hosting platform directly.**

### Environment Variable Best Practices

1. **Never commit secrets to Git**
   - Use `.env` for local development only
   - Add `.env` to `.gitignore`

2. **Use different values for different environments**
   - Development: `http://localhost:3000`
   - Staging: `https://staging.obverse.cc`
   - Production: `https://www.obverse.cc`

3. **Required environment variables should fail fast**
   - The updated code now validates required URLs
   - Logs clear error messages
   - Fails gracefully with user-friendly messages

---

## 📋 Checklist for Production

Before deploying any NestJS app, ensure:

- [ ] All environment variables are set on hosting platform
- [ ] No hardcoded localhost URLs in code
- [ ] `.env` file is in `.gitignore`
- [ ] Configuration has production defaults where appropriate
- [ ] Required variables are validated at startup
- [ ] Logs clearly indicate missing configuration

---

## 🧪 Testing Locally

To test with production-like URLs locally:

```bash
# Create a .env.production file (also add to .gitignore)
APP_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3000/dashboard

# Run with production env
NODE_ENV=production npm run start:prod
```

**Note**: Telegram inline buttons won't work with localhost URLs, but you can test the URL generation logic.

---

## 🎯 Summary

**What was broken:**
- Dashboard links used `localhost:3000` in production
- Telegram rejected the invalid URL

**What was fixed:**
- Removed localhost fallback
- Added proper environment variable chain
- Added validation and error handling
- Updated configuration file

**What you need to do:**
1. Set `APP_URL` and `DASHBOARD_URL` on your hosting platform
2. Deploy the code changes
3. Test the `/dashboard` command

---

## ❓ Troubleshooting

### Still getting localhost error?
- Check environment variables are set on hosting platform
- Restart your application after setting env vars
- Check logs for "environment variable not set" errors

### Dashboard URL is wrong?
- Verify `DASHBOARD_URL` is set correctly
- Make sure there's no trailing slash: ✅ `/dashboard` not ❌ `/dashboard/`
- Check `APP_URL` is set as fallback

### Need help?
- Check application logs for detailed error messages
- Verify all environment variables: `printenv | grep -E "APP_URL|DASHBOARD_URL"`
- Test locally first with production URLs

---

**Status**: ✅ Fixed and ready to deploy
**Date**: 2026-02-04