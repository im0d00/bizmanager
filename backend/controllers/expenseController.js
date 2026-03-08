const db = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, category, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    let where = `title LIKE ?`;
    const params = [like];

    if (category) {
      where += ` AND category = ?`;
      params.push(category);
    }
    if (from) {
      where += ` AND date >= ?`;
      params.push(from);
    }
    if (to) {
      where += ` AND date <= ?`;
      params.push(to);
    }

    const expenses = db.prepare(
      `SELECT * FROM expenses WHERE ${where} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM expenses WHERE ${where}`).get(...params);
    const { totalAmount } = db.prepare(`SELECT COALESCE(SUM(amount),0) as totalAmount FROM expenses WHERE ${where}`).get(...params);

    const categories = db.prepare('SELECT DISTINCT category FROM expenses ORDER BY category ASC').all().map(r => r.category);

    res.json({ expenses, total, totalAmount, categories });
  } catch (err) {
    next(err);
  }
};

const create = (req, res, next) => {
  try {
    const { title, amount, category = 'General', date, notes } = req.body;
    const expDate = date || new Date().toISOString().split('T')[0];
    const result = db.prepare(
      `INSERT INTO expenses (title, amount, category, date, notes, user_id) VALUES (?,?,?,?,?,?)`
    ).run(title, parseFloat(amount), category, expDate, notes || null, req.user.id);
    const expense = db.prepare('SELECT * FROM expenses WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
};

const update = (req, res, next) => {
  try {
    const { title, amount, category, date, notes } = req.body;
    db.prepare(
      `UPDATE expenses SET title=?, amount=?, category=?, date=?, notes=?, updated_at=datetime('now') WHERE id=?`
    ).run(title, parseFloat(amount), category || 'General', date, notes || null, req.params.id);
    const expense = db.prepare('SELECT * FROM expenses WHERE id=?').get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    next(err);
  }
};

const remove = (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
