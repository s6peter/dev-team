import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import Stripe from "stripe";
import { z } from "zod";
import { BookingStatus, NotificationType, PaymentStatus, Role, WaitlistStatus } from "@prisma/client";
import { availabilitySchema, bookingSchema, loginSchema, registerSchema, serviceSchema } from "@booking/shared";
import { prisma } from "./lib/prisma.js";
import { hashPassword, signToken, verifyPassword } from "./lib/auth.js";
import { addMinutes, dollars, minutesFromTime, rangesOverlap, setMinutesOnDate } from "./lib/dates.js";
import { createNotification } from "./lib/notifications.js";
import { authenticate, requireRole } from "./middleware/auth.js";
import { AppError, errorHandler } from "./middleware/error.js";

const app = express();
const asyncRoute = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_USE_MOCK !== "true" && !process.env.STRIPE_SECRET_KEY.includes("mock")
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(cors({
  origin(origin, callback) {
    const allowed = [process.env.WEB_ORIGIN, "http://localhost:5174", "http://127.0.0.1:5174"].filter(Boolean);
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "test" ? "tiny" : "dev"));

function publicBookingInclude() {
  return { service: true, staff: { include: { user: true } }, customer: true, payment: true };
}

async function getSettings() {
  return prisma.businessSettings.findFirstOrThrow();
}

function paramId(req: express.Request) {
  const value = req.params.id;
  if (typeof value !== "string") throw new AppError(400, "Invalid id");
  return value;
}

async function markBookingPayment(bookingId: string, paid: boolean) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { customer: true } });
  await prisma.payment.update({ where: { bookingId: booking.id }, data: { status: paid ? PaymentStatus.PAID : PaymentStatus.FAILED } });
  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: paid ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT }, include: publicBookingInclude() });
  if (paid) {
    await createNotification(NotificationType.PAYMENT_CONFIRMATION, booking.customer.email, "Your deposit payment was received.", booking.id);
    await createNotification(NotificationType.BOOKING_CONFIRMATION, booking.customer.email, "Your appointment is confirmed.", booking.id);
  }
  return updated;
}

async function ensureNoConflict(staffId: string, startTime: Date, endTime: Date, excludingBookingId?: string) {
  const conflicts = await prisma.booking.findMany({
    where: {
      staffId,
      id: excludingBookingId ? { not: excludingBookingId } : undefined,
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    }
  });
  if (conflicts.length) throw new AppError(409, "Time slot is already booked");
}

async function assertSlotAllowed(serviceId: string, staffId: string, startTime: Date, excludingBookingId?: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  const settings = await getSettings();
  const dayOfWeek = startTime.getDay();
  const availability = await prisma.availability.findFirst({ where: { staffId, dayOfWeek } });
  if (!availability) throw new AppError(400, "Staff is not available that day");
  const endTime = addMinutes(startTime, service.durationMinutes);
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  if (startMinutes < minutesFromTime(availability.startTime) || endMinutes > minutesFromTime(availability.endTime)) {
    throw new AppError(400, "Booking is outside working hours");
  }
  if (availability.breakStart && availability.breakEnd) {
    const breakStart = setMinutesOnDate(startTime, minutesFromTime(availability.breakStart));
    const breakEnd = setMinutesOnDate(startTime, minutesFromTime(availability.breakEnd));
    if (rangesOverlap(startTime, endTime, breakStart, breakEnd)) throw new AppError(400, "Booking overlaps a break");
  }
  const blocked = await prisma.blockedTime.findMany({ where: { staffId, startTime: { lt: endTime }, endTime: { gt: startTime } } });
  if (blocked.length) throw new AppError(400, "Booking overlaps blocked time");
  if (settings.dailyAppointmentLimit) {
    const dayStart = new Date(startTime); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startTime); dayEnd.setHours(23, 59, 59, 999);
    const totalForDay = await prisma.booking.count({
      where: {
        id: excludingBookingId ? { not: excludingBookingId } : undefined,
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
        startTime: { gte: dayStart, lte: dayEnd }
      }
    });
    if (totalForDay >= settings.dailyAppointmentLimit) throw new AppError(400, "Daily appointment limit reached");
  }
  await ensureNoConflict(staffId, startTime, endTime, excludingBookingId);
  return { service, endTime };
}

async function canCustomerChange(bookingStart: Date) {
  const settings = await getSettings();
  const cutoff = addMinutes(new Date(), settings.bookingNoticeMinimumHours * 60);
  return bookingStart > cutoff;
}

