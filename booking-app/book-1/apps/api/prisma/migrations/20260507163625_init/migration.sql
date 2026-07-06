-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('OPEN', 'CONTACTED', 'BOOKED', 'CLOSED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cardHeldForNoShow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intakeAnswers" JSONB,
ADD COLUMN     "recurrenceGroupId" TEXT;

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "allowCustomerSelfCancel" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowCustomerSelfReschedule" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "customBookingQuestions" JSONB,
ADD COLUMN     "dailyAppointmentLimit" INTEGER,
ADD COLUMN     "enableWaitlist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "noShowFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 30,
ADD COLUMN     "noShowFeeType" TEXT NOT NULL DEFAULT 'FLAT',
ADD COLUMN     "paymentPolicy" TEXT NOT NULL DEFAULT 'REQUIRE_DEPOSIT';

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "notes" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
