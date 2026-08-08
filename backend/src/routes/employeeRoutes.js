const express = require('express');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const {
  getEmployeeAttendance,
  setAttendance,
  deleteAttendanceOverride,
} = require('../controllers/attendanceController');
const {
  getEmployeeAdvances,
  addAdvance,
  deleteAdvance,
} = require('../controllers/advanceController');
const {
  getEmployeeSalary,
  getEmployeeSalaryPayments,
  addSalaryPayment,
  deleteSalaryPayment,
} = require('../controllers/salaryController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getEmployees);
router.post('/', authenticate, createEmployee);

router.get('/:id/attendance', authenticate, getEmployeeAttendance);
router.post('/:id/attendance', authenticate, setAttendance);
router.delete('/:id/attendance/:date', authenticate, deleteAttendanceOverride);

router.get('/:id/advances', authenticate, getEmployeeAdvances);
router.post('/:id/advances', authenticate, addAdvance);
router.delete('/:id/advances/:advanceId', authenticate, deleteAdvance);

router.get('/:id/salary', authenticate, getEmployeeSalary);
router.get('/:id/salary-payments', authenticate, getEmployeeSalaryPayments);
router.post('/:id/salary-payments', authenticate, addSalaryPayment);
router.delete('/:id/salary-payments/:paymentId', authenticate, deleteSalaryPayment);

router.get('/:id', authenticate, getEmployeeById);
router.put('/:id', authenticate, updateEmployee);
router.delete('/:id', authenticate, deleteEmployee);

module.exports = router;
