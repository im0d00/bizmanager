const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/productController');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/low-stock', ctrl.getLowStock);
router.get('/:id', ctrl.getOne);
router.post('/categories', authorize('admin', 'manager'), ctrl.createCategory);
router.post('/', authorize('admin', 'manager', 'warehouse'), ctrl.create);
router.put('/:id', authorize('admin', 'manager', 'warehouse'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
