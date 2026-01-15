# Fixing Memory Issues on Render Deployment

## Problem
NestJS application running out of memory during build/start on Render:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

## Solutions Applied

### 1. ✅ Increased Node.js Memory Limits

Updated [package.json](package.json) scripts:

```json
"build": "node --max-old-space-size=2048 ./node_modules/.bin/nest build"
"start:prod": "node --max-old-space-size=512 dist/main"
```

**What this does:**
- `--max-old-space-size=2048` - Allocates 2GB memory for **build** process
- `--max-old-space-size=512` - Allocates 512MB memory for **runtime** (production)

### 2. ✅ Created Render Configuration

Created [render.yaml](render.yaml) with optimized settings:
- Explicit build and start commands
- NODE_OPTIONS environment variable
- Proper plan configuration

## Additional Solutions (If Still Having Issues)

### 3. Upgrade Render Plan

If memory issues persist:
- **Free plan**: 512MB RAM (may not be enough for build)
- **Starter plan**: 1GB RAM (recommended minimum)
- **Standard plan**: 2GB+ RAM (ideal)

**How to upgrade:**
1. Go to Render dashboard
2. Select your service
3. Settings → Instance Type
4. Upgrade to Starter or higher

### 4. Optimize Dependencies

Reduce build memory by optimizing dependencies:

#### Remove Unused Dependencies
```bash
pnpm prune
```

#### Use Production Dependencies Only for Build
In Render dashboard → Environment:
```bash
# Build command
NODE_ENV=production pnpm install --prod=false && pnpm run build

# Then for runtime
pnpm prune --prod
```

### 5. Enable Build Cache (Render)

In Render dashboard:
1. Go to Settings
2. Enable "Build Cache"
3. This speeds up builds and reduces memory usage

### 6. Split Build and Deploy

If memory is still an issue, build locally and deploy dist:

```bash
# Local build
pnpm run build

# Add dist to git (normally in .gitignore)
git add -f dist

# Deploy
git commit -m "Add built files"
git push
```

Then update Render:
```yaml
buildCommand: echo "Using pre-built files"
startCommand: node dist/main
```

### 7. Use Docker (Advanced)

Create a multi-stage Dockerfile to optimize memory:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Monitoring Memory Usage

### Check Memory in Render Logs
```bash
# Add to your NestJS bootstrap
console.log('Memory usage:', process.memoryUsage());
```

### Set Up Alerts
In Render dashboard:
1. Metrics → Set up alerts
2. Get notified when memory > 80%

## Best Practices

### 1. Optimize Imports
Avoid barrel imports (index.ts files with many re-exports):
```typescript
// ❌ Bad (imports entire module)
import { Module } from '@nestjs/common';

// ✅ Good (already optimized by NestJS)
```

### 2. Lazy Loading Modules
For large applications, use lazy loading:
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Load heavy modules lazily
  ],
})
```

### 3. Production Build Optimization
Ensure `tsconfig.json` is optimized:
```json
{
  "compilerOptions": {
    "sourceMap": false,  // Disable source maps in production
    "incremental": true, // Enable incremental builds
    "removeComments": true
  }
}
```

## Verification Steps

After applying fixes:

1. **Commit changes:**
```bash
git add package.json render.yaml
git commit -m "Fix: Increase Node memory limits for deployment"
git push
```

2. **Monitor Render build logs:**
   - Watch for successful build completion
   - Check memory usage in logs

3. **Test the deployed app:**
   - Verify all endpoints work
   - Check telegram bot functionality
   - Monitor for any runtime memory issues

## Current Memory Allocation

After fixes:
- **Build time**: 2GB (2048MB)
- **Runtime**: 512MB (enough for most NestJS apps)

This should work on **Starter plan** (1GB RAM) or higher.

## If Still Having Issues

1. Check Render service logs for specific errors
2. Verify environment variables are set correctly
3. Check that MongoDB connection isn't consuming too much memory
4. Consider moving to a larger plan if traffic is high

## Summary

✅ **Quick Fix Applied**: Increased Node.js memory limits in package.json
✅ **Configuration**: Created render.yaml for optimized deployment
🔄 **Next Step**: Push changes and redeploy on Render

Your deployment should now succeed! 🚀
