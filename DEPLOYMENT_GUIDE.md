# 🚀 Complete Deployment Guide: AWS RDS PostgreSQL & Vercel

This guide outlines the step-by-step process to deploy your **Fabrication Business Management System** to **Vercel** (Frontend + Express Serverless API) and **AWS RDS** (PostgreSQL Database).

---

## 🗄️ Part 1: Setup AWS RDS PostgreSQL Database

### 1. Create PostgreSQL Database on AWS RDS
1. Sign in to the **AWS Management Console** and navigate to **RDS**.
2. Click **Create database**.
3. Choose **Standard create** → Database options: **PostgreSQL**.
4. Engine Version: **PostgreSQL 15** or **16**.
5. Templates: Select **Free Tier** or **Production** based on your requirement.
6. Settings:
   - **DB Instance Identifier**: `fabrication-db-instance`
   - **Master Username**: `postgres` (or your preferred admin username)
   - **Master Password**: Create a strong password (e.g. `FabricationSecure2026!`)
7. Connectivity:
   - **Public Access**: Select **Yes** (if you wish to push migrations/seeds directly from local terminal).
   - **VPC Security Group**: Choose or create a security group that allows inbound traffic on port `5432` from your IP / Vercel.
8. Database Name under Additional Configuration:
   - **Initial Database Name**: `fabrication_db`
9. Click **Create database**.

### 2. Copy AWS RDS Connection Endpoint
Once created, copy your endpoint from the RDS Instance details tab (e.g., `fabrication-db-instance.c123456789.us-east-1.rds.amazonaws.com`).

Construct your connection string:
```env
DATABASE_URL="postgresql://postgres:FabricationSecure2026!@fabrication-db-instance.c123456789.us-east-1.rds.amazonaws.com:5432/fabrication_db?schema=public&sslmode=require"
```

---

## 💻 Part 2: Push Prisma Schema & Seed Data to AWS RDS

Run the following commands locally with your AWS RDS `DATABASE_URL` set in `backend/.env`:

1. **Update `backend/.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:FabricationSecure2026!@fabrication-db-instance.c123456789.us-east-1.rds.amazonaws.com:5432/fabrication_db?schema=public&sslmode=require"
   JWT_SECRET="fabrication_super_secret_jwt_key_2026_admin"
   ```

2. **Generate Prisma Client & Push Database Schema to AWS RDS**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```

3. **Seed Khodiyar Steel Fabrication Initial Data & Admin**:
   ```bash
   node prisma/seed.js
   ```

---

## ⚡ Part 3: Deploy Full-Stack Monorepo to Vercel

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI globally (if not installed):
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from root project directory:
   ```bash
   vercel
   ```

4. Set Environment Variables on Vercel:
   ```bash
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   ```

5. Deploy to Production:
   ```bash
   vercel --prod
   ```

---

### Option B: Deploying via GitHub & Vercel Dashboard

1. Push your project folder (`Website4`) to a new **GitHub repository**.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Click **Add New Project**.
3. Import your GitHub repository.
4. Framework Preset: Select **Vite** or **Other**.
5. **Environment Variables**: Add the following under Project Settings → Environment Variables:
   - `DATABASE_URL`: Your AWS RDS PostgreSQL connection string.
   - `JWT_SECRET`: Your production JWT secret key.
   - `NODE_ENV`: `production`
6. Click **Deploy**. Vercel will automatically build the React frontend and deploy the Express API serverless functions.

---

## 🛡️ Production Verification & Admin Access

Once deployed, visit your Vercel URL (e.g. `https://your-fabrication-app.vercel.app`):
- **Admin Portal**: `https://your-fabrication-app.vercel.app/login`
- **Default Owner Email**: `admin@apexsteel.com`
- **Default Password**: `admin123`
