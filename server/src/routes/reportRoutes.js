const express = require('express');
const { getReports } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getReports);

module.exports = router;
