BEX VIP ROLE / CUSTOMER STATS CORRECT PATCH

این patch روی source اصلی asli 8 ساخته شده و worker جدید جدا نمی‌سازد؛ همان auth worker فعلی را توسعه می‌دهد.

فایل‌های تغییر کرده:
- worker/index.js
- src/app/utils/api.ts
- src/app/routes.tsx
- src/app/components/SideMenu.tsx
- src/app/components/BottomNav.tsx

فایل‌های جدید:
- src/app/pages/MyStats.tsx
- src/app/pages/VIPAutoTrading.tsx
- src/app/pages/Admin.tsx

Route ها:
- /app/stats      آمار عمومی BEX برای جذب مشتری
- /app/my-stats   آمار شخصی customer از MT5 account خودش
- /app/vip-auto   token + MT5 account همان customer
- /app/admin      پنل admin برای role=admin

API های اضافه‌شده روی auth worker:
- GET  /api/me
- GET  /api/me/vip
- POST /api/me/mt5-account
- GET  /api/me/trades
- GET  /api/me/stats
- GET  /api/admin/customers
- POST /api/admin/customer/upgrade-vip
- POST /api/admin/customer/disable-token

Cloudflare binding لازم برای auth worker:
DB     -> bex_app_prod
MT5_DB -> bex_mt5_history

Deploy:
1) فایل‌های patch را روی source اصلی replace کن.
2) در auth worker binding D1 جدید اضافه کن:
   binding name: MT5_DB
   database: bex_mt5_history
3) داخل worker فولدر:
   npx wrangler deploy
4) داخل app:
   npm run build
5) Pages را deploy کن.

امنیت:
Customer هیچوقت account_login برای history ارسال نمی‌کند. Backend از session -> user_id -> vip_tokens -> mt5_account_login پیدا می‌کند.