function nextOccurrence(date: Date, frequency: "DAILY" | "WEEKLY" | "MONTHLY", index: number) {
  const next = new Date(date);
  if (frequency === "DAILY") next.setDate(next.getDate() + index);
  if (frequency === "WEEKLY") next.setDate(next.getDate() + index * 7);
  if (frequency === "MONTHLY") next.setMonth(next.getMonth() + index);
  return next;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: Role.CUSTOMER,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      customer: { create: { email: input.email.toLowerCase(), firstName: input.firstName, lastName: input.lastName, phone: input.phone || "" } }
    }
  });
  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName } });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new AppError(401, "Invalid credentials");
  res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName } });
}));

app.get("/api/auth/me", authenticate, (req, res) => res.json({ user: req.user }));

app.get("/api/staff", asyncRoute(async (_req, res) => {
  const staff = await prisma.staffProfile.findMany({ where: { isActive: true }, include: { user: true } });
  res.json(staff);
}));

app.get("/api/services", asyncRoute(async (req, res) => {
  const activeOnly = req.query.active !== "false";
  const services = await prisma.service.findMany({ where: activeOnly ? { isActive: true } : undefined, orderBy: { name: "asc" } });
  res.json(services);
}));

app.post("/api/services", authenticate, requireRole(Role.ADMIN), asyncRoute(async (req, res) => {
  const service = await prisma.service.create({ data: serviceSchema.parse(req.body) });
  res.status(201).json(service);
}));

app.get("/api/services/:id", asyncRoute(async (req, res) => {
  res.json(await prisma.service.findUniqueOrThrow({ where: { id: paramId(req) } }));
}));

app.put("/api/services/:id", authenticate, requireRole(Role.ADMIN), asyncRoute(async (req, res) => {
  const service = await prisma.service.update({ where: { id: paramId(req) }, data: serviceSchema.partial().parse(req.body) });
  res.json(service);
}));

app.delete("/api/services/:id", authenticate, requireRole(Role.ADMIN), asyncRoute(async (req, res) => {
  await prisma.service.delete({ where: { id: paramId(req) } });
  res.status(204).end();
}));

app.get("/api/availability", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (_req, res) => {
  res.json(await prisma.availability.findMany({ include: { staff: { include: { user: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }));
}));

app.post("/api/availability", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const availability = await prisma.availability.create({ data: availabilitySchema.parse(req.body) });
  res.status(201).json(availability);
}));

app.put("/api/availability/:id", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const availability = await prisma.availability.update({ where: { id: paramId(req) }, data: availabilitySchema.partial().parse(req.body) });
  res.json(availability);
}));

app.post("/api/blocked-times", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const input = z.object({ staffId: z.string(), startTime: z.string().datetime(), endTime: z.string().datetime(), reason: z.string().optional() }).parse(req.body);
  res.status(201).json(await prisma.blockedTime.create({ data: { ...input, startTime: new Date(input.startTime), endTime: new Date(input.endTime) } }));
}));

app.get("/api/availability/slots", asyncRoute(async (req, res) => {
  const input = z.object({ serviceId: z.string(), staffId: z.string(), date: z.string() }).parse(req.query);
  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } });
  const date = new Date(`${input.date}T00:00:00`);
  const availability = await prisma.availability.findFirst({ where: { staffId: input.staffId, dayOfWeek: date.getDay() } });
  if (!availability) return res.json([]);
  const settings = await getSettings();
  if (settings.dailyAppointmentLimit) {
    const totalForDay = await prisma.booking.count({ where: { status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] }, startTime: { gte: date, lte: setMinutesOnDate(date, 24 * 60 - 1) } } });
    if (totalForDay >= settings.dailyAppointmentLimit) return res.json([]);
  }
  const blocks = await prisma.blockedTime.findMany({ where: { staffId: input.staffId, startTime: { lt: setMinutesOnDate(date, 24 * 60 - 1) }, endTime: { gt: date } } });
  const bookings = await prisma.booking.findMany({ where: { staffId: input.staffId, status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] }, startTime: { lt: setMinutesOnDate(date, 24 * 60 - 1) }, endTime: { gt: date } } });
  const slots: string[] = [];
  for (let minute = minutesFromTime(availability.startTime); minute + service.durationMinutes <= minutesFromTime(availability.endTime); minute += 30) {
    const start = setMinutesOnDate(date, minute);
    const end = addMinutes(start, service.durationMinutes);
    const inBreak = availability.breakStart && availability.breakEnd && rangesOverlap(start, end, setMinutesOnDate(date, minutesFromTime(availability.breakStart)), setMinutesOnDate(date, minutesFromTime(availability.breakEnd)));
    const blocked = blocks.some((block) => rangesOverlap(start, end, block.startTime, block.endTime));
    const booked = bookings.some((booking) => rangesOverlap(start, addMinutes(end, availability.bufferMinutes), booking.startTime, booking.endTime));
    if (!inBreak && !blocked && !booked && start > new Date()) slots.push(start.toISOString());
  }
  res.json(slots);
}));

