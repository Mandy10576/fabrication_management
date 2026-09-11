-- Adds billingMonth to RentElectricityBill — the calendar month a bill is
-- FOR (chosen by the admin), separate from billDate (when it was recorded).
-- Backfills every existing row from its own billDate so nothing breaks:
-- previous-reading sequencing and rent-invoice matching both switch to
-- billingMonth in the same deploy that adds this column.
-- Applied to local DB on 2026-09-11. Run this against production too
-- before/during the next deploy that ships this code.

ALTER TABLE "RentElectricityBill" ADD COLUMN IF NOT EXISTS "billingMonth" TIMESTAMP(3);

UPDATE "RentElectricityBill"
SET "billingMonth" = date_trunc('month', "billDate")
WHERE "billingMonth" IS NULL;
