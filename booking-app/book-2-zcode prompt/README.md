# QueenG Braids & Essentials - Booking App

A professional booking application for braiding services built with Next.js 14, Supabase, and Stripe.

## Features

### Storefront
- Landing page with hero, value proposition, and CTA
- Services catalog with pricing and duration
- Portfolio gallery with filtering
- About page with artist bio
- Testimonials/reviews
- FAQ
- Contact form with location and hours

### Booking Engine
- Service and tier selection
- Live availability calendar
- Client intake form with inspiration photo upload
- Stripe deposit checkout with tax calculation
- Appointment confirmation workflow

### Client Experience
- Account creation via magic link
- View upcoming and past appointments
- Appointment history

### Admin Dashboard
- Pending approval queue
- Booking management
- Status updates (confirm, decline, complete)

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe (deposits + refunds + webhooks)
- **Email:** Resend
- **SMS:** Twilio
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Stripe account
- Resend API key
- Twilio account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

4. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL migrations in `supabase/schema.sql`
   - Run the RLS policies in `supabase/rls.sql`
   - Update `.env.local` with your Supabase URL and keys

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Database Setup

1. Go to Supabase SQL Editor
2. Run `supabase/schema.sql` to create tables
3. Run `supabase/rls.sql` to set up row-level security
4. Run `npm run db:seed` to populate sample data

### Stripe Setup

1. Get your API keys from Stripe Dashboard
2. Set up webhook endpoint pointing to `/api/webhooks/stripe`
3. Add webhook secret to `.env.local`

### Email Setup (Resend)

1. Create a Resend account
2. Get your API key
3. Add to `.env.local`

### SMS Setup (Twilio)

1. Create a Twilio account
2. Get your Account SID, Auth Token, and Phone Number
3. Add to `.env.local`

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   ├── appointments/
│   │   ├── availability/
│   │   ├── cron/
│   │   └── webhooks/
│   ├── account/
│   ├── admin/
│   ├── book/
│   ├── faq/
│   ├── portfolio/
│   └── services/
├── components/
│   └── ui/
├── lib/
├── types/
└── hooks/
```

## API Routes

- `POST /api/appointments` - Create appointment
- `GET /api/appointments` - Get appointment details
- `GET /api/availability` - Get available time slots
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `GET /api/admin/appointments` - List appointments (admin)
- `PATCH /api/admin/appointments` - Update appointment status
- `POST /api/cron/reminders` - Send reminders

## License

MIT
