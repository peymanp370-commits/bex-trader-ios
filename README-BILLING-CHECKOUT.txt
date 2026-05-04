# BEX Billing / Checkout Patch

این patch مرحله پرداخت پلن‌ها را کامل می‌کند.

## فایل‌ها

- `src/app/pages/VIP.tsx`  
  Pricing جدید: Basic $9.99/mo, Pro $29/mo, VIP Auto $49/mo, yearly و Lifetime.

- `src/app/pages/Checkout.tsx`  
  صفحه handoff پرداخت. وقتی کاربر Upgrade Now می‌زند، این صفحه session می‌سازد و کاربر را به checkout provider می‌فرستد.

- `src/app/routes.tsx`  
  route جدید: `/app/checkout`

- `worker/index.js`  
  auth worker جدید با API های billing:
  - `POST /api/billing/create-checkout-session`
  - `POST /api/billing/stripe-webhook`

## Cloudflare bindings لازم برای bex-auth-worker

همین‌ها باید باشند:

```text
DB     → bex_app_prod
MT5_DB → bex_mt5_history
```

## Secrets / Variables لازم برای bex-auth-worker

در Cloudflare > bex-auth-worker > Settings > Variables and Secrets اضافه کن:

```text
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_VIP_AUTO_MONTHLY=price_...
STRIPE_PRICE_VIP_AUTO_YEARLY=price_...
STRIPE_PRICE_LIFETIME=price_...
```

اختیاری:

```text
BILLING_SUCCESS_URL=https://bextrader.com/app/checkout?success=1
BILLING_CANCEL_URL=https://bextrader.com/app/vip?cancelled=1
STRIPE_AUTOMATIC_TAX=1
```

## Stripe products/prices که باید بسازی

```text
Basic monthly: $9.99 recurring monthly
Basic yearly:  $79 recurring yearly
Pro monthly:   $29 recurring monthly
Pro yearly:    $249 recurring yearly
VIP monthly:   $49 recurring monthly
VIP yearly:    $399 recurring yearly
Lifetime:      $799 one-time
```

## Webhook URL

در Stripe webhook endpoint این URL را بگذار:

```text
https://auth.bextrader.com/api/billing/stripe-webhook
```

یا اگر direct worker را تست می‌کنی:

```text
https://bex-auth-worker.peymanp370.workers.dev/api/billing/stripe-webhook
```

Event اصلی که لازم است:

```text
checkout.session.completed
```

## Logic بعد از پرداخت

- Basic → `users.plan = basic`
- Pro → `users.plan = pro`
- VIP Auto → `users.plan = vip_auto` و token ساخته/فعال می‌شود
- Lifetime → برای سازگاری با workerهای auto trading، `users.plan = vip_auto` می‌ماند ولی `user_billing.plan = lifetime` و `vip_tokens.plan = LIFETIME` ذخیره می‌شود.

## تست سریع بعد deploy

```powershell
curl https://bex-auth-worker.peymanp370.workers.dev/health
```

باید داخل endpoints این‌ها را ببینی:

```text
POST /api/billing/create-checkout-session
POST /api/billing/stripe-webhook
```

از داخل app وقتی login هستی:

```text
/app/vip → Upgrade Now → /app/checkout → checkout provider
```
