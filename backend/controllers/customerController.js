const db = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    const customers = db.prepare(
      `SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
       ORDER BY name ASC LIMIT ? OFFSET ?`
    ).all(like, like, like, parseInt(limit), offset);

    const { total } = db.prepare(
      `SELECT COUNT(*) as total FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?`
    ).get(like, like, like);

    res.json({ customers, total });
  } catch (err) {
    next(err);
  }
};

const getOne = (req, res, next) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const recentSales = db.prepare(
      `SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10`
    ).all(req.params.id);

    res.json({ ...customer, recent_sales: recentSales });
  } catch (err) {
    next(err);
  }
};

const create = (req, res, next) => {
  try {
    const { name, email, phone, address, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO customers (name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?)`
    ).run(name, email || null, phone || null, address || null, notes || null);
    const customer = db.prepare('SELECT * FROM customers WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

const update = (req, res, next) => {
  try {
    const { name, email, phone, address, notes } = req.body;
    db.prepare(
      `UPDATE customers SET name=?, email=?, phone=?, address=?, notes=?, updated_at=datetime('now') WHERE id=?`
    ).run(name, email || null, phone || null, address || null, notes || null, req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
};

const remove = (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove };
