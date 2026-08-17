-- Adds a flat discount field to RentBill (subtracted from the bill total).
-- Applied to local DB on 2026-08-17. Run this against production too before/
-- during the next deploy that ships this code (same pattern as `forced` and
-- `miscAmount`/`miscLabel`).

ALTER TABLE "RentBill" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
