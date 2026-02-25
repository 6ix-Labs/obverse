export type ShareHtmlData = {
    title: string;
    description: string;
    pageUrl: string;
    imageUrl: string;
    redirectUrl: string;
    statusCode?: number;
};

function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildShareHtml(data: ShareHtmlData): string {
    const title = escapeHtml(data.title);
    const description = escapeHtml(data.description);
    const pageUrl = escapeHtml(data.pageUrl);
    const imageUrl = escapeHtml(data.imageUrl);
    const redirectUrl = escapeHtml(data.redirectUrl);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${redirectUrl}">${redirectUrl}</a>...</p>
  <script>
    window.location.replace(${JSON.stringify(data.redirectUrl)});
  </script>
</body>
</html>`;
}
