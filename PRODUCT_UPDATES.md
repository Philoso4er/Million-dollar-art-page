# Product updates — Leave Your Mark (£1 pixels)

Date: 6 October 2026 (Europe/London)

## Hard rules (unchanged)
- Every pixel costs exactly **£1**. No premium pixels, dynamic pricing, tiers, NFTs, crypto, auctions, subscriptions, memberships, or ads.
- Proposition: **1,000,000 pixels · £1 each · choose colour · leave your mark.**

## Audit summary (before changes)

| Area | Status |
|------|--------|
| Interactive canvas grid (zoom) | ✅ Existed in `PixelApp.tsx` |
| Pan / game-like navigation | ⚠️ Scroll-only; improved with drag-pan + wheel zoom |
| Click free pixel → buy | ⚠️ Multi-select bar first; now opens claim flow immediately |
| Colour picker | ✅ Existed |
| Owner name + optional message | ❌ Had URL “link” field instead |
| £1 Stripe checkout | ✅ Wired (`/api/create-payment-intent`, webhook) |
| Live claimed counter | ⚠️ Header only; now prominent hero counter + remaining |
| “What am I getting?” | ❌ Missing; added |
| Pixel identity (owner / colour / date / message) | ❌ Missing; added via JSON in `pixels.link` |
| Shareable `/pixel/:id` | ❌ Missing; stubbed (hash-free path + Vercel rewrite) |
| Post-purchase share | ✅ Existed; improved with identity + pixel URL |
| Mobile | ⚠️ Partial; bottom sheets, touch pan, tighter header |

Legacy unused files still present: `components/PixelGrid.tsx`, `components/PaymentModal.tsx` (older Flutterwave-oriented UI). Live UI is entirely in `PixelApp.tsx`.

## What we changed (MUST DO)

1. **Homepage centres on the grid** with positioning:
   - Headline: **LEAVE YOUR MARK ON THE INTERNET.**
   - Subcopy: 1,000,000 pixels · £1 each · Choose a pixel. Choose its colour. Leave your mark.
2. **Interactive grid**: zoom buttons, scroll-wheel zoom, drag-to-pan, click/tap free pixel → claim.
3. **Simple claim flow** (inline modal, not multi-page): colour → name/username → optional message → **CLAIM PIXEL — £1** → Stripe (or demo preview if Stripe env missing).
4. **“What am I getting?”** panel (5 steps + what you receive) beside / under the CTA and inside the claim modal.
5. **Pixel identity** after claim / on sold pixels: id, owner, colour, claimed date, message; shareable route **`/pixel/:id`** (opens identity modal).
6. **Optional messages** in the claim form (max 280 chars).
7. **Live counter**: `X / 1,000,000 PIXELS CLAIMED` + remaining + progress bar (fed from sold pixels via `/api/pixels`).
8. **Confirmation / share**: success screen with pixel card basics, X / WhatsApp / Facebook / copy link / native share.
9. **Mobile**: sticky compact header, bottom-sheet modals, touch-friendly controls, `viewport-fit=cover`.

Owner + message are stored in the existing `pixels.link` column as JSON  
`{"owner":"…","message":"…","url":""}` so no Supabase migration is required. Legacy plain URLs still parse.

## Files touched
- `PixelApp.tsx` — main UX rewrite
- `types.ts` — `owner` / `message`, `encodePixelMeta` / `parsePixelMeta` / `enrichPixel`
- `api/orders.js` — requires owner; stores meta JSON
- `api/stripe-webhook.js` — assigns meta JSON on payment success
- `src/lib/loadPixels.ts` — enrich pixels
- `src/env.d.ts` — Stripe publishable key typing
- `index.html` — title / meta / viewport
- `vercel.json` — SPA rewrites for `/pixel/:id`
- `PRODUCT_UPDATES.md` — this file

## How to run locally
```bash
cd Million-dollar-art-page
npm install
npm run dev          # Vite on http://localhost:3000
npm run build        # production build
```

API routes (`/api/*`) need Vercel (or similar) serverless hosting. For full checkout locally you typically use `vercel dev` with secrets set.

## Env vars expected (do not commit secrets)
**Client (Vite):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`  
**Server:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`  
Legacy Flutterwave/PayPal keys may still exist in `.env.local` but the live claim path is Stripe.

## Blockers
- **GitHub push**: `gh` not authenticated — do not push from this agent.
- **Stripe**: if `VITE_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` are missing, the UI shows a demo success preview instead of charging.
- **Supabase**: pixel load/checkout need working URL + service role on the deployment.
- **Optional DB columns**: if you later want first-class `owner` / `message` / `claimed_at` columns, migrate and stop encoding into `link`.

## TODO — NEXT (not implemented)
- Recent activity feed (“someone in London claimed…”)
- Recently claimed / “People who were here” strip
- Leaderboard (most pixels — still £1 each)
- FAQ section on homepage
- Personal pixel page polish (dedicated layout, OG tags)
- Shareable Pixel Card image download
- Build Something / draw mode
- Community challenges, country stats, sold-out experience

## Suggested next PR step
1. Add `VITE_STRIPE_PUBLISHABLE_KEY` to local + Vercel env (keep secrets out of git).
2. Deploy and smoke-test: tap free pixel → claim → Stripe test card → `/pixel/:id` shows owner/message.
3. Follow-up PR: activity feed + FAQ + Pixel Card image (NEXT list).
