const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { listQuery } = require('../src/utils/listQuery');
const config = { field: 'rating', minKey: 'minRating', maxKey: 'maxRating', min: 0, max: 5, fields: ['name', 'rating', 'cuisine', 'menuItems'] };

test('builds inclusive operator filters, exclusions and stable pagination', () => {
  const result = listQuery({ minRating: '3', maxRating: '5', exclude: 'cuisine', sort: '-rating,name', page: '3', limit: '2' }, config);
  assert.deepEqual(result.filter, { rating: { $gte: 3, $lte: 5 } });
  assert.deepEqual(result.projection, { __v: 0, cuisine: 0 });
  assert.deepEqual(result.sort, { rating: -1, name: 1, _id: 1 });
  assert.equal(result.skip, 4);
  assert.equal(result.limit, 2);
});

test('defaults and individual bounds work independently', () => {
  assert.deepEqual(listQuery({}, config).filter, {});
  assert.equal(listQuery({}, config).page, 1);
  assert.equal(listQuery({}, config).limit, 10);
  assert.deepEqual(listQuery({ minRating: '0' }, config).filter, { rating: { $gte: 0 } });
  assert.deepEqual(listQuery({ maxRating: '5' }, config).filter, { rating: { $lte: 5 } });
});

test('invalid HTTP queries return 400 on both collection routes before database access', async () => {
  for (const [base, minKey, maxKey] of [['/api/restaurants', 'minRating', 'maxRating'], ['/api/menu-items', 'minPrice', 'maxPrice']]) {
    for (const query of ['page=0', 'page=1.5', 'limit=101', 'exclude=unknown', 'sort=$where', `${minKey}=oops`, `${minKey}=5&${maxKey}=2`, `${minKey}=1&${minKey}=2`, '$where=true']) {
      await request(app).get(`${base}?${query}`).expect(400);
    }
  }
});
