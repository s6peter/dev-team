import { NotificationType } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function createNotification(type: NotificationType, recipient: string, message: string, bookingId?: string) {
  console.log(`[email:${type}] ${recipient} - ${message}`);
  return prisma.notification.create({ data: { type, recipient, message, bookingId } });
}
