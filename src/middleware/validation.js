const mongoose = require('mongoose');
const Messages = require('../messages');

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return next(httpError(400, Messages.INVALID_ID));
  }
  next();
}

// POST and PUT require all fields. PUT replaces the complete resource.
function validateBody(types) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return next(httpError(400, Messages.INVALID_BODY));
    }
    const unknown = Object.keys(body).filter((key) => !Object.hasOwn(types, key));
    if (unknown.length) return next(httpError(400, Messages.unknownFields(unknown)));
    for (const [field, type] of Object.entries(types)) {
      if (typeof body[field] !== type || (type === 'number' && !Number.isFinite(body[field]))) {
        return next(httpError(400, Messages.requiredType(field, type)));
      }
    }
    next();
  };
}

module.exports = { httpError, validateId, validateBody };