app.post("/api/bookings", asyncRoute(async (req, res) => {
  const input = bookingSchema.extend({
    cardHeldForNoShow: z.boolean().optional().default(false),
    intakeAnswers: z.record(z.string()).optional()
  }).parse(req.body);
  const startTime = new Date(input.startTime);
  const { service, endTime } = await assertSlotAllowed(input.serviceId, input.staffId, startTime);
  const settings = await getSettings();
  const taxAmount = Number(service.depositAmount) * Number(settings.depositTaxRate);
  const customer = await prisma.customer.upsert({
    where: { email: input.customer.email.toLowerCase() },
    create: { ...input.customer, email: input.customer.email.toLowerCase() },
    update: { firstName: input.customer.firstName, lastName: input.customer.lastName, phone: input.customer.phone, notes: input.customer.notes }
  });
  const booking = await prisma.booking.create({
    data: {
      serviceId: input.serviceId,
      staffId: input.staffId,
      customerId: customer.id,
      startTime,
      endTime,
      notes: input.notes,
      cardHeldForNoShow: input.cardHeldForNoShow,
      intakeAnswers: input.intakeAnswers,
      payment: { create: { depositAmount: service.depositAmount, taxAmount, totalAmount: Number(service.depositAmount) + taxAmount, status: PaymentStatus.UNPAID } }
    },
    include: publicBookingInclude()
  });
  res.status(201).json(booking);
}));

app.post("/api/bookings/recurring", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const input = z.object({
    serviceId: z.string(),
    staffId: z.string(),
    customerId: z.string(),
    startTime: z.string().datetime(),
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
    count: z.coerce.number().int().min(1).max(24).default(4),
    notes: z.string().optional()
  }).parse(req.body);
  const recurrenceGroupId = `rec_${Date.now()}`;
  const created = [];
  for (let index = 0; index < input.count; index += 1) {
    const startTime = nextOccurrence(new Date(input.startTime), input.frequency, index);
    const { service, endTime } = await assertSlotAllowed(input.serviceId, input.staffId, startTime);
    created.push(await prisma.booking.create({
      data: {
        serviceId: input.serviceId,
        staffId: input.staffId,
        customerId: input.customerId,
        startTime,
        endTime,
        status: BookingStatus.CONFIRMED,
        recurrenceGroupId,
        notes: input.notes,
        payment: { create: { depositAmount: service.depositAmount, taxAmount: 0, totalAmount: service.depositAmount, status: PaymentStatus.UNPAID } }
      },
      include: publicBookingInclude()
    }));
  }
  res.status(201).json({ recurrenceGroupId, bookings: created });
}));

app.get("/api/bookings", authenticate, asyncRoute(async (req, res) => {
  const where = req.user?.role === Role.CUSTOMER
    ? { customer: { email: req.user.email } }
    : req.user?.role === Role.STAFF
      ? { staff: { userId: req.user.id } }
      : {};
  res.json(await prisma.booking.findMany({ where, include: publicBookingInclude(), orderBy: { startTime: "asc" } }));
}));

app.get("/api/bookings/:id", authenticate, asyncRoute(async (req, res) => {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: paramId(req) }, include: publicBookingInclude() });
  res.json(booking);
}));

app.put("/api/bookings/:id/reschedule", authenticate, asyncRoute(async (req, res) => {
  const input = z.object({ startTime: z.string().datetime(), staffId: z.string().optional(), reason: z.string().optional() }).parse(req.body);
  const existing = await prisma.booking.findUniqueOrThrow({ where: { id: paramId(req) } });
  const settings = await getSettings();
  if (req.user?.role === Role.CUSTOMER && (!settings.allowCustomerSelfReschedule || !(await canCustomerChange(existing.startTime)))) throw new AppError(403, "Reschedule window has closed");
  const staffId = input.staffId || existing.staffId;
  const startTime = new Date(input.startTime);
  const { endTime } = await assertSlotAllowed(existing.serviceId, staffId, startTime, existing.id);
  res.json(await prisma.booking.update({ where: { id: existing.id }, data: { startTime, endTime, staffId, internalNotes: input.reason }, include: publicBookingInclude() }));
}));

