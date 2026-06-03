const crypto = require('crypto');
const db = require('../database/db');
const { hashApiKey } = require('../middleware/integrationAuth');
const { logAudit } = require('../services/auditService');

const generateApiKey = () => `bm_${crypto.randomBytes(24).toString('hex')}`;

const listClients = (req, res, next) => {
  try {
    const clients = db.prepare(
      `SELECT id, name, provider, scopes, is_active, created_at, updated_at FROM integration_clients ORDER BY created_at DESC`
    ).all();
    res.json({ clients });
  } catch (err) {
    next(err);
  }
};

const createClient = (req, res, next) => {
  try {
    const { name, provider, scopes = ['inventory:write'] } = req.body;
    if (!name || !provider) return res.status(400).json({ error: 'name and provider are required' });

    const apiKey = generateApiKey();
    const scopeList = Array.isArray(scopes) ? scopes.join(',') : String(scopes);

    const result = db.prepare(
      `INSERT INTO integration_clients (name, provider, api_key_hash, scopes, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).run(name, provider, hashApiKey(apiKey), scopeList);

    const client = db.prepare(
      `SELECT id, name, provider, scopes, is_active, created_at FROM integration_clients WHERE rowid=?`
    ).get(result.lastInsertRowid);

    logAudit({
      userId: req.user?.id,
      action: 'integration.created',
      entityType: 'integration_client',
      entityId: client.id,
      metadata: { name, provider, scopes: scopeList }
    });

    res.status(201).json({ client, api_key: apiKey });
  } catch (err) {
    next(err);
  }
};

module.exports = { listClients, createClient };
