const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/saleController');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.patch('/:id/status', authorize('admin', 'manager'), ctrl.updateStatus);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
