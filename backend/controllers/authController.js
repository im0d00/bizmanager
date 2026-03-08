const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const storeRefreshToken = (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
};

const login = (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tokens = generateTokens(user);
    storeRefreshToken(user.id, tokens.refreshToken);
    res.json({
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url }
    });
  } catch (err) {
    next(err);
  }
};

const register = (req, res, next) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, role);
    const user = db.prepare('SELECT id, name, email, role, avatar_url FROM users WHERE rowid = ?').get(result.lastInsertRowid);
    const tokens = generateTokens(user);
    storeRefreshToken(user.id, tokens.refreshToken);
    res.status(201).json({
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url }
    });
  } catch (err) {
    next(err);
  }
};

const refresh = (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
    if (!stored) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (new Date(stored.expires_at) < new Date()) {
      db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
    const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    const tokens = generateTokens(user);
    storeRefreshToken(user.id, tokens.refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

const logout = (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

const me = (req, res) => {
  res.json(req.user);
};

module.exports = { login, register, refresh, logout, me };
