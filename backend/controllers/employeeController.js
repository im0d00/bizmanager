const bcrypt = require('bcryptjs');
const db = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    const employees = db.prepare(
      `SELECT * FROM employees WHERE name LIKE ? OR email LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?`
    ).all(like, like, parseInt(limit), offset);

    const { total } = db.prepare(
      `SELECT COUNT(*) as total FROM employees WHERE name LIKE ? OR email LIKE ?`
    ).get(like, like);

    res.json({ employees, total });
  } catch (err) {
    next(err);
  }
};

const create = (req, res, next) => {
  try {
    const { name, email, phone, role = 'employee', department, salary, hire_date, notes, create_user, password } = req.body;

    let userId = null;
    if (create_user && email && password) {
      const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
      if (!existing) {
        const hash = bcrypt.hashSync(password, 12);
        const userResult = db.prepare(
          `INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`
        ).run(name, email, hash, role);
        const user = db.prepare('SELECT id FROM users WHERE rowid=?').get(userResult.lastInsertRowid);
        userId = user.id;
      }
    }

    const result = db.prepare(
      `INSERT INTO employees (name, email, phone, role, department, salary, hire_date, notes, user_id)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(name, email || null, phone || null, role, department || null,
      parseFloat(salary) || 0, hire_date || null, notes || null, userId);

    const employee = db.prepare('SELECT * FROM employees WHERE rowid=?').get(result.lastInsertRowid);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
};

const update = (req, res, next) => {
  try {
    const { name, email, phone, role, department, salary, hire_date, notes, is_active } = req.body;
    db.prepare(
      `UPDATE employees SET name=?, email=?, phone=?, role=?, department=?, salary=?, hire_date=?,
       notes=?, is_active=?, updated_at=datetime('now') WHERE id=?`
    ).run(name, email || null, phone || null, role || 'employee', department || null,
      parseFloat(salary) || 0, hire_date || null, notes || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);
    const employee = db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

const remove = (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
