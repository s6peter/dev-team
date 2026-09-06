# Project Memory

## User
Persoba is building and iterating on **QueenG Braids & Essentials**, a salon booking and admin app. When the user says "this project", "booking app", "QueenG", or asks to "continue", assume the active project is this directory unless they say otherwise:

`/home/persoba/v-projects/dev-team/booking-app/book-2-zcode prompt`

## Active Project
| Name | What |
|------|------|
| **QueenG Braids & Essentials** | Next.js 14 salon booking app with Supabase, Stripe deposits, admin dashboard, multi-staff, payouts, shop, portfolio, reminders, and client self-service |

Full details: `memory/projects/queeng-braids-booking-app.md`

## Working Rules
- The user may have Claude working in this same directory. Treat uncommitted changes as user/Claude work unless this agent made them.
- Do not revert, overwrite, or clean up unrelated changes without explicit permission.
- Before coding, read `PROJECT-STATUS.md`, `README.md`, and relevant files for the requested area.
- Do not print secrets from `.env.local`; only confirm masked prefixes like `sk_test_...`, `pk_test_...`, `whsec_...`.
- Local app port is `3456`; current admin URL is usually `http://localhost:3456/admin`.

## Stack
| Area | Tooling |
|------|---------|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind |
| Backend | Next API routes, Supabase Postgres/Auth/Storage |
| Payments | Stripe PaymentIntent/deposit flow, webhooks, Connect test payouts |
| Messaging | Resend email, Twilio SMS |
| Testing | `node scripts/e2e.mjs`, `node scripts/e2e-features.mjs`, `npm run build` or `NEXT_DIST_DIR=.next-check npx next build` |

## Local Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Run app on `http://localhost:3456` |
| `npm run supabase:start` | Start local Supabase stack |
| `npm run setup:local` | Create buckets/users and local setup |
| `npm run db:reset` | Destructive local DB reset and seed |
| `stripe listen --forward-to localhost:3456/api/webhooks/stripe` | Forward Stripe test webhooks locally |

## Current Notes
- Stripe local env has been configured for test mode with `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`.
- Keep booking money as integer cents and keep `src/lib/pricing.ts` aligned with SQL pricing logic.
- Payment success creates a pending appointment; stylist/owner approval is separate from payment.
