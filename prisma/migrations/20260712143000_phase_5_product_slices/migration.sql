-- AlterTable
ALTER TABLE "Barber" ADD COLUMN "bookingPolicy" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "category" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "Service_barberId_isActive_idx";

-- CreateTable
CREATE TABLE "WaitlistRequest" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "serviceId" TEXT,
    "clientName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredWindow" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_barberId_isActive_sortOrder_idx" ON "Service"("barberId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "WaitlistRequest_barberId_status_preferredDate_idx" ON "WaitlistRequest"("barberId", "status", "preferredDate");

-- AddForeignKey
ALTER TABLE "WaitlistRequest" ADD CONSTRAINT "WaitlistRequest_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistRequest" ADD CONSTRAINT "WaitlistRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
