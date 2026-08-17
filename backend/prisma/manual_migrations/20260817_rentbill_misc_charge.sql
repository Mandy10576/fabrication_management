-- Adds an ad-hoc "miscellaneous charge" field pair to RentBill.
-- Applied to local DB on 2026-08-17. Run this against production too before/
-- during the next deploy that ships this code (same pattern as the earlier
-- `forced` column addition).

ALTER TABLE "RentBill" ADD COLUMN IF NOT EXISTS "miscAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RentBill" ADD COLUMN IF NOT EXISTS "miscLabel" TEXT;
