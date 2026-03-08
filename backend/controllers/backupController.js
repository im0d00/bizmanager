const path = require('path');
const fs = require('fs');
const db = require('../database/db');

const createBackup = async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const DB_PATH = process.env.DB_PATH || './database/bizmanager.db';
    const dbDir = path.dirname(path.resolve(DB_PATH));
    const backupPath = path.join(dbDir, `backup-${timestamp}.db`);

    await db.backup(backupPath);

    res.download(backupPath, `bizmanager-backup-${timestamp}.db`, (err) => {
      setTimeout(() => {
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      }, 5000);
      if (err && !res.headersSent) next(err);
    });
  } catch (err) {
    next(err);
  }
};

const getBackupsList = (req, res, next) => {
  try {
    const DB_PATH = process.env.DB_PATH || './database/bizmanager.db';
    const dbDir = path.dirname(path.resolve(DB_PATH));
    if (!fs.existsSync(dbDir)) return res.json({ backups: [] });

    const files = fs.readdirSync(dbDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(dbDir, f));
        return { name: f, size: stats.size, created_at: stats.birthtime.toISOString() };
      });

    res.json({ backups: files });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBackup, getBackupsList };
