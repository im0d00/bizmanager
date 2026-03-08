const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('admin', 'manager'), ctrl.create);
router.put('/:id', authorize('admin', 'manager'), ctrl.update);
router.delete('/:id', authorize('admin', 'manager'), ctrl.remove);

module.exports = router;
