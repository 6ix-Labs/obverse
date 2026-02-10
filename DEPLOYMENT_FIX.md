# Deployment Fix - Express Module Error

## Issue

```
Error: Cannot find module 'express'
Require stack:
- /opt/render/project/src/dist/payment-links/payment-links.controller.js
```

## Root Cause

The `payment-links.controller.ts` was importing express:
```typescript
import * as express from 'express';
```

But `express` was not listed in the runtime dependencies, only `@types/express` for TypeScript types.

## Solution Applied

✅ **Added express to dependencies**

```bash
pnpm add express
```

**Result:** `express@5.2.1` added to `package.json`

## Verification

### Local Verification

```bash
# Build succeeded
pnpm run build
✅ Success

# Module accessible
node -e "require('express')"
✅ Success
```

### Deployment Checklist

Before deploying to Render, ensure:

1. **Dependencies installed:**
   ```bash
   pnpm install
   ```

2. **Build succeeds:**
   ```bash
   pnpm run build
   ```

3. **package.json updated:**
   ```json
   {
     "dependencies": {
       "express": "5.2.1",
       "@types/express": "^5.0.0",
       "@nestjs/platform-express": "^11.0.1"
     }
   }
   ```

4. **Commit changes:**
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "fix: add express to dependencies for deployment"
   git push
   ```

## Files Modified

- ✅ `package.json` - Added express dependency
- ✅ `pnpm-lock.yaml` - Updated lockfile

## Render Deployment Settings

Ensure your `render.yaml` or build settings have:

**Build Command:**
```bash
pnpm install && pnpm run build
```

**Start Command:**
```bash
node --max-old-space-size=512 dist/main
```

## Why This Happened

When we added the OG image feature, we imported express types in the controller:

```typescript
// In payment-links.controller.ts
import * as express from 'express';

// Used for type annotations
async getOGImage(
  @Res() res: express.Response,
): Promise<void>
```

TypeScript compilation worked locally because:
- `@types/express` was already installed
- `@nestjs/platform-express` includes express transitively

But during Render deployment:
- Production dependencies are installed
- Express wasn't explicitly listed
- Module resolution failed at runtime

## Express Version Compatibility

**Express 5.x with NestJS 11:**
- ✅ Compatible
- NestJS 11 supports Express 5.x
- No breaking changes expected

If you encounter issues, you can downgrade:
```bash
pnpm add express@4.21.2
```

## Testing After Deployment

Once deployed, test these endpoints:

### 1. Payment Link HTML (with OG tags)
```bash
curl -H "User-Agent: Twitterbot/1.0" https://your-app.onrender.com/payment-links/YOUR_LINK_CODE
```
Should return: HTML with `<meta property="og:image">`

### 2. OG Image Generation
```bash
curl https://your-app.onrender.com/payment-links/YOUR_LINK_CODE/og-image > test.png
file test.png
```
Should return: PNG image data

### 3. API (JSON)
```bash
curl -H "Accept: application/json" https://your-app.onrender.com/payment-links/YOUR_LINK_CODE
```
Should return: JSON payment link data

## Monitoring

After deployment, monitor logs for:

```bash
# Check for express-related errors
render logs | grep -i "express"

# Check for module errors
render logs | grep -i "cannot find module"

# Check for OG image generation
render logs | grep -i "og image"
```

## Future Prevention

To prevent similar issues:

1. **Always add packages to dependencies when importing them**
   ```bash
   # If you import it, install it
   pnpm add package-name
   ```

2. **Test production builds locally**
   ```bash
   NODE_ENV=production pnpm run build
   node dist/main.js
   ```

3. **Use dependency check tools**
   ```bash
   pnpm list --prod
   ```

## Rollback Plan

If Express 5.x causes issues:

```bash
# 1. Downgrade to Express 4.x
pnpm add express@4.21.2

# 2. Update types
pnpm add -D @types/express@4.17.21

# 3. Rebuild and redeploy
pnpm run build
git add package.json pnpm-lock.yaml
git commit -m "fix: downgrade express to 4.x"
git push
```

## Summary

| Issue | Status |
|-------|--------|
| Missing express dependency | ✅ Fixed |
| Build successful | ✅ Yes |
| Module accessible | ✅ Yes |
| Ready to deploy | ✅ Yes |

**Next Steps:**
1. Commit the changes to git
2. Push to your repository
3. Render will auto-deploy
4. Test the OG image endpoints

---

**Fixed:** February 5, 2026
**Status:** ✅ Ready to Deploy