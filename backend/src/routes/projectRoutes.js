const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectOverview,
} = require('../controllers/projectController');
const {
  getProjectWorkLogs,
  addWorkLog,
  updateWorkLog,
  deleteWorkLog,
  uploadWorkLogPhotos,
  deleteWorkLogPhoto,
} = require('../controllers/workLogController');
const {
  getProjectWorkItems,
  addWorkItem,
  updateWorkItem,
  deleteWorkItem,
} = require('../controllers/workItemController');
const { authenticate } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `worklog_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const router = express.Router();

router.get('/', authenticate, getProjects);
router.post('/', authenticate, createProject);

router.get('/:id/overview', authenticate, getProjectOverview);

router.get('/:id/worklogs', authenticate, getProjectWorkLogs);
router.post('/:id/worklogs', authenticate, addWorkLog);
router.put('/:id/worklogs/:workLogId', authenticate, updateWorkLog);
router.delete('/:id/worklogs/:workLogId', authenticate, deleteWorkLog);
router.post('/:id/worklogs/:workLogId/photos', authenticate, upload.array('photos', 10), uploadWorkLogPhotos);
router.delete('/:id/worklogs/:workLogId/photos/:photoId', authenticate, deleteWorkLogPhoto);

router.get('/:id/workitems', authenticate, getProjectWorkItems);
router.post('/:id/workitems', authenticate, addWorkItem);
router.put('/:id/workitems/:workItemId', authenticate, updateWorkItem);
router.delete('/:id/workitems/:workItemId', authenticate, deleteWorkItem);

router.get('/:id', authenticate, getProjectById);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);

module.exports = router;