app.put("/api/bookings/:id/cancel", authenticate, asyncRoute(async (req, res) => {
  const input = z.object({ reason: z.string().optional() }).parse(req.body);
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: paramId(req) } });
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: booking.customerId } });
  const settings = await getSettings();
  if (req.user?.role === Role.CUSTOMER && (!settings.allowCustomerSelfCancel || !(await canCustomerChange(booking.startTime)))) throw new AppError(403, "Cancellation window has closed");
  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELLED, cancellationReason: input.reason }, include: publicBookingInclude() });
  await createNotification(NotificationType.BOOKING_CANCELLATION, customer.email, "Your appointment was cancelled.", booking.id);
  res.json(updated);
}));

app.put("/api/bookings/:id/complete", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  res.json(await prisma.booking.update({ where: { id: paramId(req) }, data: { status: BookingStatus.COMPLETED }, include: publicBookingInclude() }));
}));

app.put("/api/bookings/:id/no-show", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const settings = await getSettings();
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: paramId(req) }, include: { customer: true, service: true } });
  const fee = settings.noShowFeeType === "PERCENT"
    ? Number(booking.service.price) * (Number(settings.noShowFeeAmount) / 100)
    : Number(settings.noShowFeeAmount);
  const note = booking.cardHeldForNoShow ? `No-show fee charged: $${fee.toFixed(2)}` : `No-show fee available: $${fee.toFixed(2)} (no card held)`;
  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.NO_SHOW, internalNotes: note }, include: publicBookingInclude() });
  await createNotification(NotificationType.BOOKING_CANCELLATION, booking.customer.email, note, booking.id);
  res.json(updated);
}));

app.get("/api/waitlist", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (_req, res) => {
  res.json(await prisma.waitlistEntry.findMany({ include: { service: true, staff: { include: { user: true } } }, orderBy: { createdAt: "desc" } }));
}));

app.post("/api/waitlist", asyncRoute(async (req, res) => {
  const settings = await getSettings();
  if (!settings.enableWaitlist) throw new AppError(403, "Waitlist is not enabled");
  const input = z.object({
    serviceId: z.string(),
    staffId: z.string().optional(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    preferredDate: z.string().optional(),
    preferredTime: z.string().optional(),
    notes: z.string().optional()
  }).parse(req.body);
  const entry = await prisma.waitlistEntry.create({
    data: {
      ...input,
      email: input.email.toLowerCase(),
      preferredDate: input.preferredDate ? new Date(`${input.preferredDate}T00:00:00`) : undefined
    },
    include: { service: true, staff: { include: { user: true } } }
  });
  await createNotification(NotificationType.BOOKING_REMINDER, input.email, "You joined the QueenG Braids waitlist.");
  res.status(201).json(entry);
}));

app.put("/api/waitlist/:id", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const input = z.object({ status: z.nativeEnum(WaitlistStatus), notes: z.string().optional() }).parse(req.body);
  res.json(await prisma.waitlistEntry.update({ where: { id: paramId(req) }, data: input, include: { service: true, staff: { include: { user: true } } } }));
}));

app.post("/api/payments/create-intent", asyncRoute(async (req, res) => {
  const input = z.object({ bookingId: z.string() }).parse(req.body);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: input.bookingId }, include: { booking: { include: { customer: true } } } });
  if (stripe && process.env.NODE_ENV !== "test") {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(payment.totalAmount) * 100),
      currency: "usd",
      receipt_email: payment.booking.customer.email,
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: input.bookingId,
        paymentId: payment.id,
        customerEmail: payment.booking.customer.email
      },
      description: "QueenG Braids booking deposit"
    });
    const updated = await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentIntentId: intent.id } });
    return res.json({ paymentIntentId: intent.id, clientSecret: intent.client_secret, amount: dollars(updated.totalAmount), depositAmount: dollars(updated.depositAmount), taxAmount: dollars(updated.taxAmount), provider: "stripe" });
  }
  const intentId = `pi_mock_${payment.id}`;
  const updated = await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentIntentId: intentId } });
  res.json({ paymentIntentId: intentId, clientSecret: `${intentId}_secret_mock`, amount: dollars(updated.totalAmount), depositAmount: dollars(updated.depositAmount), taxAmount: dollars(updated.taxAmount), provider: "mock" });
}));

