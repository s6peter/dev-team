import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

async function main() {
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

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: await hashPassword("Admin123!"),
      role: Role.ADMIN,
      firstName: "Amina",
      lastName: "Owner",
      phone: "555-0100"
    }
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@example.com",
      passwordHash: await hashPassword("Staff123!"),
      role: Role.STAFF,
      firstName: "Nia",
      lastName: "Braider",
      phone: "555-0110",
      staffProfile: {
        create: {
          displayName: "Nia",
          bio: "Protective styles, braids, and retwists."
        }
      }
    },
    include: { staffProfile: true }
  });

  const option = (groupName: string, optionName: string, description: string, price: number, depositAmount: number, durationMinutes: number, category: string, size?: string, length?: string) => ({
    name: `${groupName} - ${optionName}`,
    groupName,
    optionName,
    size,
    length,
    description,
    price,
    depositAmount,
    durationMinutes,
    category,
    isActive: true
  });
  const matrix = (groupName: string, description: string, category: string, prices: Record<string, Record<string, number>>, depositAmount = 30) =>
    Object.entries(prices).flatMap(([size, lengths]) =>
      Object.entries(lengths).map(([length, price]) => {
        const duration = size === "Extra Small" ? 420 : size === "Small" ? 330 : size === "Medium" ? 270 : 240;
        return option(groupName, `${size} ${length.toLowerCase()}`, description, price, depositAmount, duration, category, size, length);
      })
    );

  const services = [
    ...matrix("Knotless Braids", "Lightweight knotless braids with clean parts. Tell us your extension color.", "Braids", {
      Large: { "Shoulder length": 130, "Midback length": 150, "Waist length": 180, "Butt length": 200 },
      Medium: { "Shoulder length": 170, "Midback length": 210, "Waist length": 240, "Butt length": 270 },
      Small: { "Shoulder length": 220, "Midback length": 250, "Waist length": 280, "Butt length": 320 },
      "Extra Small": { "Shoulder length": 280, "Midback length": 330, "Waist length": 380, "Butt length": 430 }
    }),
    ...matrix("Box Braids", "Classic box braids with clean parts.", "Braids", {
      Large: { "Shoulder length": 130, "Midback length": 150, "Waist length": 180, "Butt length": 200 },
      Medium: { "Shoulder length": 160, "Midback length": 190, "Waist length": 220, "Butt length": 250 },
      Small: { "Shoulder length": 200, "Midback length": 230, "Waist length": 270, "Butt length": 310 },
      "Extra Small": { "Shoulder length": 260, "Midback length": 310, "Waist length": 360, "Butt length": 420 }
    }),
    option("Tree Braids", "Full install", "A full tree braid style. $30 non-refundable deposit required to confirm.", 250, 30, 345, "Braids"),
    option("Micro Braids", "Full install", "Must bring hair. Small braids with long-lasting detail and full finish.", 220, 30, 300, "Braids", "Micro", "Standard length"),
    option("Cornrows", "Simple style", "Straight-back or simple design cornrows. Extension color can be noted at booking.", 100, 30, 150, "Braids"),
    option("Boho Knotless Braids", "Standard boho", "Boho style knotless braids. Please bring 100% human curly pieces.", 150, 30, 240, "Braids"),
    option("Fulani Braids", "Standard Fulani", "Fulani braids with beads or curls by request. Final price depends on size and length.", 200, 30, 300, "Braids"),
    ...matrix("Senegalese Twist", "Smooth Senegalese twists. Please tell us which extension color you would like.", "Twists", {
      Large: { "Shoulder length": 150, "Midback length": 200, "Waist length": 220, "Butt length": 250 },
      Medium: { "Shoulder length": 180, "Midback length": 220, "Waist length": 250, "Butt length": 280 },
      Small: { "Shoulder length": 220, "Midback length": 280, "Waist length": 300, "Butt length": 350 },
      "Extra Small": { "Shoulder length": 300, "Midback length": 400, "Waist length": 450, "Butt length": 500 }
    }),
    option("Kinky, Havana & Marley Twist", "Standard twist", "Must bring hair. Kinky, Havana, or Marley twist finish.", 140, 30, 240, "Twists"),
    option("Passion Twist", "Standard twist", "Must bring hair. Soft passion twists with a lightweight finish.", 160, 30, 240, "Twists"),
    option("Island Twist", "Standard twist", "Must bring hair. Island twist style with a polished finish.", 180, 30, 270, "Twists"),
    option("Kids Senegalese Twist", "Ages 5-12", "Extension color can be noted during booking.", 100, 30, 210, "Kids"),
    option("Kids Cornrows", "Ages 5-12", "Call for pricing on custom designs.", 100, 30, 150, "Kids"),
    option("Kids Knotless", "Ages 5-12", "Lightweight knotless braids for kids.", 100, 30, 270, "Kids"),
    option("Kids Box Braids", "Ages 5-12", "Classic kids box braids.", 130, 30, 210, "Kids"),
    option("Kids Kinky, Marley & Havana Twist", "Ages 5-12", "Must bring hair for twist styles.", 100, 30, 210, "Kids"),
    option("Kids Boho Knotless", "Ages 5-12", "Please bring 100% human curly pieces for boho styles.", 150, 30, 240, "Kids"),
    option("Mens Braids", "Simple design", "Men's braid styles. Final price depends on requested design.", 50, 20, 60, "Men"),
    option("Crochets", "Full install", "Must bring hair. Crochet install with a polished QueenG finish.", 120, 30, 210, "Other"),
    option("Wig Install", "Install and style", "Braid-down, melt, and style.", 140, 40, 120, "Wigs"),
    option("Retwist", "Retwist and basic style", "Loc retwist and basic style.", 95, 30, 120, "Locs"),
    option("Other Services", "Consultation-style booking", "Price depends on size and length. Book a consultation-style slot and we will confirm details.", 100, 30, 180, "Other")
  ];

  await prisma.service.createMany({
    data: services
  });

  const staffId = staff.staffProfile!.id;
  for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) {
    await prisma.availability.create({
      data: {
        staffId,
        dayOfWeek,
        startTime: "09:00",
        endTime: dayOfWeek === 6 ? "15:00" : "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        bufferMinutes: 15
      }
    });
  }

  await prisma.businessSettings.create({
    data: {
      businessName: "QueenG Braids",
      businessPhone: "555-0199",
      businessEmail: "hello@queengbraids.test",
      address: "123 QueenG Way, Chicago, IL",
      cancellationPolicy: "Customers may cancel or reschedule up to 24 hours before the appointment.",
      depositPolicy: "Deposits are required to confirm appointments and include applicable local tax.",
      bookingNoticeMinimumHours: 24,
      maxDaysAhead: 60,
      depositTaxRate: 0.0825,
      paymentPolicy: "REQUIRE_DEPOSIT",
      noShowFeeType: "FLAT",
      noShowFeeAmount: 30,
      dailyAppointmentLimit: 12,
      allowCustomerSelfCancel: false,
      allowCustomerSelfReschedule: true,
      enableWaitlist: true,
      customBookingQuestions: [
        { key: "extensionColor", label: "What extension color would you like?", required: false },
        { key: "hairPrep", label: "Will your hair be washed, detangled, and ready?", required: true },
        { key: "inspiration", label: "Paste a style inspiration link if you have one.", required: false }
      ]
    }
  });

  console.log(`Seeded admin ${admin.email}, staff ${staff.email}, services, availability, and settings.`);
}

main().finally(async () => prisma.$disconnect());
