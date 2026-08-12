-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TABLE public._prisma_migrations (
  id                  character varying(36)    NOT NULL,
  checksum            character varying(64)    NOT NULL,
  finished_at         timestamp with time zone,
  migration_name      character varying(255)   NOT NULL,
  logs                text,
  rolled_back_at      timestamp with time zone,
  started_at          timestamp with time zone DEFAULT now() NOT NULL,
  applied_steps_count integer                  DEFAULT 0 NOT NULL
);

ALTER TABLE public._prisma_migrations
  ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);

GRANT ALL ON public._prisma_migrations TO anon;

GRANT ALL ON public._prisma_migrations TO authenticated;

GRANT ALL ON public._prisma_migrations TO service_role;

CREATE TABLE public."_EmployeeToWorkLog" (
  "A" text NOT NULL,
  "B" text NOT NULL
);

GRANT ALL ON public."_EmployeeToWorkLog" TO anon;

GRANT ALL ON public."_EmployeeToWorkLog" TO authenticated;

GRANT ALL ON public."_EmployeeToWorkLog" TO service_role;

CREATE UNIQUE INDEX "_EmployeeToWorkLog_AB_unique" ON public."_EmployeeToWorkLog" ("A", "B");

CREATE INDEX "_EmployeeToWorkLog_B_index" ON public."_EmployeeToWorkLog" ("B");

