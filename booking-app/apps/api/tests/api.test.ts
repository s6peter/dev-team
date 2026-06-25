import request from "supertest";
import { PrismaClient, Role } from "@prisma/client";
import app from "../src/app.js";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

async function seedBase() {
  const admin = await prisma.user.create({ data: { email: "admin@example.com", passwordHash: await hashPassword("Admin123!"), role: Role.ADMIN, firstName: "Admin", lastName: "User" } });
  const staffUser = await prisma.user.create({
    data: { email: "staff@example.com", passwordHash: await hashPassword("Staff123!"), role: Role.STAFF, firstName: "Nia", lastName: "Braider", staffProfile: { create: { displayName: "Nia" } } },
    include: { staffProfile: true }
  });
  await prisma.businessSettings.create({ data: { businessName: "Studio", businessPhone: "555", businessEmail: "a@b.com", address: "Here", cancellationPolicy: "24h", depositPolicy: "Deposit plus tax", depositTaxRate: 0.1 } });
  const service = await prisma.service.create({ data: { name: "Box Braids", description: "Classic", price: 180, depositAmount: 45, durationMinutes: 120, category: "Braids", isActive: true } });
  await prisma.availability.create({ data: { staffId: staffUser.staffProfile!.id, dayOfWeek: 1, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00", bufferMinutes: 15 } });
  const login = await request(app).post("/api/auth/login").send({ email: admin.email, password: "Admin123!" });
  return { admin, staff: staffUser.staffProfile!, service, adminToken: login.body.token };
}

function nextMonday(hour = 9) {
  const date = new Date();
  const diff = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + diff);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function createBooking(serviceId: string, staffId: string, hour = 9) {
  return request(app).post("/api/bookings").send({
    serviceId,
    staffId,
    startTime: nextMonday(hour).toISOString(),
    customer: { firstName: "Maya", lastName: "Cole", email: `maya${hour}@example.com`, phone: "5551234567", notes: "Tender scalp" },
    notes: "Window seat"
  });
}

test("user can register/login and me returns the user", async () => {
  await prisma.businessSettings.create({ data: { businessName: "Studio", businessPhone: "555", businessEmail: "a@b.com", address: "Here", cancellationPolicy: "24h", depositPolicy: "Deposit" } });
  const registered = await request(app).post("/api/auth/register").send({ email: "customer@example.com", password: "Customer123!", firstName: "Cam", lastName: "Lee", phone: "555" }).expect(201);
  expect(registered.body.token).toBeTruthy();
  const logged = await request(app).post("/api/auth/login").send({ email: "customer@example.com", password: "Customer123!" }).expect(200);
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${logged.body.token}`).expect(200);
});

test("admin can create service and customers view only active services", async () => {
  const { adminToken } = await seedBase();
  await request(app).post("/api/services").set("Authorization", `Bearer ${adminToken}`).send({ name: "Cornrows", description: "Clean rows", price: 90, depositAmount: 20, durationMinutes: 90, category: "Braids", isActive: true }).expect(201);
  await request(app).post("/api/services").set("Authorization", `Bearer ${adminToken}`).send({ name: "Inactive", description: "Hidden", price: 90, depositAmount: 20, durationMinutes: 90, category: "Braids", isActive: false }).expect(201);
  const services = await request(app).get("/api/services").expect(200);
  expect(services.body.some((s: any) => s.name === "Cornrows")).toBe(true);
  expect(services.body.some((s: any) => s.name === "Inactive")).toBe(false);
});

test("available slots are generated correctly and avoid breaks", async () => {
  const { service, staff } = await seedBase();
  const date = nextMonday().toISOString().slice(0, 10);
  const slots = await request(app).get(`/api/availability/slots?serviceId=${service.id}&staffId=${staff.id}&date=${date}`).expect(200);
  expect(slots.body.length).toBeGreaterThan(0);
  expect(slots.body.some((slot: string) => new Date(slot).getHours() === 12)).toBe(false);
});

test("booking starts pending, creates customer, blocks double booking, and payment confirms only on success", async () => {
  const { service, staff } = await seedBase();
  const booking = await createBooking(service.id, staff.id).expect(201);
  expect(booking.body.status).toBe("PENDING_PAYMENT");
  expect(booking.body.payment.status).toBe("UNPAID");
  expect(Number(booking.body.payment.taxAmount)).toBeGreaterThan(0);
  await createBooking(service.id, staff.id).expect(409);
  const customers = await prisma.customer.findMany();
  expect(customers).toHaveLength(1);
  await request(app).post("/api/payments/webhook/test").send({ bookingId: booking.body.id, status: "failed" }).expect(200).expect((res) => expect(res.body.status).toBe("PENDING_PAYMENT"));
  await request(app).post("/api/payments/webhook/test").send({ bookingId: booking.body.id, status: "succeeded" }).expect(200).expect((res) => expect(res.body.status).toBe("CONFIRMED"));
});

test("admin can cancel, reschedule, complete and no-show bookings", async () => {
  const { service, staff, adminToken } = await seedBase();
  const booking = await createBooking(service.id, staff.id, 9).expect(201);
  await request(app).put(`/api/bookings/${booking.body.id}/reschedule`).set("Authorization", `Bearer ${adminToken}`).send({ startTime: nextMonday(14).toISOString() }).expect(200);
  await request(app).put(`/api/bookings/${booking.body.id}/complete`).set("Authorization", `Bearer ${adminToken}`).expect(200);
  await request(app).put(`/api/bookings/${booking.body.id}/no-show`).set("Authorization", `Bearer ${adminToken}`).expect(200);
  await request(app).put(`/api/bookings/${booking.body.id}/cancel`).set("Authorization", `Bearer ${adminToken}`).send({ reason: "Client request" }).expect(200);
});

test("dashboard summary works", async () => {
  const { service, staff, adminToken } = await seedBase();
  const booking = await createBooking(service.id, staff.id).expect(201);
  await request(app).post("/api/payments/webhook/test").send({ bookingId: booking.body.id, status: "succeeded" }).expect(200);
  const summary = await request(app).get("/api/dashboard/summary").set("Authorization", `Bearer ${adminToken}`).expect(200);
  expect(summary.body.totalUpcomingBookings).toBeGreaterThanOrEqual(1);
  expect(summary.body.totalDepositsCollected).toBeGreaterThan(0);
});

test("admin can configure Square-style policies and manage the waitlist", async () => {
  const { service, adminToken } = await seedBase();
  const settings = await request(app)
    .put("/api/settings")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ paymentPolicy: "HOLD_CARD_FOR_NO_SHOW", noShowFeeType: "PERCENT", noShowFeeAmount: 20, enableWaitlist: true, customBookingQuestions: [{ key: "hairPrep", label: "Hair prep", required: true }] })
    .expect(200);
  expect(settings.body.paymentPolicy).toBe("HOLD_CARD_FOR_NO_SHOW");
  expect(settings.body.customBookingQuestions[0].key).toBe("hairPrep");

  const entry = await request(app)
    .post("/api/waitlist")
    .send({ serviceId: service.id, firstName: "Wait", lastName: "Client", email: "wait@example.com", phone: "5551234567", preferredDate: nextMonday().toISOString().slice(0, 10) })
    .expect(201);
  expect(entry.body.status).toBe("OPEN");
  const listed = await request(app).get("/api/waitlist").set("Authorization", `Bearer ${adminToken}`).expect(200);
  expect(listed.body).toHaveLength(1);
  await request(app).put(`/api/waitlist/${entry.body.id}`).set("Authorization", `Bearer ${adminToken}`).send({ status: "CONTACTED" }).expect(200);
});
