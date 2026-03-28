const express = require('express');
const {
  listSales,
  getSale,
  createSale,
  createSaleHold,
  updateSaleHold,
  finalizeSaleHold,
  deleteSaleHold,
} = require('../controllers/salesController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(protect, listSales).post(protect, authorize('admin', 'staff'), createSale);
router.post('/hold', protect, authorize('admin', 'staff'), createSaleHold);
router.patch('/:id/hold', protect, authorize('admin', 'staff'), updateSaleHold);
router.post('/:id/finalize', protect, authorize('admin', 'staff'), finalizeSaleHold);
router.delete('/:id/hold', protect, authorize('admin', 'staff'), deleteSaleHold);
router.get('/:id', protect, getSale);

module.exports = router;
