const express = require('express');
const {
  createStaffAccount,
  getStaffAccountDetails,
  listStaffAccounts,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router
  .route('/staff')
  .get(protect, authorize('admin'), listStaffAccounts)
  .post(protect, authorize('admin'), createStaffAccount);
router.get('/staff/:id/details', protect, authorize('admin'), getStaffAccountDetails);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
