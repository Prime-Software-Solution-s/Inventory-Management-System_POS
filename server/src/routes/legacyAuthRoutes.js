const express = require('express');
const { login } = require('../controllers/authController');

const router = express.Router();

// Legacy compatibility: some clients expect POST /api/login.
router.post('/login', login);

module.exports = router;

