const db = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

const update = (req, res, next) => {
  try {
    const upsert = db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    );
    const updateMany = db.transaction((body) => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, String(value));
      }
    });
    updateMany(req.body);

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, update };
