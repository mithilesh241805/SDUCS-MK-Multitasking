const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  uploadFile, getFiles, getDuplicates, deleteFile, restoreFile,
  permanentDelete, shareFile, accessSharedFile, getRecycleBin,
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

// Memory storage for file uploads (encrypt then upload to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB max per file
  fileFilter: (req, file, cb) => {
    // Block executables
    const blocked = ['.exe', '.bat', '.com', '.cmd', '.ps1', '.sh', '.vbs'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error('Executable files are not allowed'), false);
    }
    cb(null, true);
  },
});

router.use(protect);

// File CRUD
router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.delete('/:id', deleteFile);
router.post('/:id/restore', restoreFile);
router.delete('/:id/permanent', permanentDelete);
router.post('/:id/share', shareFile);

// Recycle bin
router.get('/recycle-bin', getRecycleBin);

// Duplicates
router.get('/duplicates', getDuplicates);

// Shared file access (no auth required - public route)
router.get('/share/:token', accessSharedFile);

module.exports = router;
