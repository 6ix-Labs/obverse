# Dynamic Social Preview Integration

## Endpoints

- `GET /preview/link/:linkCode`
- `GET /preview/receipt/:paymentId`
- `GET /preview/dashboard/:dashboardId`

All endpoints return `image/png` (`1200x630`).

### Cache headers

Responses include:

- `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=600`
- `ETag`
- `Last-Modified` (when canonical data has timestamps)

## Signed dashboard preview URLs

Dashboard previews are protected when `PREVIEW_DASHBOARD_REQUIRE_SIGNATURE=true`.

Query params:

- `expires` (unix timestamp seconds)
- `signature` (hex HMAC-SHA256)

Canonical signing string:

`/preview/dashboard/:dashboardId|:expires|:merchantId`

Where signature is:

`HMAC_SHA256(PREVIEW_SIGNING_SECRET, canonicalString)`

Maximum allowed TTL is controlled by `PREVIEW_SIGNATURE_MAX_TTL_SECONDS`.

## Frontend meta tags

Set these tags to the generated preview URLs:

- `og:image`
- `twitter:image`

Recommended fields from API responses:

- `paymentLink.previewImageUrl`
- `receipt.previewImageUrl`
- `dashboard.previewImageUrl`

## Vite integration snippets

### 1) Install head manager (React + Vite)

Use `react-helmet-async` to set social tags per route.

### 2) App root setup

Wrap your app once with `HelmetProvider`.

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<HelmetProvider>
			<App />
		</HelmetProvider>
	</React.StrictMode>,
);
```

### 3) Reusable preview meta component

```tsx
// src/components/PreviewMeta.tsx
import { Helmet } from 'react-helmet-async';

type Props = {
	title: string;
	description: string;
	pageUrl: string;
	previewImageUrl?: string;
};

export function PreviewMeta({
	title,
	description,
	pageUrl,
	previewImageUrl,
}: Props) {
	return (
		<Helmet>
			<title>{title}</title>
			<meta name="description" content={description} />

			<meta property="og:type" content="website" />
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta property="og:url" content={pageUrl} />
			{previewImageUrl && <meta property="og:image" content={previewImageUrl} />}
			{previewImageUrl && <meta property="og:image:width" content="1200" />}
			{previewImageUrl && <meta property="og:image:height" content="630" />}

			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:title" content={title} />
			<meta name="twitter:description" content={description} />
			{previewImageUrl && <meta name="twitter:image" content={previewImageUrl} />}
		</Helmet>
	);
}
```

### 4) Payment link page usage

```tsx
// src/pages/PaymentLinkPage.tsx
import { PreviewMeta } from '../components/PreviewMeta';

export function PaymentLinkPage({ data }: { data: any }) {
	const title = `Pay ${data.amount} ${data.token}`;
	const description = data.description || 'Crypto payment request';

	return (
		<>
			<PreviewMeta
				title={title}
				description={description}
				pageUrl={window.location.href}
				previewImageUrl={data.previewImageUrl}
			/>
			{/* page content */}
		</>
	);
}
```

### 5) Receipt page usage

Use `receipt.previewImageUrl` from API response directly.

### 6) Dashboard page usage

Use backend-provided signed `dashboard.previewImageUrl` directly.
Do not sign on frontend.

### 7) Important for social crawlers

Client-side Vite SPA meta tags are not always read by crawlers.
For reliable OG/Twitter previews, serve SSR/prerendered HTML or a backend HTML shell with these tags.

## Curl examples

### Link preview

`curl -i "https://api.obverse.cc/preview/link/x7k9m2"`

### Receipt preview

`curl -i "https://api.obverse.cc/preview/receipt/507f1f77bcf86cd799439013"`

### Dashboard preview (signed)

`curl -i "https://api.obverse.cc/preview/dashboard/507f1f77bcf86cd799439012?expires=1760730000&signature=<hmac>"`

## Notes

- Missing resources return branded PNG not-found images.
- Rendering errors return branded PNG fallback images by default.
- No PII/private notes are included in preview template mapping.
