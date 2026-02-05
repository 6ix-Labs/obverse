# Dynamic Open Graph Images Implementation

## Overview

This implementation adds dynamic Open Graph (OG) preview images to your payment links. When shared on social media or messaging platforms (Twitter, Telegram, WhatsApp, etc.), each payment link now displays a unique preview image with the payment details instead of a static logo.

## What Was Implemented

### 1. **OG Image Generation Service** ([og-image.service.ts](src/payment-links/og-image.service.ts))
- Generates 1200x630px PNG images dynamically
- Uses SVG templates with Sharp for image generation
- Includes payment details: amount, token, chain, description
- Color-coded by blockchain (Solana green, Ethereum blue, etc.)

### 2. **HTML Template Service** ([og-template.service.ts](src/payment-links/og-template.service.ts))
- Generates HTML pages with complete Open Graph meta tags
- Includes meta tags for Facebook, Twitter, LinkedIn, Telegram
- Provides a user-friendly landing page with payment details
- Auto-redirects users to the frontend payment page after 2 seconds

### 3. **Updated Payment Links Controller** ([payment-links.controller.ts](src/payment-links/payment-links.controller.ts))
- New endpoint: `GET /payment-links/:linkCode/og-image` - Returns the dynamic PNG image
- Updated endpoint: `GET /payment-links/:linkCode` - Now smart-detects bots vs API clients
  - **Bots/Browsers** → Receives HTML with OG tags
  - **API clients** → Receives JSON (backward compatible)

## How It Works

### Request Flow

1. **User shares link**: `https://obverse.cc/payment-links/abc123xyz`

2. **Social media bot crawls**:
   - Bot fetches the URL
   - Backend detects bot via User-Agent
   - Returns HTML with OG meta tags

3. **Bot fetches image**:
   - Reads `<meta property="og:image" content="https://obverse.cc/payment-links/abc123xyz/og-image" />`
   - Fetches the image URL
   - Backend generates PNG on-the-fly
   - Bot caches and displays the image

4. **User clicks link**:
   - Browser loads HTML page
   - Shows payment details with nice UI
   - Auto-redirects to frontend payment page after 2s

### Bot Detection

The system detects social media bots by checking User-Agent headers for:
- `facebookexternalhit` (Facebook)
- `twitterbot` (Twitter/X)
- `telegrambot` (Telegram)
- `whatsapp` (WhatsApp)
- `slackbot`, `discordbot`, `linkedinbot`, etc.

### Smart Response Handling

```
┌─────────────────────────────────────────┐
│  GET /payment-links/abc123xyz           │
└─────────────┬───────────────────────────┘
              │
              ▼
     ┌────────────────────┐
     │ Check User-Agent   │
     │ & Accept Header    │
     └────────┬───────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
┌──────────┐    ┌──────────┐
│   Bot    │    │   API    │
│ Browser  │    │  Client  │
└─────┬────┘    └────┬─────┘
      │              │
      ▼              ▼
┌──────────┐    ┌──────────┐
│   HTML   │    │   JSON   │
│ with OG  │    │   Data   │
└──────────┘    └──────────┘
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Frontend Payment Page URL (for OG image redirects)
FRONTEND_URL=https://www.obverse.cc
```

This controls where users are redirected after seeing the preview page.

### Customization