CREATE TABLE public."Advance" (
  id            text                           NOT NULL,
  "employeeId"  text                           NOT NULL,
  amount        double precision               NOT NULL,
  "advanceDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "paymentMode" text                           DEFAULT 'CASH'::text NOT NULL,
  "referenceNo" text,
  notes         text,
  "createdAt"   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."Advance"
  ADD CONSTRAINT "Advance_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Advance" TO anon;

GRANT ALL ON public."Advance" TO authenticated;

GRANT ALL ON public."Advance" TO service_role;

CREATE INDEX "Advance_advanceDate_idx" ON public."Advance" ("advanceDate");

CREATE INDEX "Advance_employeeId_idx" ON public."Advance" ("employeeId");

CREATE TABLE public."Attendance" (
  id           text                           NOT NULL,
  "employeeId" text                           NOT NULL,
  date         timestamp(3) without time zone NOT NULL,
  status       text                           NOT NULL,
  notes        text,
  "createdAt"  timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"  timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."Attendance"
  ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Attendance" TO anon;

GRANT ALL ON public."Attendance" TO authenticated;

GRANT ALL ON public."Attendance" TO service_role;

CREATE INDEX "Attendance_employeeId_idx" ON public."Attendance" ("employeeId");

CREATE INDEX "Attendance_date_idx" ON public."Attendance" (date);

CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON public."Attendance" ("employeeId", date);

CREATE TABLE public."Client" (
  id                text                           NOT NULL,
  "companyName"     text                           NOT NULL,
  "contactPerson"   text                           NOT NULL,
  mobile            text                           NOT NULL,
  email             text,
  gstin             text,
  pan               text,
  address           text                           NOT NULL,
  notes             text,
  "financialYearId" text                           NOT NULL,
  "createdAt"       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"       timestamp(3) without time zone NOT NULL,
  state             text
);

ALTER TABLE public."Client"
  ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Client" TO anon;

GRANT ALL ON public."Client" TO authenticated;

GRANT ALL ON public."Client" TO service_role;

CREATE INDEX "Client_financialYearId_idx" ON public."Client" ("financialYearId");

CREATE INDEX "Client_companyName_idx" ON public."Client" ("companyName");

CREATE TABLE public."CompanyDetails" (
  id                text                           NOT NULL,
  "companyName"     text                           NOT NULL,
  "ownerName"       text                           NOT NULL,
  gstin             text,
  pan               text,
  email             text,
  phone             text,
  address           text,
  "bankName"        text,
  "accountNumber"   text,
  "ifscCode"        text,
  branch            text,
  "upiId"           text,
  "logoUrl"         text,
  "termsConditions" text,
  "createdAt"       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"       timestamp(3) without time zone NOT NULL,
  state             text
);

ALTER TABLE public."CompanyDetails"
  ADD CONSTRAINT "CompanyDetails_pkey" PRIMARY KEY (id);

GRANT ALL ON public."CompanyDetails" TO anon;

GRANT ALL ON public."CompanyDetails" TO authenticated;

GRANT ALL ON public."CompanyDetails" TO service_role;

CREATE TABLE public."Employee" (
  id                    text                           NOT NULL,
  name                  text                           NOT NULL,
  mobile                text                           NOT NULL,
  address               text,
  "joiningDate"         timestamp(3) without time zone NOT NULL,
  "monthlySalary"       double precision               NOT NULL,
  "salaryCycleStartDay" integer                        DEFAULT 1 NOT NULL,
  "deductionBasis"      text                           DEFAULT 'CALENDAR_DAYS'::text NOT NULL,
  "isActive"            boolean                        DEFAULT true NOT NULL,
  notes                 text,
  "createdAt"           timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"           timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."Employee"
  ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);

ALTER TABLE public."_EmployeeToWorkLog"
  ADD CONSTRAINT "_EmployeeToWorkLog_A_fkey" FOREIGN KEY ("A") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."Advance"
  ADD CONSTRAINT "Advance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."Attendance"
  ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public."Employee" TO anon;

GRANT ALL ON public."Employee" TO authenticated;

GRANT ALL ON public."Employee" TO service_role;

CREATE INDEX "Employee_isActive_idx" ON public."Employee" ("isActive");

CREATE INDEX "Employee_name_idx" ON public."Employee" (name);

CREATE TABLE public."FinancialYear" (
  id          text                           NOT NULL,
  year        text                           NOT NULL,
  "startDate" timestamp(3) without time zone NOT NULL,
  "endDate"   timestamp(3) without time zone NOT NULL,
  "isCurrent" boolean                        DEFAULT false NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public."FinancialYear"
  ADD CONSTRAINT "FinancialYear_pkey" PRIMARY KEY (id);

ALTER TABLE public."Client"
  ADD CONSTRAINT "Client_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES public."FinancialYear"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

GRANT ALL ON public."FinancialYear" TO anon;

GRANT ALL ON public."FinancialYear" TO authenticated;

GRANT ALL ON public."FinancialYear" TO service_role;

CREATE UNIQUE INDEX "FinancialYear_year_key" ON public."FinancialYear" (year);

CREATE TABLE public."Invoice" (
  id                text                           NOT NULL,
  "invoiceNumber"   text                           NOT NULL,
  "financialYearId" text                           NOT NULL,
  "clientId"        text                           NOT NULL,
  date              timestamp(3) without time zone NOT NULL,
  "dueDate"         timestamp(3) without time zone,
  "gstType"         text                           DEFAULT 'CGST_SGST'::text NOT NULL,
  "gstRate"         double precision               DEFAULT 18.0 NOT NULL,
  subtotal          double precision               NOT NULL,
  "cgstAmount"      double precision               DEFAULT 0 NOT NULL,
  "sgstAmount"      double precision               DEFAULT 0 NOT NULL,
  "igstAmount"      double precision               DEFAULT 0 NOT NULL,
  "totalTax"        double precision               DEFAULT 0 NOT NULL,
  discount          double precision               DEFAULT 0 NOT NULL,
  "grandTotal"      double precision               NOT NULL,
  "amountInWords"   text                           NOT NULL,
  "amountReceived"  double precision               DEFAULT 0 NOT NULL,
  "balanceDue"      double precision               NOT NULL,
  status            text                           DEFAULT 'UNPAID'::text NOT NULL,
  notes             text,
  terms             text,
  "createdAt"       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"       timestamp(3) without time zone NOT NULL,
  state             text
);

ALTER TABLE public."Invoice"
  ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."Invoice"
  ADD CONSTRAINT "Invoice_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES public."FinancialYear"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public."Invoice"
  ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Invoice" TO anon;

GRANT ALL ON public."Invoice" TO authenticated;

GRANT ALL ON public."Invoice" TO service_role;

CREATE INDEX "Invoice_date_idx" ON public."Invoice" (date);

CREATE INDEX "Invoice_status_idx" ON public."Invoice" (status);

CREATE INDEX "Invoice_gstType_idx" ON public."Invoice" ("gstType");

CREATE INDEX "Invoice_financialYearId_idx" ON public."Invoice" ("financialYearId");

CREATE INDEX "Invoice_clientId_idx" ON public."Invoice" ("clientId");

CREATE TABLE public."InvoiceItem" (
  id          text             NOT NULL,
  "invoiceId" text             NOT NULL,
  description text             NOT NULL,
  "hsnSac"    text,
  quantity    double precision NOT NULL,
  unit        text             NOT NULL,
  rate        double precision NOT NULL,
  amount      double precision NOT NULL
);

ALTER TABLE public."InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY (id);

GRANT ALL ON public."InvoiceItem" TO anon;

GRANT ALL ON public."InvoiceItem" TO authenticated;

GRANT ALL ON public."InvoiceItem" TO service_role;

CREATE INDEX "InvoiceItem_invoiceId_idx" ON public."InvoiceItem" ("invoiceId");

CREATE TABLE public."MaterialUsed" (
  id             text             NOT NULL,
  "workLogId"    text             NOT NULL,
  "materialName" text             NOT NULL,
  quantity       double precision NOT NULL,
  unit           text             NOT NULL
);

ALTER TABLE public."MaterialUsed"
  ADD CONSTRAINT "MaterialUsed_pkey" PRIMARY KEY (id);

GRANT ALL ON public."MaterialUsed" TO anon;

GRANT ALL ON public."MaterialUsed" TO authenticated;

GRANT ALL ON public."MaterialUsed" TO service_role;

CREATE INDEX "MaterialUsed_workLogId_idx" ON public."MaterialUsed" ("workLogId");

CREATE TABLE public."Payment" (
  id            text                           NOT NULL,
  "invoiceId"   text                           NOT NULL,
  amount        double precision               NOT NULL,
  "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "paymentMode" text                           DEFAULT 'CASH'::text NOT NULL,
  "referenceNo" text,
  notes         text,
  "createdAt"   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."Payment"
  ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."Payment"
  ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Payment" TO anon;

GRANT ALL ON public."Payment" TO authenticated;

GRANT ALL ON public."Payment" TO service_role;

CREATE INDEX "Payment_invoiceId_idx" ON public."Payment" ("invoiceId");

CREATE INDEX "Payment_paymentDate_idx" ON public."Payment" ("paymentDate");

CREATE TABLE public."Project" (
  id                   text                           NOT NULL,
  "clientId"           text                           NOT NULL,
  name                 text                           NOT NULL,
  "siteAddress"        text                           NOT NULL,
  "contactNumber"      text,
  "startDate"          timestamp(3) without time zone NOT NULL,
  "expectedCompletion" timestamp(3) without time zone,
  status               text                           DEFAULT 'ACTIVE'::text NOT NULL,
  notes                text,
  "createdAt"          timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"          timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."Project"
  ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public."Project"
  ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Project" TO anon;

GRANT ALL ON public."Project" TO authenticated;

GRANT ALL ON public."Project" TO service_role;

CREATE INDEX "Project_status_idx" ON public."Project" (status);

CREATE INDEX "Project_clientId_idx" ON public."Project" ("clientId");

CREATE INDEX "Project_name_idx" ON public."Project" (name);

CREATE TABLE public."Quotation" (
  id                   text                           NOT NULL,
  "quotationNumber"    text                           NOT NULL,
  "financialYearId"    text                           NOT NULL,
  "clientId"           text                           NOT NULL,
  date                 timestamp(3) without time zone NOT NULL,
  "validUntil"         timestamp(3) without time zone,
  "gstType"            text                           DEFAULT 'CGST_SGST'::text NOT NULL,
  "gstRate"            double precision               DEFAULT 18.0 NOT NULL,
  subtotal             double precision               NOT NULL,
  "taxAmount"          double precision               DEFAULT 0 NOT NULL,
  discount             double precision               DEFAULT 0 NOT NULL,
  "grandTotal"         double precision               NOT NULL,
  status               text                           DEFAULT 'PENDING'::text NOT NULL,
  "convertedInvoiceId" text,
  notes                text,
  terms                text,
  "createdAt"          timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"          timestamp(3) without time zone NOT NULL,
  state                text
);

ALTER TABLE public."Quotation"
  ADD CONSTRAINT "Quotation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."Quotation"
  ADD CONSTRAINT "Quotation_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES public."FinancialYear"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public."Quotation"
  ADD CONSTRAINT "Quotation_pkey" PRIMARY KEY (id);

GRANT ALL ON public."Quotation" TO anon;

GRANT ALL ON public."Quotation" TO authenticated;

GRANT ALL ON public."Quotation" TO service_role;

CREATE INDEX "Quotation_date_idx" ON public."Quotation" (date);

CREATE INDEX "Quotation_financialYearId_idx" ON public."Quotation" ("financialYearId");

CREATE INDEX "Quotation_clientId_idx" ON public."Quotation" ("clientId");

CREATE INDEX "Quotation_status_idx" ON public."Quotation" (status);

CREATE TABLE public."QuotationItem" (
  id            text             NOT NULL,
  "quotationId" text             NOT NULL,
  description   text             NOT NULL,
  "hsnSac"      text,
  quantity      double precision NOT NULL,
  unit          text             NOT NULL,
  rate          double precision NOT NULL,
  amount        double precision NOT NULL
);

ALTER TABLE public."QuotationItem"
  ADD CONSTRAINT "QuotationItem_pkey" PRIMARY KEY (id);

ALTER TABLE public."QuotationItem"
  ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public."Quotation"(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public."QuotationItem" TO anon;

GRANT ALL ON public."QuotationItem" TO authenticated;

GRANT ALL ON public."QuotationItem" TO service_role;

CREATE INDEX "QuotationItem_quotationId_idx" ON public."QuotationItem" ("quotationId");

CREATE TABLE public."RateMaster" (
  id            text                           NOT NULL,
  "serviceName" text                           NOT NULL,
  "hsnSac"      text                           DEFAULT ''::text NOT NULL,
  unit          text                           DEFAULT 'sq ft'::text NOT NULL,
  rate          double precision               NOT NULL,
  description   text,
  "createdAt"   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."RateMaster"
  ADD CONSTRAINT "RateMaster_pkey" PRIMARY KEY (id);

GRANT ALL ON public."RateMaster" TO anon;

GRANT ALL ON public."RateMaster" TO authenticated;

GRANT ALL ON public."RateMaster" TO service_role;

CREATE INDEX "RateMaster_serviceName_idx" ON public."RateMaster" ("serviceName");

CREATE TABLE public."SalaryPayment" (
  id            text                           NOT NULL,
  "employeeId"  text                           NOT NULL,
  "cycleStart"  timestamp(3) without time zone NOT NULL,
  amount        double precision               NOT NULL,
  "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "paymentMode" text                           DEFAULT 'CASH'::text NOT NULL,
  "referenceNo" text,
  notes         text,
  "createdAt"   timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."SalaryPayment"
  ADD CONSTRAINT "SalaryPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."SalaryPayment"
  ADD CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY (id);

GRANT ALL ON public."SalaryPayment" TO anon;

GRANT ALL ON public."SalaryPayment" TO authenticated;

GRANT ALL ON public."SalaryPayment" TO service_role;

CREATE INDEX "SalaryPayment_paymentDate_idx" ON public."SalaryPayment" ("paymentDate");

CREATE INDEX "SalaryPayment_employeeId_cycleStart_idx" ON public."SalaryPayment" ("employeeId", "cycleStart");

CREATE INDEX "SalaryPayment_employeeId_idx" ON public."SalaryPayment" ("employeeId");

CREATE TABLE public."User" (
  id          text                           NOT NULL,
  email       text                           NOT NULL,
  password    text                           NOT NULL,
  name        text                           NOT NULL,
  role        text                           DEFAULT 'ADMIN'::text NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."User"
  ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

GRANT ALL ON public."User" TO anon;

GRANT ALL ON public."User" TO authenticated;

GRANT ALL ON public."User" TO service_role;

CREATE UNIQUE INDEX "User_email_key" ON public."User" (email);

CREATE TABLE public."WorkItem" (
  id          text                           NOT NULL,
  "projectId" text                           NOT NULL,
  name        text                           NOT NULL,
  status      text                           DEFAULT 'PENDING'::text NOT NULL,
  "sortOrder" integer                        DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."WorkItem"
  ADD CONSTRAINT "WorkItem_pkey" PRIMARY KEY (id);

ALTER TABLE public."WorkItem"
  ADD CONSTRAINT "WorkItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public."WorkItem" TO anon;

GRANT ALL ON public."WorkItem" TO authenticated;

GRANT ALL ON public."WorkItem" TO service_role;

CREATE INDEX "WorkItem_projectId_status_idx" ON public."WorkItem" ("projectId", status);

CREATE INDEX "WorkItem_projectId_idx" ON public."WorkItem" ("projectId");

CREATE TABLE public."WorkLog" (
  id                text                           NOT NULL,
  "projectId"       text                           NOT NULL,
  "visitDate"       timestamp(3) without time zone NOT NULL,
  "visitTime"       text,
  "workDone"        text,
  "workInProgress"  text,
  "workPending"     text,
  amount            double precision               DEFAULT 0 NOT NULL,
  "paymentReceived" double precision               DEFAULT 0 NOT NULL,
  "paymentMode"     text                           DEFAULT 'CASH'::text NOT NULL,
  notes             text,
  "createdAt"       timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt"       timestamp(3) without time zone NOT NULL
);

ALTER TABLE public."WorkLog"
  ADD CONSTRAINT "WorkLog_pkey" PRIMARY KEY (id);

ALTER TABLE public."_EmployeeToWorkLog"
  ADD CONSTRAINT "_EmployeeToWorkLog_B_fkey" FOREIGN KEY ("B") REFERENCES public."WorkLog"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."MaterialUsed"
  ADD CONSTRAINT "MaterialUsed_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES public."WorkLog"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."WorkLog"
  ADD CONSTRAINT "WorkLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public."WorkLog" TO anon;

GRANT ALL ON public."WorkLog" TO authenticated;

GRANT ALL ON public."WorkLog" TO service_role;

CREATE INDEX "WorkLog_projectId_visitDate_idx" ON public."WorkLog" ("projectId", "visitDate");

CREATE INDEX "WorkLog_visitDate_idx" ON public."WorkLog" ("visitDate");

CREATE INDEX "WorkLog_projectId_idx" ON public."WorkLog" ("projectId");

CREATE TABLE public."WorkLogPhoto" (
  id          text                           NOT NULL,
  "workLogId" text                           NOT NULL,
  url         text                           NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public."WorkLogPhoto"
  ADD CONSTRAINT "WorkLogPhoto_pkey" PRIMARY KEY (id);

ALTER TABLE public."WorkLogPhoto"
  ADD CONSTRAINT "WorkLogPhoto_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES public."WorkLog"(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public."WorkLogPhoto" TO anon;

GRANT ALL ON public."WorkLogPhoto" TO authenticated;

GRANT ALL ON public."WorkLogPhoto" TO service_role;

CREATE INDEX "WorkLogPhoto_workLogId_idx" ON public."WorkLogPhoto" ("workLogId");
