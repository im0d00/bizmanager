const db = require('../database/db');

const logAudit = ({ userId = null, action, entityType, entityId = null, metadata = null }) => {
  if (!action || !entityType) return;
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null);
};

module.exports = { logAudit };
