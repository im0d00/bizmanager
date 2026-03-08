const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/backupController');

router.use(authenticate, authorize('admin'));

router.get('/download', ctrl.createBackup);
router.get('/list', ctrl.getBackupsList);

module.exports = router;
