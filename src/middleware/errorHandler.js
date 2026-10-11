module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed.', details: Object.values(error.errors).map((item) => item.message) });
  }
  if (['CastError', 'StrictModeError'].includes(error.name)) {
    return res.status(400).json({ error: 'Invalid field value or unknown field.' });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body exceeds 32 KB.' });
  if (error.code === 11000) return res.status(409).json({ error: 'Duplicate record.' });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error('Unexpected request error:', error.name);
  res.status(500).json({ error: 'Internal server error.' });
};
