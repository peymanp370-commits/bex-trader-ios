// bex-recap-renderer-worker.txt
// Cloudflare Worker: SVG -> PNG renderer for BEX Telegram visual recap
//
// REQUIRED binding on THIS worker:
//   BROWSER = Cloudflare Browser Rendering binding
//
// Endpoint:
//   POST /render
//     body: image/svg+xml
//     returns: image/png
//
// Then in Telegram report worker add Service Binding:
//   RECAP_RENDERER -> bex-recap-renderer

import puppeteer from '@cloudflare/puppeteer';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }

      if (url.pathname === '/health' || url.pathname === '/status') {
        return json({
          ok: true,
          worker: 'bex-recap-renderer',
          version: 'v1.0-svg-to-png-browser-rendering',
          has_browser_binding: !!env.BROWSER,
          endpoints: [
            '/health',
            '/render'
          ]
        });
      }

      if (url.pathname !== '/render') {
        return json({ ok: false, error: 'Not found', path: url.pathname }, 404);
      }

      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Use POST /render with SVG body.' }, 405);
      }

      if (!env.BROWSER) {
        return json({
          ok: false,
          error: 'Missing BROWSER binding. Add Cloudflare Browser Rendering binding named BROWSER.'
        }, 500);
      }

      const svg = await request.text();
      if (!svg || !svg.trim().startsWith('<?xml') && !svg.trim().startsWith('<svg')) {
        return json({ ok: false, error: 'Invalid SVG body.' }, 400);
      }

      const png = await renderSvgToPng(env, svg);

      return new Response(png, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'content-type': 'image/png',
          'cache-control': 'no-store'
        }
      });
    } catch (err) {
      return json({
        ok: false,
        error: err?.message || String(err)
      }, 500);
    }
  }
};

async function renderSvgToPng(env, svg) {
  const browser = await puppeteer.launch(env.BROWSER);
  let page;

  try {
    page = await browser.newPage();

    await page.setViewport({
      width: 1024,
      height: 1024,
      deviceScaleFactor: 2
    });

    const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 1024px;
      height: 1024px;
      background: #000;
      overflow: hidden;
    }
    img {
      display: block;
      width: 1024px;
      height: 1024px;
    }
  </style>
</head>
<body>
  <img src="${dataUri}" width="1024" height="1024" />
</body>
</html>`;

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      omitBackground: false
    });

    return screenshot;
  } finally {
    try {
      if (page) await page.close();
    } catch (_) {}
    try {
      await browser.close();
    } catch (_) {}
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
