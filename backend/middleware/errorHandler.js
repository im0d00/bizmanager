const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.name === 'SqliteError' && err.message && err.message.includes('UNIQUE'))) {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
