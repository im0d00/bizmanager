const db = require('../database/db');

const getLogs = (req, res, next) => {
  try {
    const { page = 1, limit = 50, user_id, action, entity_type } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = '1=1';
    const params = [];

    if (user_id) {
      where += ' AND a.user_id=?';
      params.push(user_id);
    }
    if (action) {
      where += ' AND a.action LIKE ?';
      params.push(`%${action}%`);
    }
    if (entity_type) {
      where += ' AND a.entity_type=?';
      params.push(entity_type);
    }

    const logs = db.prepare(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id=a.user_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit, 10), offset);

    const total = db.prepare(`SELECT COUNT(*) AS total FROM audit_logs a WHERE ${where}`).get(...params).total;

    res.json({ logs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLogs };
