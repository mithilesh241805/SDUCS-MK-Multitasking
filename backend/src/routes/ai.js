const express = require('express');
const router = express.Router();
const { getStorageSuggestions, chatWithAI, recategorizeFiles } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/suggestions', getStorageSuggestions);
router.post('/chat', chatWithAI);
router.post('/recategorize', recategorizeFiles);

module.exports = router;
