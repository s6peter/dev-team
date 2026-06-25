import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL ||= "postgresql://booking:booking@localhost:55432/booking_app_test?schema=public";

const prisma = new PrismaClient();

beforeAll(async () => {
  execSync("npx prisma db push --force-reset --skip-generate", { stdio: "inherit", cwd: process.cwd() });
});

beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedTime.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
