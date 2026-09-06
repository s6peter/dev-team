# QueenG Braids & Essentials Booking App

## Location
`/home/persoba/v-projects/dev-team/booking-app/book-2-zcode prompt`

## Purpose
Mobile-first booking and business-management app for QueenG Braids. Customers can browse services, choose variants, reserve an appointment slot, pay a deposit through Stripe, manage/cancel/reschedule, join a waitlist, view portfolio/services, and shop accessories. Admin/staff users manage bookings, calendar, services, products, portfolio, clients, analytics, staff, earnings, payouts, settings, and time clock.

## Architecture
- npm-workspaces monorepo: `apps/web` contains the Next.js 14 App Router app; `packages/*` contains domain modules consumed through `apps/web/tsconfig.json` path aliases.
- Supabase handles Postgres, Auth, Storage, RLS, migrations, seed data, admin/service-role writes via `packages/db`.
- Stripe handles booking deposits, shop checkout, webhooks, refunds, and Connect/payout-related flows via `packages/payments`.
- Resend and Twilio are wired for transactional email/SMS via `packages/notifications`, with local/dev fallback logging.
- Money is integer cents everywhere.
- Booking flow is two-phase: hold slot, collect Stripe deposit, then materialize a pending appointment after verified payment.

## Important Files
| Path | Why It Matters |
|------|----------------|
| `PROJECT-STATUS.md` | Best current handoff/status summary; read first |
| `README.md` | Local dev, architecture, routes, credentials |
| `skills` | Product/design implementation plan |
| `apps/web/src/app/book/page.tsx` | Customer booking wizard |
| `apps/web/src/app/admin/page.tsx` | Admin entry/auth and dashboard composition |
| `apps/web/src/app/admin/AdminDashboard.tsx` | Admin/staff dashboard navigation and role gating |
| `apps/web/src/app/api/bookings/hold/route.ts` | Slot hold and Stripe deposit creation |
| `apps/web/src/app/api/bookings/confirm/route.ts` | Payment verification to create pending booking |
| `apps/web/src/app/api/webhooks/stripe/route.ts` | Signed Stripe webhook handling |
| `apps/web/tsconfig.json` | Keeps `@/lib/*`, `@/components/*`, and `@/types/*` imports mapped into packages |
| `packages/booking/src/booking.ts` | Booking materialization/refund logic |
| `packages/booking/src/pricing.ts` | Pricing/deposit calculations in TypeScript |
| `packages/payments/src/stripe.ts` | Server Stripe client |
| `packages/payments/src/connect.ts` | Stripe Connect helpers |
| `packages/payments/src/payouts.ts` | Commission/payout calculations |
| `packages/shop/src/shop.ts` | Idempotent shop order payment/stock handling |
| `supabase/migrations/` | Database schema and RPC source of truth |

## Current Feature State
As of 2026-09-06, `PROJECT-STATUS.md` says grouped catalog booking, configurable deposits, custom styles, Stripe deposit-to-pending workflow, admin CRUD, calendar, reschedule/cancel, reminders, client CRM, analytics, waitlist, reviews, portfolio, multi-staff, staff roles, commission, earnings, payouts in test mode, geofenced time clock, password change, suspension, home redesign, shop, and color pass are mostly done.

## Known Limitations
- Real email/SMS delivery needs live `RESEND_API_KEY` and Twilio env values.
- Stripe Connect payouts are currently test-mode oriented; production requires live Stripe/Connect setup.
- First-login password change is enforced in UI, not fully at API layer.
- Google Calendar is only via `.ics`; no two-way sync yet.
- Placeholder images remain for slideshow/shop until replaced with real assets.

