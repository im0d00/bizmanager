require('dotenv').config();
require('./database/db');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/dashboard', apiLimiter, require('./routes/dashboard'));
app.use('/api/customers', apiLimiter, require('./routes/customers'));
app.use('/api/products', apiLimiter, require('./routes/products'));
app.use('/api/sales', apiLimiter, require('./routes/sales'));
app.use('/api/expenses', apiLimiter, require('./routes/expenses'));
app.use('/api/employees', apiLimiter, require('./routes/employees'));
app.use('/api/reports', apiLimiter, require('./routes/reports'));
app.use('/api/settings', apiLimiter, require('./routes/settings'));
app.use('/api/backup', apiLimiter, require('./routes/backup'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(require('./middleware/errorHandler'));
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

app.listen(PORT, () => {
  console.log(`BizManager API running on port ${PORT}`);
});

module.exports = app;
