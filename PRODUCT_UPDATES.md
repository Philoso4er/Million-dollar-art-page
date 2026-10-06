# Product updates — Leave Your Mark (£1 pixels)

Date: 6 October 2026 (Europe/London)

## Hard rules (unchanged)
- Every pixel costs exactly **£1**. No premium pixels, dynamic pricing, tiers, NFTs, crypto, auctions, subscriptions, memberships, or ads.
- Proposition: **1,000,000 pixels · £1 each · choose colour · leave your mark.**

## Follow-up PR — restore claim flexibility (this branch)

Restores behaviours users expected from the pre–PR #1 checkout, while keeping the new homepage (headline, live counter, grid centre).

### UX fixes
1. **Full colour picker** — native `input type="color"` + hex field (any colour). Limited swatches removed as the primary control. Colour is **required**.
2. **Richer share** — after claim and on pixel identity: native Share, X, Facebook, WhatsApp, LinkedIn, Copy link (not X-only).
3. **Multi-pixel selection** — tap free pixels to add/remove; bottom bar shows selection chips; **Buy Now — £N** (£1 × count). Modal supports **Same colour & link** or **Individual settings** (per-pixel colour + link).
4. **Optional purchase fields** — name, optional message, optional redirect/hover link. **Only colour is required.**

### API
- `api/orders.js`: owner no longer required; colour required (sync or per individual row). Added `confirm-redirect` for Stripe redirect methods.
- `api/create-payment-intent.js`: surface Supabase connectivity errors as 503 instead of masking as “Order not found”.

## Stripe / Supabase payment diagnosis (6 Oct 2026)

Live probes against `https://pixelartgrid.vercel.app` (no secrets printed):

| Check | Result |
|-------|--------|
| Client Stripe publishable key in live JS bundle | **Present** (`pk_live_…` embedded — Vite build has `VITE_STRIPE_PUBLISHABLE_KEY`) |
| `POST /api/create-payment-intent` missing secret? | Does **not** return “missing STRIPE_SECRET_KEY” → server **likely has** `STRIPE_SECRET_KEY` |
| `GET /api/pixels` | **500** repeatedly: `{"error":"TypeError: fetch failed"}` → Supabase client is configured but **cannot reach the project** (classic paused / unreachable Supabase) |
| `POST /api/orders?action=create` (with colour) | Same Supabase **fetch failed** once past validation |
| Local `.env.local` | Has Supabase + legacy Flutterwave/PayPal keys; **no** `VITE_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` |
| `confirm-redirect` | Was called from the client after redirect payments but **was not implemented** until this PR |

### Likely root cause of “payment not working”
1. **Supabase project paused or unreachable** from Vercel — order create + pixel load fail before Stripe Elements can charge. Unpause/restore the Supabase project and confirm `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on Vercel match it.
2. After Supabase is healthy: verify Stripe webhook endpoint `https://pixelartgrid.vercel.app/api/stripe-webhook` is registered and `STRIPE_WEBHOOK_SECRET` is set (pixels mark `sold` via webhook / `confirm-stripe` / `confirm-redirect`).
3. Local preview of real checkout also needs Stripe keys added to `.env.local` (do not commit).

No secrets were committed or invented.

## Env vars expected (do not commit secrets)
**Client (Vite):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`  
**Server:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`  
Optional alias: `SUPABASE_URL` (server falls back to `VITE_SUPABASE_URL`).

## How to run locally
```bash
cd Million-dollar-art-page
npm install
npm run build
npm run dev
```

## TODO — NEXT
- Activity feed, recently claimed, leaderboard, FAQ
- Pixel Card image download
- Build Something / draw mode
