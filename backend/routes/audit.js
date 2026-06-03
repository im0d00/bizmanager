const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.get('/', authenticate, authorize('admin', 'manager', 'auditor'), ctrl.getLogs);

module.exports = router;
