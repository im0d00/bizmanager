const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/integrationController');

router.use(authenticate, authorize('admin'));
router.get('/clients', ctrl.listClients);
router.post('/clients', ctrl.createClient);

module.exports = router;
