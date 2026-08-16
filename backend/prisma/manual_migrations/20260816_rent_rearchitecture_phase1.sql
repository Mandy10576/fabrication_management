-- Rent module rearchitecture Phase 1: Area+Building -> Property, Tenancy ->
-- Contract, new Bill/BillPayment tables. Hand-written to RENAME tables/
-- columns instead of Prisma's default drop+recreate, so existing Area/
-- Building/Tenancy/Payment data is preserved. Run once, in a single
-- transaction, against the local dev DB (already backed up via pg_dump).

BEGIN;

-- =============================================================================
-- 1. RentBuilding -> RentProperty (rename in place, backfill new columns)
-- =============================================================================

ALTER TABLE "RentBuilding" RENAME TO "RentProperty";
ALTER TABLE "RentProperty" RENAME COLUMN "address" TO "addressLine1";

ALTER TABLE "RentProperty" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "RentProperty" ADD COLUMN "city" TEXT;
ALTER TABLE "RentProperty" ADD COLUMN "state" TEXT;
ALTER TABLE "RentProperty" ADD COLUMN "pinCode" TEXT;
ALTER TABLE "RentProperty" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'RESIDENTIAL';
ALTER TABLE "RentProperty" ADD COLUMN "totalFloors" INTEGER;
ALTER TABLE "RentProperty" ADD COLUMN "yearBuilt" INTEGER;
ALTER TABLE "RentProperty" ADD COLUMN "description" TEXT;

-- Backfill city from the old Area name before Area disappears.
UPDATE "RentProperty" p SET "city" = a."name"
FROM "RentArea" a WHERE p."areaId" = a."id";

ALTER TABLE "RentProperty" ALTER COLUMN "city" SET NOT NULL;

ALTER TABLE "RentProperty" DROP CONSTRAINT "RentBuilding_areaId_fkey";
ALTER TABLE "RentProperty" DROP COLUMN "areaId";
DROP TABLE "RentArea";

ALTER INDEX "RentBuilding_name_idx" RENAME TO "RentProperty_name_idx";
CREATE INDEX "RentProperty_city_idx" ON "RentProperty"("city");

-- =============================================================================
-- 2. RentRoom.buildingId -> propertyId (rename in place, add new columns)
-- =============================================================================

ALTER TABLE "RentRoom" RENAME COLUMN "buildingId" TO "propertyId";
ALTER INDEX "RentRoom_buildingId_idx" RENAME TO "RentRoom_propertyId_idx";

ALTER TABLE "RentRoom" ADD COLUMN "floor" TEXT;
ALTER TABLE "RentRoom" ADD COLUMN "roomType" TEXT;
ALTER TABLE "RentRoom" ADD COLUMN "areaSqft" DOUBLE PRECISION;
ALTER TABLE "RentRoom" ADD COLUMN "electricityMeterNumber" TEXT;
ALTER TABLE "RentRoom" ADD COLUMN "depositAmount" DOUBLE PRECISION;
ALTER TABLE "RentRoom" ADD COLUMN "furnishingStatus" TEXT NOT NULL DEFAULT 'UNFURNISHED';

-- =============================================================================
-- 3. RentTenant — purely additive new columns
-- =============================================================================

ALTER TABLE "RentTenant" ADD COLUMN "alternatePhone" TEXT;
ALTER TABLE "RentTenant" ADD COLUMN "email" TEXT;
ALTER TABLE "RentTenant" ADD COLUMN "dob" TIMESTAMP(3);
ALTER TABLE "RentTenant" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "RentTenant" ADD COLUMN "emergencyContactPhone" TEXT;

-- =============================================================================
-- 4. RentTenancy -> RentContract (rename in place, add new columns)
-- =============================================================================

ALTER TABLE "RentTenancy" RENAME TO "RentContract";

ALTER TABLE "RentContract" ADD COLUMN "depositAmount" DOUBLE PRECISION;
ALTER TABLE "RentContract" ADD COLUMN "lateFeePolicy" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "RentContract" ADD COLUMN "lateFeeValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RentContract" ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 5;

ALTER INDEX "RentTenancy_roomId_idx" RENAME TO "RentContract_roomId_idx";
ALTER INDEX "RentTenancy_tenantId_idx" RENAME TO "RentContract_tenantId_idx";
ALTER INDEX "RentTenancy_status_idx" RENAME TO "RentContract_status_idx";

-- =============================================================================
-- 5. Electricity subsystem — rename tenancyId -> contractId columns only.
--    Existing FK constraints stay valid automatically (Postgres tracks FKs
--    by internal table reference, not name, so renaming RentTenancy ->
--    RentContract already kept them pointing at the right table).
-- =============================================================================

ALTER TABLE "RentElectricityBill" RENAME COLUMN "tenancyId" TO "contractId";

ALTER TABLE "RentElectricityPayment" RENAME COLUMN "tenancyId" TO "contractId";
ALTER INDEX "RentElectricityPayment_tenancyId_idx" RENAME TO "RentElectricityPayment_contractId_idx";

-- =============================================================================
-- 6. Legacy RentPayment table — kept as-is (untouched rows) for the
--    migration script to read from; only drop the now-unmodeled FK
--    constraint (Prisma's RentPayment model no longer declares this
--    relation). Table itself and all its data are preserved.
-- =============================================================================

ALTER TABLE "RentPayment" DROP CONSTRAINT "RentPayment_tenancyId_fkey";

-- =============================================================================
-- 7. New tables: RentBill, RentBillPayment
-- =============================================================================

CREATE TABLE "RentBill" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "lateFeeApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL DEFAULT 'AUTO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentBill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentBillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "referenceNo" TEXT,
    "notes" TEXT,
    "batchId" TEXT,
    "legacyPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentBillPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentBill_contractId_idx" ON "RentBill"("contractId");
CREATE INDEX "RentBill_status_idx" ON "RentBill"("status");
CREATE INDEX "RentBill_dueDate_idx" ON "RentBill"("dueDate");
CREATE UNIQUE INDEX "RentBill_contractId_cycleStart_key" ON "RentBill"("contractId", "cycleStart");

CREATE UNIQUE INDEX "RentBillPayment_legacyPaymentId_key" ON "RentBillPayment"("legacyPaymentId");
CREATE INDEX "RentBillPayment_billId_idx" ON "RentBillPayment"("billId");
CREATE INDEX "RentBillPayment_batchId_idx" ON "RentBillPayment"("batchId");

ALTER TABLE "RentBill" ADD CONSTRAINT "RentBill_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "RentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RentBillPayment" ADD CONSTRAINT "RentBillPayment_billId_fkey"
  FOREIGN KEY ("billId") REFERENCES "RentBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
