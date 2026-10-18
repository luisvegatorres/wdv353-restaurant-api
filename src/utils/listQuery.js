const { httpError } = require('../middleware/validation');

function text(value, key) {
  if (typeof value !== 'string' || !value.trim()) throw httpError(400, `${key} must be a nonempty string.`);
  return value.trim();
}

function number(value, key, min, max) {
  const raw = text(value, key);
  const result = Number(raw);
  if (!Number.isFinite(result) || result < min || result > max) {
    throw httpError(400, `${key} must be a number between ${min} and ${max}.`);
  }
  return result;
}

// Build only known MongoDB operators; never pass req.query directly to find().
function listQuery(query, { field, minKey, maxKey, min, max, fields }) {
  const allowed = new Set([minKey, maxKey, 'exclude', 'sort', 'page', 'limit']);
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) throw httpError(400, `Unknown query parameter: ${key}.`);
  }
  const range = {};
  if (query[minKey] !== undefined) range.$gte = number(query[minKey], minKey, min, max);
  if (query[maxKey] !== undefined) range.$lte = number(query[maxKey], maxKey, min, max);
  if (range.$gte !== undefined && range.$lte !== undefined && range.$gte > range.$lte) {
    throw httpError(400, `${minKey} must not exceed ${maxKey}.`);
  }
  const filter = Object.keys(range).length ? { [field]: range } : {};
  const excluded = query.exclude === undefined ? [] : text(query.exclude, 'exclude').split(',').map((key) => key.trim());
  if (excluded.some((key) => !fields.includes(key))) throw httpError(400, 'exclude contains an unsupported field.');
  const projection = Object.fromEntries(['__v', ...excluded].map((key) => [key, 0]));

  const sort = {};
  const order = query.sort === undefined ? ['name'] : text(query.sort, 'sort').split(',').map((key) => key.trim());
  for (const entry of order) {
    const key = entry.startsWith('-') ? entry.slice(1) : entry;
    if (!fields.includes(key) || ['menuItems', 'restaurant'].includes(key)) throw httpError(400, 'sort contains an unsupported field.');
    sort[key] = entry.startsWith('-') ? -1 : 1;
  }
  // A unique tie-breaker keeps pages stable when primary sort values match.
  sort._id = 1;
  const page = query.page === undefined ? 1 : number(query.page, 'page', 1, 1000000);
  const limit = query.limit === undefined ? 10 : number(query.limit, 'limit', 1, 100);
  if (!Number.isInteger(page) || !Number.isInteger(limit)) throw httpError(400, 'page and limit must be integers.');
  return { filter, projection, excluded, sort, page, limit, skip: (page - 1) * limit };
}

// Keep the existing array response contract; expose pagination through headers.
function paginationHeaders(res, options, total) {
  res.set({
    'X-Total-Count': String(total), 'X-Page': String(options.page),
    'X-Limit': String(options.limit), 'X-Total-Pages': String(Math.ceil(total / options.limit)),
  });
}

module.exports = { listQuery, paginationHeaders };
