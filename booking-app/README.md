# QueenG Braids Booking App

A full local booking platform for a small salon-style service business. Customers can choose a service, pick an available staff/time slot, enter contact details, pay a required taxable deposit through Stripe test mode, and receive confirmation. Admin/staff users can manage services, availability, customers, bookings, calendar entries, waitlist requests, payments, no-show policies, and settings.

## Stack

- React, TypeScript, Tailwind CSS, Vite
- Node.js, Express, TypeScript
- PostgreSQL, Prisma ORM
- JWT auth with `ADMIN`, `STAFF`, and `CUSTOMER` roles
- Stripe test-mode PaymentIntents with a mock fallback for automated tests
- Jest + Supertest, Vitest + React Testing Library, Playwright

## Square-Style Features Included

- Branded online booking site with service categories, staff selection, availability slots, and deposit checkout
- Admin calendar, booking management, customer directory, services, availability, and dashboard reporting
- Editable cancellation, deposit, prepayment, online cancel/reschedule, no-show fee, daily appointment limit, and waitlist settings
- Custom booking questions for customer intake, stored on the booking record
- Waitlist join flow for customers and waitlist management for admin/staff
- Recurring appointment API for admin/staff scheduling
- Local notification records and console email logs for confirmations, payments, cancellations, reminders, and waitlist activity

## Local Setup

```bash
cd booking-app
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
```

Start the API and frontend:

```bash
npm run dev
```

Then open:

- Frontend: http://localhost:5174
- API health: http://localhost:4000/api/health

## Test Commands

```bash
npm run test -w apps/api
npm run test -w apps/web
npm run test:e2e -w apps/web
```

Or run everything:

```bash
npm test
```

Playwright expects the database to be migrated and seeded. If you want a clean run:

```bash
npm run db:migrate
npm run db:seed
npm run test:e2e -w apps/web
```

## Seeded Accounts

- Admin: `admin@example.com` / `Admin123!`
- Staff: `staff@example.com` / `Staff123!`

## Stripe Test Details

Set these values in `.env`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

The app creates Stripe PaymentIntents at `POST /api/payments/create-intent`, confirms successful Stripe payments through `POST /api/payments/confirm`, and keeps `POST /api/payments/webhook/test` as a local mock path for tests.

Use Stripe test card `4242 4242 4242 4242` with any future expiration, CVC, and ZIP in the local payment screen.

Deposits include configurable tax through `BusinessSettings.depositTaxRate`; the seed uses `8.25%`.

## Useful Routes

Public:

- `/`
- `/book`
- `/book/service`
- `/book/date-time`
- `/book/customer-info`
- `/book/payment`
- `/book/confirmation`

Auth:

- `/login`
- `/register`

Admin:

- `/admin/dashboard`
- `/admin/calendar`
- `/admin/bookings`
- `/admin/bookings/:id`
- `/admin/waitlist`
- `/admin/services`
- `/admin/customers`
- `/admin/availability`
- `/admin/settings`

Customer:

- `/customer/bookings`
- `/customer/bookings/:id`

## API Coverage

Implemented route groups:

- Auth: register, login, me
- Services: list, create, read, update, delete
- Availability: slot generation, create/update availability, blocked time
- Bookings: create, list, read, recurring create, reschedule, cancel, complete, no-show
- Payments: create intent, mock webhook success/failure
- Customers: list, read, update
- Dashboard: summary
- Business settings: read/update
- Waitlist: join, list, update status

## Fresh Clone Checklist

1. `cp .env.example .env`
2. `npm install`
3. `npm run db:up`
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev`
7. Visit http://localhost:5174 and log in as admin.