#### Change Image Design
Edit [og-image.service.ts:generateSVG()](src/payment-links/og-image.service.ts#L38) to modify:
- Colors, fonts, layout
- Logo placement
- Additional fields

#### Change HTML Template
Edit [og-template.service.ts:generateHTML()](src/payment-links/og-template.service.ts#L7) to modify:
- Page styling
- Meta tag content
- Redirect timing
- Additional information

#### Add More Chain Colors
Update the `getChainColor()` method in both services to support additional blockchains.

## Testing

### Test 1: View OG Image Directly

```bash
curl http://localhost:4000/payment-links/YOUR_LINK_CODE/og-image > test-image.png
open test-image.png
```

### Test 2: View HTML Preview Page

Open in browser:
```
http://localhost:4000/payment-links/YOUR_LINK_CODE
```

You should see:
- ✅ HTML page with payment details
- ✅ Auto-redirect after 2 seconds

### Test 3: Test Bot Detection

```bash
# Simulate Twitter bot
curl -H "User-Agent: Twitterbot/1.0" http://localhost:4000/payment-links/YOUR_LINK_CODE

# Should return HTML with <meta property="og:image" ...>
```

```bash
# Simulate API client
curl -H "Accept: application/json" http://localhost:4000/payment-links/YOUR_LINK_CODE

# Should return JSON data
```

### Test 4: Social Media Debuggers

Use these tools to see exactly what social platforms see:

**Facebook/Meta:**
https://developers.facebook.com/tools/debug/

**Twitter/X:**
https://cards-dev.twitter.com/validator

**LinkedIn:**
https://www.linkedin.com/post-inspector/

**Steps:**
1. Deploy your backend to production
2. Paste your payment link URL into the debugger
3. Click "Scrape" or "Validate"
4. View the generated preview

### Test 5: Real-World Share Test

1. Create a test payment link
2. Share the link in a private message on:
   - Telegram
   - WhatsApp
   - Twitter DM
   - Discord
3. Check if the dynamic preview appears with payment details

## Example Preview

When sharing `https://obverse.cc/payment-links/x7k9m2`, users will see:

```
┌─────────────────────────────────────┐
│         OBVERSE                     │
│        [SOLANA]                     │
│                                     │
│      50.00 USDC                     │
│                                     │
│   Pay for consultation services     │
│                                     │
│   Crypto Payment Request            │
└─────────────────────────────────────┘
```

## Image Caching

OG images are cached by:
- **Server**: 24-hour cache headers (`Cache-Control: public, max-age=86400`)
- **Social platforms**: Cache indefinitely until you force refresh

### Force Refresh Cached Images

**Facebook:**
1. Go to https://developers.facebook.com/tools/debug/
2. Enter your URL
3. Click "Scrape Again"

**Twitter:**
- Images cache for ~7 days, no manual refresh available

**Telegram:**
- Clear link preview cache in chat settings

## Performance Considerations

### Image Generation Speed
- SVG → PNG conversion: ~100-300ms per image
- First request generates the image
- Subsequent requests served from browser cache

### Optimization Options

1. **Pre-generate images** when payment links are created
2. **Cache generated images** in Redis or filesystem
3. **Use CDN** to serve images faster globally
4. **Consider external service** (Cloudinary, Vercel OG) for high traffic

## Backward Compatibility

✅ **API clients are unaffected**
- Requests with `Accept: application/json` still receive JSON
- No breaking changes to existing API consumers

✅ **Direct JSON requests**
```javascript
// This still works as before
fetch('/payment-links/abc123', {
  headers: { 'Accept': 'application/json' }
})
```

## Troubleshooting

### Images Not Showing

**Check 1: Verify endpoint works**
```bash
curl -I http://localhost:4000/payment-links/YOUR_LINK_CODE/og-image
# Should return: Content-Type: image/png
```

**Check 2: Verify HTML has correct meta tags**
```bash
curl http://localhost:4000/payment-links/YOUR_LINK_CODE | grep "og:image"
# Should show: <meta property="og:image" content="..." />
```

**Check 3: Test with actual bot**
```bash
curl -A "Twitterbot" http://localhost:4000/payment-links/YOUR_LINK_CODE
# Should return HTML, not JSON
```

### Images Show Old/Wrong Data

- Social platforms cache aggressively
- Use platform debuggers to force refresh
- Wait 24-48 hours for natural cache expiration

### Build Errors

If you see Sharp build errors:
```bash
pnpm rebuild sharp
```

## Future Enhancements

Potential additions:
- [ ] QR code on preview image
- [ ] Merchant logos/branding
- [ ] Multiple image templates
- [ ] A/B testing different designs
- [ ] Analytics tracking (views, shares)
- [ ] Custom backgrounds per merchant
- [ ] Support for GIF/video previews

## Files Modified/Created

**New Files:**
- `src/payment-links/og-image.service.ts`
- `src/payment-links/og-template.service.ts`

**Modified Files:**
- `src/payment-links/payment-links.controller.ts`
- `src/payment-links/payment-links.module.ts`
- `.env`

**Dependencies Added:**
- `sharp` - Image processing library
- `@nestjs/serve-static` - Static file serving

## Support

If you need help customizing the OG images or encounter issues, check:
1. NestJS documentation: https://docs.nestjs.com
2. Sharp documentation: https://sharp.pixelplumbing.com
3. Open Graph protocol: https://ogp.me

---

**Implementation Date**: February 4, 2026
**Status**: ✅ Complete and Ready to Test