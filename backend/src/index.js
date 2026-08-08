const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const financialYearRoutes = require('./routes/financialYearRoutes');
const companyRoutes = require('./routes/companyRoutes');
const clientRoutes = require('./routes/clientRoutes');
const rateRoutes = require('./routes/rateRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const backupRoutes = require('./routes/backupRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const advanceRoutes = require('./routes/advanceRoutes');
const projectRoutes = require('./routes/projectRoutes');
const workLogRoutes = require('./routes/workLogRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    // Ignore read-only errors in serverless
  }
}

// Middleware
app.use(compression());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// API Routes (supports both /api/path and /path for Vercel serverless rewrites)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/financial-years', '/financial-years'], financialYearRoutes);
app.use(['/api/company', '/company'], companyRoutes);
app.use(['/api/clients', '/clients'], clientRoutes);
app.use(['/api/rates', '/rates'], rateRoutes);
app.use(['/api/invoices', '/invoices'], invoiceRoutes);
app.use(['/api/quotations', '/quotations'], quotationRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/backup', '/backup'], backupRoutes);
app.use(['/api/pdf', '/pdf'], pdfRoutes);
app.use(['/api/employees', '/employees'], employeeRoutes);
app.use(['/api/attendance', '/attendance'], attendanceRoutes);
app.use(['/api/salary', '/salary'], salaryRoutes);
app.use(['/api/advances', '/advances'], advanceRoutes);
app.use(['/api/projects', '/projects'], projectRoutes);
app.use(['/api/worklogs', '/worklogs'], workLogRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', service: 'Fabrication Business Management API' });
});

// Fallback 404 handler for API routes
app.use((req, res, next) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Error handling middleware
app.use(errorHandler);

// Start server if run directly (local node execution)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fabrication Backend API Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
