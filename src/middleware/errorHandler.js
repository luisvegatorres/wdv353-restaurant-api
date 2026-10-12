const Messages = require('../messages');

module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: Messages.VALIDATION_FAILED, details: Object.values(error.errors).map((item) => item.message) });
  }
  if (['CastError', 'StrictModeError'].includes(error.name)) {
    return res.status(400).json({ error: Messages.INVALID_FIELD });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: Messages.INVALID_JSON });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: Messages.BODY_TOO_LARGE });
  if (error.code === 11000) return res.status(409).json({ error: Messages.DUPLICATE_RECORD });
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(Messages.UNEXPECTED_ERROR, error.name);
  res.status(500).json({ error: Messages.INTERNAL_ERROR });
};
