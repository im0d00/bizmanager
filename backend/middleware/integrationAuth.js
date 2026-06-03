const crypto = require('crypto');
const db = require('../database/db');

const hashApiKey = (key) => crypto.createHash('sha256').update(String(key || '')).digest('hex');

const authenticateIntegration = (scope) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing integration API key' });

    const keyHash = hashApiKey(apiKey);
    const client = db.prepare(
      `SELECT * FROM integration_clients WHERE api_key_hash=? AND is_active=1`
    ).get(keyHash);

    if (!client) return res.status(401).json({ error: 'Invalid integration API key' });

    const scopes = new Set(String(client.scopes || '').split(',').map(s => s.trim()).filter(Boolean));
    if (scope && !scopes.has(scope)) {
      return res.status(403).json({ error: 'Integration scope not allowed' });
    }

    req.integration = {
      id: client.id,
      name: client.name,
      provider: client.provider,
      scopes: Array.from(scopes)
    };

    next();
  };
};

module.exports = { authenticateIntegration, hashApiKey };
