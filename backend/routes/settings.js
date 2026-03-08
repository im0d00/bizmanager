const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

router.get('/', authenticate, ctrl.getAll);
router.put('/', authenticate, authorize('admin'), ctrl.update);

module.exports = router;
