const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { authenticateIntegration } = require('../middleware/integrationAuth');
const ctrl = require('../controllers/inventoryController');

router.get('/overview', authenticate, ctrl.getOverview);
router.get('/balances', authenticate, ctrl.getBalances);
router.get('/predictive-reorder', authenticate, ctrl.getPredictive);
router.post('/warehouses', authenticate, authorize('admin', 'manager'), ctrl.createWarehouse);
router.post('/transfer', authenticate, authorize('admin', 'manager', 'warehouse'), ctrl.transferStock);
router.post('/reorder-rules', authenticate, authorize('admin', 'manager'), ctrl.upsertRule);
router.post('/sync', authenticateIntegration('inventory:write'), ctrl.syncFromIntegration);

module.exports = router;
