const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate, ctrl.login
);

router.post('/register',
  [
    body('name').isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'manager', 'employee'])
  ],
  validate, ctrl.register
);

router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate, ctrl.refresh
);

router.post('/logout', ctrl.logout);

router.get('/me', authenticate, ctrl.me);

module.exports = router;
