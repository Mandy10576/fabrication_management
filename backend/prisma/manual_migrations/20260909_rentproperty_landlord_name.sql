-- Adds per-property landlord details (name + address) to RentProperty. Both
-- optional: when unset, rent invoices keep falling back to the company-wide
-- owner name / address (CompanyDetails), so existing properties are
-- unaffected. Applied to local DB on 2026-09-09. Run this against production
-- too before/during the next deploy that ships this code (same pattern as
-- `discountAmount` and `miscAmount`/`miscLabel`).

ALTER TABLE "RentProperty" ADD COLUMN IF NOT EXISTS "landlordName" TEXT;
ALTER TABLE "RentProperty" ADD COLUMN IF NOT EXISTS "landlordAddress" TEXT;
