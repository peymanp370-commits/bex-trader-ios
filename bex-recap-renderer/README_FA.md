# BEX Notification Full Patch

## Frontend files
1) Copy `public/service-worker.js` to `asli 8/public/service-worker.js`
2) Copy `src/app/utils/push.ts` to `asli 8/src/app/utils/push.ts`
3) Replace `asli 8/src/app/pages/Welcome.tsx` with patched `src/app/pages/Welcome.tsx`
4) Add env vars from `.env.example`
5) Run `npm run build` and redeploy Pages.

## Cloudflare Push Worker
1) Create D1 database: `wrangler d1 create bex_push_db`
2) Put database_id in `cloudflare-worker/wrangler.toml`
3) Install deps: `npm install`
4) Generate keys: `npm run vapid`
5) Set secrets:
   - `wrangler secret put VAPID_PUBLIC_KEY`
   - `wrangler secret put VAPID_PRIVATE_KEY`
   - `wrangler secret put VAPID_SUBJECT` value: `mailto:support@bextrader.com`
   - `wrangler secret put PUSH_SEND_SECRET`
6) Apply schema: `wrangler d1 execute bex_push_db --file=./schema.sql --remote`
7) Deploy: `npm run deploy`

## Signal Engine call
When a real trade signal is approved, call:

await fetch('https://bex-push.YOUR-SUBDOMAIN.workers.dev/send', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-bex-secret': env.PUSH_SEND_SECRET,
  },
  body: JSON.stringify({
    symbol: signal.symbol,
    side: signal.side,
    setup_type: signal.setup_type,
    confidence: signal.final_confidence || signal.confidence,
    entry: signal.entry,
    sl: signal.sl,
    tp: signal.tp,
    rr: signal.rr,
    signal_id: signal.signal_id,
    url: '/app',
  }),
});
