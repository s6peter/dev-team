# QueenG Braids — Project Status & Handoff

A Next.js 14 (App Router) + TypeScript + Tailwind salon booking app on a real Supabase
(Postgres/Auth/Storage) + Stripe (test mode) backend. This file is the single place to see
**what's built, what's partial, and how to continue**. Design spec lives in [`skills`](./skills)
(sections v1–v5). Brand palette: **blush pink** (`brand-50…900`, Tailwind) + **black**.

## Repository layout (npm-workspaces monorepo)
```
queeng-braids-monorepo/            # root: npm workspaces ["apps/*","packages/*"]
├── apps/web/                      # @queeng/web — the Next.js app (pages + API routes)
│   └── src/{app,components?,lib}  #   app/=routes+api; lib/=site.ts; types/=index.ts
├── packages/                      # domain "services" (extracted, resolved via tsconfig paths)
│   ├── db/            # @queeng/db — supabase clients + database.types
│   ├── booking/      # @queeng/booking — booking, pricing, reschedule, availability, time, waitlist, catalog, notify-appointment
│   ├── payments/     # @queeng/payments — stripe, stripe-client, connect, payouts
│   ├── shop/         # @queeng/shop — shop order/stock logic
│   ├── notifications/# @queeng/notifications — email, sms, notifications, notification-log
│   ├── staff/        # @queeng/staff — auth / admin identity
│   └── ui/           # @queeng/ui — components/ + utils
├── supabase/  scripts/  business-info/  .env.local   # shared infra/tooling (root)
```
Imports are **unchanged** (`@/lib/*`, `@/components/*`, `@/types/*`) — `apps/web/tsconfig.json`
`paths` alias them to the packages, so Next resolves them at build + runtime with **no code
rewrites**. Run everything from the repo **root** (`npm run dev`, `node scripts/e2e.mjs`) — the
root package.json orchestrates the `@queeng/web` workspace and the supabase/db scripts.
(For Vercel: set the project root to `apps/web`.)

## How another tool / developer picks up
1. `supabase start` (Docker) — local Postgres + Auth + Storage.
2. Apply schema: migrations run in order from `supabase/migrations/`; seed from `supabase/seed.sql`
   (`supabase db reset` does both — **destructive**, wipes data).
3. `node scripts/setup-local.mjs` — creates storage buckets + auth users (owner + Bianca) and links them.
4. `npm run dev` (serves on **:3456**). Admin login: `queengbraids@gmail.com` / `QueenG!admin2026` (owner);
   `bianca@queengbraids.com` / `Bianca!staff2026` (stylist).
5. Tests: `node scripts/e2e.mjs` (money/booking paths) and `node scripts/e2e-features.mjs`.
   Production build **without touching the running dev server**: `cd apps/web && NEXT_DIST_DIR=.next-check npx next build`.
6. Catalog data source of truth: `business-info/catalog.json` → `scripts/build-catalog.mjs` generates SQL.
7. Money is **integer cents** everywhere; `packages/booking/src/pricing.ts` mirrors the SQL in `hold_slot()`.

## Feature status

| # | Feature | Status | Key files |
|---|---------|--------|-----------|
| 1 | Grouped catalog booking (4 tiles → service dropdown → size/length variant → Book Now) | ✅ Done | `src/app/book/page.tsx`, `src/app/api/catalog`, `20260731000000_grouped_catalog.sql` |
| 2 | Deposit (configurable in Settings, propagates everywhere; tax on deposit only; balance in person) | ✅ Done | `src/app/api/admin/settings`, `src/lib/pricing.ts`, `hold_slot` |
| 3 | Custom Styles flow (deposit + optional photo + salon phone, deposit-only) | ✅ Done | `src/app/book/page.tsx`, `hold_slot` (kind='custom') |
| 4 | Concurrency-safe hold → Stripe deposit → **pending** → owner confirm/decline (auto-refund) | ✅ Done | `src/app/api/bookings/*`, `src/lib/booking.ts`, `src/app/api/webhooks/stripe` |
| 5 | Admin catalog CRUD — groups / services / variants | ✅ Done | `src/app/admin/AdminServices.tsx`, `src/app/api/admin/{groups,services,variants}` |
| 6 | Calendar (day/week/month, drag-reschedule, fees, charge balance + tip) | ✅ Done | `src/app/admin/AdminCalendar.tsx`, `src/app/api/admin/{appointments,fees,charge-balance}` |
| 7 | Reschedule / cancel (client, guest-link, admin) + client notifications | ✅ Done | `src/lib/reschedule.ts`, `src/lib/notify-appointment.ts`, `src/app/api/{manage,account}` |
| 8 | Reminders cron (24h/2h) + review request; idempotent | ✅ Done (dev logs) | `src/app/api/cron/reminders` |
| 9 | Clients CRM, Analytics + CSV, Waitlist auto-fill, Recurring, Reviews, Portfolio | ✅ Done | `src/app/admin/Admin{Clients,Analytics,Waitlist,Portfolio}.tsx`, `src/lib/waitlist.ts` |
| 10 | Multi-staff (per-stylist catalog via `clone_catalog`, RLS by `stylist_id`, stylist picker) | ✅ Done | `20260729000000_multi_staff.sql`, `20260733000000_clone_catalog.sql`, `src/app/api/stylists` |
| 11 | Roles — owner sees all; stylist sees **only Calendar + Earnings** (view-only, no client email/phone/money) | ✅ Done | `src/app/admin/AdminDashboard.tsx`, `AdminCalendar.tsx`, `src/app/api/admin/appointments` |
| 12 | Commission (default 55%, editable/stylist) + W2 withholding | ✅ Done | `src/app/admin/AdminStaff.tsx`, `src/lib/payouts.ts`, `20260734000000_payroll.sql` |
| 13 | Earnings + statements (style+variant, calc, weekly/monthly, CSV) | ✅ Done | `src/app/admin/AdminEarnings.tsx`, `src/app/api/admin/earnings` |
| 14 | Payouts — Stripe Connect (Express) bank link + transfers, or mark-paid; idempotent | ⚠️ Done (TEST mode) | `src/app/admin/AdminPayouts.tsx`, `src/lib/connect.ts`, `src/app/api/admin/{payouts,connect}` |
| 15 | Geofenced time clock + owner timesheets + workplace location | ✅ Done | `src/app/admin/{ClockWidget,AdminTimesheets}.tsx`, `src/app/api/admin/timeclock`, `20260736000000_timeclock.sql` |
| 16 | First-login password change; suspend/disable stylist; staff avatar upload | ✅ Done | `src/app/admin/{ChangePassword,AdminStaff}.tsx`, `20260737000000_suspend_stylist.sql` |
| 17 | Phone required at booking (client + server) | ✅ Done | `src/app/book/page.tsx`, `src/app/api/bookings/hold` |
| 18 | Security: RLS by stylist_id; `guard_stylist_owner_flag` trigger (owner/commission/payout/geofence/active server-only) | ✅ Done | `20260730000000_multi_staff_security.sql`, `20260734/36/37…` |
| 19 | Home page redesign (logo in header+hero, work-sample slideshow, Shop entry) | ✅ Done* | `src/app/page.tsx`, `src/components/Slideshow.tsx`, `public/logo.png` |
| 20 | Shop accessories (products, cart, Stripe checkout, orders; admin CRUD; home/nav entry) | ✅ Done | `src/app/shop/*`, `src/app/api/shop/*`, `src/app/admin/AdminProducts.tsx`, `20260738000000_shop.sql` |
| 21 | Color consistency pass (blush pink + black across all pages) | ✅ Done | all pages; `tailwind.config.ts` `brand` scale |

\* Home slideshow + shop currently show **placeholder images** (picsum/Unsplash) — replace with real photos via Admin → Portfolio (slideshow) and Admin → Shop (product images).

## Known limitations / next up
- **Email/SMS**: wired + logged to `notification_log` and console; real delivery needs `RESEND_API_KEY` / Twilio env.
- **Stripe Connect payouts** run against Stripe **test** mode; production needs live keys + Connect enabled.
- **First-login password** is enforced in the UI (`admin/page.tsx`); not yet at the API layer (an authorized stylist could call APIs with the temp password before changing it).
- Not built: Google Calendar 2-way sync (only a subscribable `.ics` feed), gift cards / packages, invoices.

## Test accounts
- Owner: `queengbraids@gmail.com` / `QueenG!admin2026`
- Stylist (demo, no forced pw change): `bianca@queengbraids.com` / `Bianca!staff2026`
- Other stylists (temp-password, forced change): Nana, Takyiwaa, sam.
