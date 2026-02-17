import * as dotenv from 'dotenv';
dotenv.config();

export default () => ({
  port: process.env.PORT || 4000,
  db_url: process.env.MONGODB_URI,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  PARA_API_KEY: process.env.PARA_API_KEY,
  PARA_SECRET_KEY: process.env.PARA_SECRET_KEY,
  APP_URL: process.env.APP_URL || 'https://www.obverse.cc',
  DASHBOARD_URL: process.env.DASHBOARD_URL,
  preview: {
    baseUrl: process.env.PREVIEW_BASE_URL || process.env.APP_URL,
    signingSecret: process.env.PREVIEW_SIGNING_SECRET,
    dashboardRequireSignature:
      process.env.PREVIEW_DASHBOARD_REQUIRE_SIGNATURE !== 'false',
    signatureMaxTtlSeconds: Number(
      process.env.PREVIEW_SIGNATURE_MAX_TTL_SECONDS || 900,
    ),
    renderTimeoutMs: Number(process.env.PREVIEW_RENDER_TIMEOUT_MS || 3000),
    onErrorMode: process.env.PREVIEW_ON_ERROR_MODE || 'fallback-image',
    cachePublicMaxAge: Number(process.env.PREVIEW_CACHE_PUBLIC_MAX_AGE || 300),
    cacheSMaxAge: Number(process.env.PREVIEW_CACHE_S_MAX_AGE || 86400),
  },
});