app.post("/api/payments/confirm", asyncRoute(async (req, res) => {
  const input = z.object({ bookingId: z.string(), paymentIntentId: z.string() }).parse(req.body);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: input.bookingId } });
  if (payment.stripePaymentIntentId !== input.paymentIntentId) throw new AppError(400, "Payment intent does not match booking");
  if (!stripe || input.paymentIntentId.startsWith("pi_mock_")) return res.json(await markBookingPayment(input.bookingId, true));
  const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
  const paid = intent.status === "succeeded";
  if (!paid && intent.status !== "requires_payment_method") throw new AppError(402, `Payment is ${intent.status}`);
  res.json(await markBookingPayment(input.bookingId, paid));
}));

app.post("/api/payments/webhook/test", asyncRoute(async (req, res) => {
  const input = z.object({ bookingId: z.string(), status: z.enum(["succeeded", "failed"]) }).parse(req.body);
  res.json(await markBookingPayment(input.bookingId, input.status === "succeeded"));
}));

app.get("/api/customers", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const search = String(req.query.search || "");
  res.json(await prisma.customer.findMany({
    where: search ? { OR: [{ email: { contains: search, mode: "insensitive" } }, { firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } : undefined,
    include: { bookings: { include: { service: true, payment: true }, orderBy: { startTime: "desc" } } },
    orderBy: { lastName: "asc" }
  }));
}));

app.get("/api/customers/:id", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  res.json(await prisma.customer.findUniqueOrThrow({ where: { id: paramId(req) }, include: { bookings: { include: publicBookingInclude(), orderBy: { startTime: "desc" } } } }));
}));

app.put("/api/customers/:id", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (req, res) => {
  const input = z.object({ firstName: z.string().optional(), lastName: z.string().optional(), phone: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  res.json(await prisma.customer.update({ where: { id: paramId(req) }, data: input }));
}));

app.get("/api/dashboard/summary", authenticate, requireRole(Role.ADMIN, Role.STAFF), asyncRoute(async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const [today, upcoming, bookings, paid, popular] = await Promise.all([
    prisma.booking.count({ where: { startTime: { gte: todayStart, lte: todayEnd } } }),
    prisma.booking.count({ where: { startTime: { gt: now }, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] } } }),
    prisma.booking.findMany({ take: 8, include: publicBookingInclude(), orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ where: { status: PaymentStatus.PAID } }),
    prisma.booking.groupBy({ by: ["serviceId"], _count: { serviceId: true }, orderBy: { _count: { serviceId: "desc" } }, take: 5 })
  ]);
  const services = await prisma.service.findMany({ where: { id: { in: popular.map((p) => p.serviceId) } } });
  res.json({
    totalBookingsToday: today,
    totalUpcomingBookings: upcoming,
    totalDepositsCollected: paid.reduce((sum, p) => sum + Number(p.totalAmount), 0),
    totalRevenue: paid.reduce((sum, p) => sum + Number(p.bookingId ? p.totalAmount : 0), 0),
    recentBookings: bookings,
    popularServices: popular.map((p) => ({ service: services.find((s) => s.id === p.serviceId), count: p._count.serviceId }))
  });
}));

app.get("/api/settings", asyncRoute(async (_req, res) => res.json(await getSettings())));

app.put("/api/settings", authenticate, requireRole(Role.ADMIN), asyncRoute(async (req, res) => {
  const settings = await getSettings();
  const input = z.object({
    businessName: z.string().optional(),
    businessPhone: z.string().optional(),
    businessEmail: z.string().email().optional(),
    address: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    depositPolicy: z.string().optional(),
    bookingNoticeMinimumHours: z.coerce.number().int().min(0).optional(),
    maxDaysAhead: z.coerce.number().int().min(1).optional(),
    depositTaxRate: z.coerce.number().min(0).max(1).optional(),
    paymentPolicy: z.enum(["NO_REQUIREMENT", "REQUIRE_DEPOSIT", "REQUIRE_FULL_PREPAYMENT", "HOLD_CARD_FOR_NO_SHOW"]).optional(),
    noShowFeeType: z.enum(["FLAT", "PERCENT"]).optional(),
    noShowFeeAmount: z.coerce.number().min(0).optional(),
    dailyAppointmentLimit: z.coerce.number().int().min(1).nullable().optional(),
    allowCustomerSelfCancel: z.boolean().optional(),
    allowCustomerSelfReschedule: z.boolean().optional(),
    enableWaitlist: z.boolean().optional(),
    customBookingQuestions: z.array(z.object({ key: z.string(), label: z.string(), required: z.boolean().default(false) })).optional()
  }).parse(req.body);
  res.json(await prisma.businessSettings.update({ where: { id: settings.id }, data: input }));
}));

app.use(errorHandler);

export default app;
