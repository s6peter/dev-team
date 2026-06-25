import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "STAFF", "CUSTOMER"]);
export const BookingStatusSchema = z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]);
export const PaymentStatusSchema = z.enum(["UNPAID", "PAID", "FAILED", "REFUNDED"]);

export const serviceSchema = z.object({
  name: z.string().min(2),
  groupName: z.string().optional().nullable(),
  optionName: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  length: z.string().optional().nullable(),
  description: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  depositAmount: z.coerce.number().nonnegative(),
  durationMinutes: z.coerce.number().int().min(15),
  category: z.string().min(1),
  isActive: z.boolean().default(true)
});

export const availabilitySchema = z.object({
  staffId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  bufferMinutes: z.coerce.number().int().min(0).default(15)
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startTime: z.string().datetime(),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    notes: z.string().optional().default("")
  }),
  notes: z.string().optional().default("")
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().default("")
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type Role = z.infer<typeof RoleSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
