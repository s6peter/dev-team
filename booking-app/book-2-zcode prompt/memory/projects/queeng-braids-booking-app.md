# QueenG Braids & Essentials Booking App

## Location
`/home/persoba/v-projects/dev-team/booking-app/book-2-zcode prompt`

## Purpose
Mobile-first booking and business-management app for QueenG Braids. Customers can browse services, choose variants, reserve an appointment slot, pay a deposit through Stripe, manage/cancel/reschedule, join a waitlist, view portfolio/services, and shop accessories. Admin/staff users manage bookings, calendar, services, products, portfolio, clients, analytics, staff, earnings, payouts, settings, and time clock.

## Architecture
- Next.js 14 App Router with TypeScript and Tailwind.
- Supabase handles Postgres, Auth, Storage, RLS, migrations, seed data, admin/service-role writes.
- Stripe handles booking deposits, shop checkout, webhooks, refunds, and Connect/payout-related flows.
- Resend and Twilio are wired for transactional email/SMS, with local/dev fallback logging.
- Money is integer cents everywhere.
- Booking flow is two-phase: hold slot, collect Stripe deposit, then materialize a pending appointment after verified payment.

## Important Files
| Path | Why It Matters |
|------|----------------|
| `PROJECT-STATUS.md` | Best current handoff/status summary; read first |
| `README.md` | Local dev, architecture, routes, credentials |
| `skills` | Product/design implementation plan |
| `src/app/book/page.tsx` | Customer booking wizard |
| `src/app/admin/page.tsx` | Admin entry/auth and dashboard composition |
| `src/app/admin/AdminDashboard.tsx` | Admin/staff dashboard navigation and role gating |
| `src/app/api/bookings/hold/route.ts` | Slot hold and Stripe deposit creation |
| `src/app/api/bookings/confirm/route.ts` | Payment verification to create pending booking |
| `src/app/api/webhooks/stripe/route.ts` | Signed Stripe webhook handling |
| `src/lib/booking.ts` | Booking materialization/refund logic |
| `src/lib/pricing.ts` | Pricing/deposit calculations in TypeScript |
| `src/lib/stripe.ts` | Server Stripe client |
| `src/lib/connect.ts` | Stripe Connect helpers |
| `src/lib/payouts.ts` | Commission/payout calculations |
| `src/lib/shop.ts` | Idempotent shop order payment/stock handling |
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
1. Read `PROJECT-STATUS.md`, `README.md`, and this file.
2. Run `git status --short` and assume dirty files may belong to Claude/user.
3. Inspect the exact feature area before editing.
4. Start/restart local app only when needed: `npm run dev`.
5. For payment testing, keep Stripe listener running to `localhost:3456/api/webhooks/stripe` and use test card `4242 4242 4242 4242`.
6. Run focused verification for the touched area; for broader changes use `node scripts/e2e.mjs`, `node scripts/e2e-features.mjs`, and/or build.

## User Intent Notes
- The user wants Codex to understand this project well enough to answer project questions and continue coding from where Claude stops.
- When the user asks "continue that project", first determine what changed since this memory was written, then pick up from the current code and `PROJECT-STATUS.md`.