## Recent Observed Changes
- 2026-09-06 14:46 UTC heartbeat: Claude/user reorganized the project into an npm-workspaces monorepo. Root `package.json` is now `queeng-braids-monorepo` with workspaces `apps/*` and `packages/*`; Next app/config/public files moved under `apps/web`; shared code moved into `packages/booking`, `packages/db`, `packages/payments`, `packages/shop`, `packages/notifications`, `packages/staff`, and `packages/ui`. `PROJECT-STATUS.md` now documents this layout and says imports remain `@/...` through `apps/web/tsconfig.json` path aliases. Root scripts delegate dev/build/start/lint to `@queeng/web`; DB types now generate to `packages/db/src/database.types.ts`; production check build command is `cd apps/web && NEXT_DIST_DIR=.next-check npx next build`. The move is still uncommitted and appears as many root `src/` deletions plus new `apps/` and `packages/` paths.
- 2026-09-06 13:14 UTC heartbeat: shop category/video integration expanded beyond the earlier migration. New `/api/admin/product-categories` CRUD route manages category tiles; `AdminProducts.tsx` now mirrors service-group style category tiles, requires a category for products, supports photo + video URLs/uploads, and keeps legacy `category` text in sync with the managed category name. `/api/admin/products` accepts `categoryId` and `videoUrl`; `/api/shop` returns managed categories plus resolved product category names and `video_url`; `Storefront.tsx` renders category pills and product videos with optional image poster. `Footer.tsx`/`SITE` gained TikTok/Facebook social config. New `screenshots/v8/` has `admin-shop.png` and `storefront.png`.
- 2026-09-06 12:42 UTC heartbeat: Claude/user modified `src/app/api/admin/upload/route.ts` so admin uploads now accept images up to 8MB and short videos (`mp4`, `webm`, `mov`) up to 50MB, returning `{ url, kind }`; `scripts/setup-local.mjs` now creates the local `gallery` bucket with matching 50MB/video MIME support.
- 2026-09-06 12:42 UTC heartbeat: new migration `supabase/migrations/20260739000000_shop_categories.sql` adds managed `product_categories`, `products.category_id`, and `products.video_url`, backfills from existing product category text, and adds RLS policies. No matching admin/shop UI route changes were present in this heartbeat, so integration may still be in progress.
- 2026-09-06 11:10 UTC heartbeat: previous dirty feature batch is now committed as `dd357e4 auto-sync 2026-09-06 06:00` on `main`/`origin/main`; `git status --short -- .` is clean for the booking app directory. Overall repo still reports an unrelated modified submodule/path at `../../DL-intership/Security`.
- 2026-09-06 10:39 UTC heartbeat: Claude/user changes added a public/client page visual consistency pass (`bg-gradient-to-b from-brand-50 to-background`) across about, account, contact, FAQ, login, and guest manage pages.
- 2026-09-06 10:39 UTC heartbeat: `src/lib/shop.ts` appeared with `markShopOrderPaid()`, shared by `/api/shop/confirm` and `/api/webhooks/stripe`, to make shop payment confirmation idempotent and avoid double stock decrement when both client confirm and Stripe webhook run.
- 2026-09-06 10:39 UTC heartbeat: new `screenshots/v7/` contains `policies.png`, `portfolio.png`, and `shop.png`, likely visual verification artifacts.

## Local Setup Snapshot
- App runs on `http://localhost:3456`.
- Admin URL: `http://localhost:3456/admin`.
- Local admin from README: `queengbraids@gmail.com` / `QueenG!admin2026`.
- Demo stylist from README: `bianca@queengbraids.com` / `Bianca!staff2026`.
- `.env.local` contains real local/test secrets and must not be printed.
- Stripe test mode keys and webhook secret were configured in `.env.local`; verify by masked prefix only.

## Resume Checklist
1. Read `PROJECT-STATUS.md`, `README.md`, `CLAUDE.md`, and this file.
2. Run `git status --short` and assume dirty files may belong to Claude/user.
3. Remember current layout: app routes/components are in `apps/web`; domain logic is in `packages/*` through path aliases.
4. Start/restart local app only when needed: `npm run dev`.
5. For payment testing, keep Stripe listener running to `localhost:3456/api/webhooks/stripe` and use test card `4242 4242 4242 4242`.
6. Run focused verification for the touched area; for broader changes use `node scripts/e2e.mjs`, `node scripts/e2e-features.mjs`, and/or build.

## User Intent Notes
- The user wants Codex to understand this project well enough to answer project questions and continue coding from where Claude stops.
- When the user asks "continue that project", first determine what changed since this memory was written, then pick up from the current code and `PROJECT-STATUS.md`.
