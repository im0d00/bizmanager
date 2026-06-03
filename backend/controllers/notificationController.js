const db = require('../database/db');

const getMyNotifications = (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 200`
    ).all(req.user.id);

    const unread = rows.filter((n) => !n.is_read).length;
    res.json({ notifications: rows, unread_count: unread });
  } catch (err) {
    next(err);
  }
};

const markRead = (req, res, next) => {
  try {
    const result = db.prepare(
      `UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`
    ).run(req.params.id, req.user.id);
    if (!result.changes) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

const markAllRead = (req, res, next) => {
  try {
    db.prepare(`UPDATE notifications SET is_read=1 WHERE user_id=?`).run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyNotifications, markRead, markAllRead };
