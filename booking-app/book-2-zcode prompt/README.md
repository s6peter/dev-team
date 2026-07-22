# QueenG Braids & Essentials — Booking App

A modern, mobile-first booking application for a solo braiding stylist, built on a real
Supabase + Stripe backend. Guest checkout, deposit-gated bookings with concurrency-safe
scheduling, a stylist approval workflow, automated reminders, and a full admin dashboard.

See [`skills`](./skills) for the full implementation plan and the research behind the
feature set (benchmarked against Fresha, Booksy, GlossGenius, Vagaro, Square, StyleSeat,
Acuity, and Mangomint).

## Highlights

- **Guest-friendly, mobile-first booking wizard** — pick style → size/length/add-ons →
  duration-aware calendar → intake + photo upload → Stripe deposit. Prices shown up front.
- **Deposit + no-show protection** — deposit charged online (tax included), balance paid in
  person; consented cancellation policy; auto-refund on decline.
- **Concurrency-safe scheduling** — a Postgres `btree_gist` exclusion constraint plus a
  transactional slot-hold RPC make double-booking impossible, even under race conditions.
- **Approval workflow** — paying the deposit creates a **pending** appointment; the stylist
  confirms or declines (decline auto-refunds). Payment never auto-confirms.
- **Real auth + security** — Supabase Auth (magic link for clients, password for admin),
  RLS on every table, service-role writes only on the server. No client PII is public.
- **Automated notifications** — confirmation + 24h + 2h reminders and post-visit review
  requests via Resend (email) + Twilio (SMS), idempotent so nothing sends twice.
- **Admin dashboard** — pending queue, stats, status management, review moderation.
- **Storefront** — DB-driven services & portfolio, live reviews, SEO (metadata, sitemap,
  robots, `HairSalon` JSON-LD), accessible components.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + Storage) ·
Stripe (Payment Elements + webhooks) · Resend · Twilio · Vercel (hosting + cron).

## Local development

Requires **Docker** (for the Supabase stack) and **Node 18+**.

```bash
npm install

# 1. Start the local Supabase stack (Postgres + Auth + Storage + Studio).
#    Applies supabase/migrations + supabase/seed.sql automatically.
npm run supabase:start

# 2. Create the storage bucket + admin user, and (re)generate DB types.
npm run setup:local
npm run db:types            # optional; regenerate src/types/database.types.ts

# 3. Copy env and fill in keys (local Supabase keys come from `npx supabase status`).
#    .env.local already contains local Supabase keys + Stripe TEST keys for dev.

# 4. Run the app.
npm run dev                 # http://localhost:3456
```

Reset the database (re-run migration + seed) with `npm run db:reset`, then
`npm run setup:local` again.

### Local logins

- **Admin** → `/admin` · `queengbraids@gmail.com` / `QueenG!admin2026`
- **Client** → `/login` · magic link. In local dev the email lands in **Mailpit**
  at http://localhost:54324 (open it and click the link).

### Local services

| Service | URL |
|---|---|
| App | http://localhost:3456 |
| Supabase Studio | http://localhost:54323 |
| Mailpit (email inbox) | http://localhost:54324 |
| Supabase API | http://localhost:54321 |

### Testing payments

Stripe is in **test mode**. Use card `4242 4242 4242 4242`, any future expiry, any CVC.
The booking is confirmed after payment via `/api/bookings/confirm` (server-verifies the
PaymentIntent) and, in production, redundantly via the Stripe webhook.

## Architecture notes

- **Money is integer cents everywhere** (DB, Stripe, and `src/lib/pricing.ts`), one source
  of truth. Deposit = `depositPercent × (serviceTotal + tax)`; balance = untaxed remainder.
- **Booking is two-phase**: `hold_slot()` reserves the range + stashes the payload and
  creates a Stripe PaymentIntent; on payment success `confirm_booking_from_hold()`
  materializes a pending appointment. Abandoned checkouts simply let the hold's TTL expire —
  no orphaned appointments block the calendar.
- **Three Supabase clients**: `browser` (anon, RLS), `server` (SSR cookies, RLS as the
  user), `admin` (service role, server-only, for privileged writes).
- **Timezone-safe** date/time logic in `src/lib/time.ts` (salon TZ = America/Chicago).

## Deploying (Vercel + hosted Supabase)

1. Create a hosted Supabase project; push `supabase/migrations` + run `supabase/seed.sql`.
2. Set env vars on Vercel (Supabase URL/anon/service-role, Stripe live/test keys +
   webhook secret, Resend + Twilio, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STYLIST_ID`,
   `CRON_SECRET`).
3. Add the Stripe webhook endpoint → `/api/webhooks/stripe`.
4. `vercel.json` already schedules the reminders/cleanup cron every 15 minutes.

## Key API routes

| Route | Purpose |
|---|---|
| `GET /api/catalog` | Public services + tiers + policy + open days |
| `GET /api/availability` | Duration-aware open slots for a date |
| `POST /api/bookings/hold` | Reserve slot + create deposit PaymentIntent |
| `POST /api/bookings/confirm` | Verify payment → materialize pending appointment |
| `POST /api/webhooks/stripe` | Signed, idempotent payment events |
| `GET/PATCH /api/admin/appointments` | Admin queue + confirm/decline/complete/etc. |
| `GET/PATCH /api/admin/reviews` | Review moderation |
| `POST /api/account/cancel` | Client self-service cancel (policy-aware refund) |
| `POST /api/reviews` · `POST /api/waitlist` · `POST /api/upload` · `POST /api/contact` | Reviews, waitlist, photo upload, contact form |
| `POST /api/cron/reminders` | Idempotent reminders + review requests + hold cleanup |

## License

MIT
