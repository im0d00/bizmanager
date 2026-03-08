const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(authenticate, authorize('admin', 'manager'));

router.get('/summary', ctrl.summary);
router.get('/daily-sales', ctrl.dailySales);
router.get('/monthly-sales', ctrl.monthlySales);
router.get('/top-products', ctrl.topProducts);
router.get('/top-customers', ctrl.topCustomers);
router.get('/expenses-by-category', ctrl.expensesByCategory);

module.exports = router;
