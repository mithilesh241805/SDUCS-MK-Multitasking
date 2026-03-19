const express = require('express');
const router = express.Router();
const { analyzeUrl, startDownload, getDownloads, cancelDownload } = require('../controllers/downloadController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/analyze', analyzeUrl);
router.post('/start', startDownload);
router.get('/', getDownloads);
router.delete('/:id', cancelDownload);

module.exports = router;
