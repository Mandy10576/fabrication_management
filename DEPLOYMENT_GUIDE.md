# 🚀 Complete Deployment Guide: Supabase PostgreSQL & Vercel

This guide outlines the step-by-step process to deploy your **Fabrication Business Management System** to **Vercel** (Frontend + Express Serverless API) and **Supabase** (PostgreSQL Database with Connection Pooling).

---

## 🗄️ Part 1: Setup Supabase PostgreSQL Database

### 1. Create a Supabase Project
1. Sign in to [Supabase](https://supabase.com) and click **New Project**.
2. Project Name: `fabrication-management`.
3. Set a strong **Database Password** (e.g. `FabricationSecure2026!`).
4. Select Region: **AP South 1 (Mumbai)** or closest region.

### 2. Copy Supabase Connection Strings
Go to **Project Settings → Database → Connection Strings**:

1. **Transaction Pooler (`DATABASE_URL`)** - Port `6543`:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
2. **Session / Direct Connection (`DIRECT_URL`)** - Port `5432`:
   ```env
   DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
   ```

---

## 💻 Part 2: Push Prisma Schema & Seed Data

Run the following commands with your Supabase connection strings set in `backend/.env`:

1. **Generate Prisma Client & Push Database Schema to Supabase**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```

2. **Seed Khodiyar Steel Fabrication Initial Data & Admin**:
   ```bash
   node prisma/seed.js
   ```

---

## ⚡ Part 3: Deploy Full-Stack Monorepo to Vercel

### Set Environment Variables on Vercel:
Add the following under Vercel Project Settings → Environment Variables:
- `DATABASE_URL`: Your Supabase Transaction Pooler connection string (`port 6543?pgbouncer=true`).
- `DIRECT_URL`: Your Supabase Direct connection string (`port 5432`).
- `JWT_SECRET`: Your production JWT secret key.
- `NODE_ENV`: `production`

---

## 🛡️ Production Verification & Admin Access

Once deployed, visit your Vercel URL (e.g. `https://fabrication-management-6zti-phi.vercel.app`):
- **Admin Portal**: `/login`
- **Default Owner Email**: `admin@apexsteel.com`
- **Default Password**: `admin123`

