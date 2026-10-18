const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Restaurant = require('../src/models/Restaurant');
const MenuItem = require('../src/models/MenuItem');
let database;
const restaurant = { name: 'Olive Kitchen', cuisine: 'Italian', rating: 4.5, isOpen: true, openedOn: '2024-06-01' };
const menuItem = (id) => ({ name: 'Margherita Pizza', price: 12.5, available: true, category: 'main', restaurant: id });

before(async () => {
  database = await MongoMemoryServer.create({ binary: { version: '8.0.16' } });
  await mongoose.connect(database.getUri(), { dbName: 'restaurant_test' });
});
after(async () => { await mongoose.disconnect(); if (database) await database.stop(); });
beforeEach(async () => { await MenuItem.deleteMany({}); await Restaurant.deleteMany({}); });

test('restaurant CRUD persists changes and returns 404 after deletion', async () => {
  const created = await request(app).post('/api/restaurants').send(restaurant).expect(201);
  const id = created.body._id;
  assert.equal((await Restaurant.findById(id)).name, restaurant.name);
  assert.equal((await request(app).get('/api/restaurants').expect(200)).body.length, 1);
  await request(app).get(`/api/restaurants/${id}`).expect(200);
  const replacement = { ...restaurant, rating: 5, isOpen: false };
  const updated = await request(app).put(`/api/restaurants/${id}`).send(replacement).expect(200);
  assert.equal(updated.body.rating, 5);
  assert.equal((await Restaurant.findById(id)).isOpen, false);
  await request(app).delete(`/api/restaurants/${id}`).expect(204);
  await request(app).get(`/api/restaurants/${id}`).expect(404);
});

test('menu item CRUD populates the restaurant relationship', async () => {
  const parent = await Restaurant.create(restaurant);
  const created = await request(app).post('/api/menu-items').send(menuItem(parent.id)).expect(201);
  const id = created.body._id;
  const fetched = await request(app).get(`/api/menu-items/${id}`).expect(200);
  assert.equal(fetched.body.restaurant.name, restaurant.name);
  assert.equal((await request(app).get('/api/menu-items').expect(200)).body.length, 1);
  const replacement = { ...menuItem(parent.id), price: 15, available: false };
  await request(app).put(`/api/menu-items/${id}`).send(replacement).expect(200);
  assert.equal((await MenuItem.findById(id)).price, 15);
  await request(app).delete(`/api/menu-items/${id}`).expect(204);
  await request(app).get(`/api/menu-items/${id}`).expect(404);
});

test('relationship checks prevent missing parents and sequential orphaning', async () => {
  const missingId = new mongoose.Types.ObjectId().toString();
  await request(app).post('/api/menu-items').send(menuItem(missingId)).expect(404);
  await request(app).post('/api/menu-items').send(menuItem('bad-id')).expect(400);
  const parent = await Restaurant.create(restaurant);
  const child = await MenuItem.create(menuItem(parent.id));
  await request(app).delete(`/api/restaurants/${parent.id}`).expect(409);
  await request(app).put(`/api/menu-items/${child.id}`).send(menuItem(missingId)).expect(404);
  assert.equal((await MenuItem.findById(child.id)).restaurant.toString(), parent.id);
  await request(app).delete(`/api/menu-items/${child.id}`).expect(204);
  await request(app).delete(`/api/restaurants/${parent.id}`).expect(204);
});

test('required fields, ranges, types, enums, dates and unknown fields return 400', async () => {
  for (const body of [
    {}, { ...restaurant, rating: 6 }, { ...restaurant, rating: '4' },
    { ...restaurant, isOpen: 'true' }, { ...restaurant, name: ' ' },
    { ...restaurant, openedOn: 'not-a-date' }, { ...restaurant, extra: 1 }, [],
  ]) await request(app).post('/api/restaurants').send(body).expect(400);
  const parent = await Restaurant.create(restaurant);
  for (const body of [
    { ...menuItem(parent.id), price: -1 }, { ...menuItem(parent.id), category: 'invalid' },
    { ...menuItem(parent.id), available: 'yes' },
  ]) await request(app).post('/api/menu-items').send(body).expect(400);
  assert.equal(await MenuItem.countDocuments(), 0);
});

test('PUT validates full replacement without changing valid stored data', async () => {
  const parent = await Restaurant.create(restaurant);
  await request(app).put(`/api/restaurants/${parent.id}`).send({ rating: 4 }).expect(400);
  await request(app).put(`/api/restaurants/${parent.id}`).send({ ...restaurant, rating: 9 }).expect(400);
  assert.equal((await Restaurant.findById(parent.id)).rating, 4.5);
  const child = await MenuItem.create(menuItem(parent.id));
  await request(app).put(`/api/menu-items/${child.id}`).send({ ...menuItem(parent.id), price: -2 }).expect(400);
  assert.equal((await MenuItem.findById(child.id)).price, 12.5);
});

test('malformed IDs, missing documents, invalid JSON and unknown routes have clear status codes', async () => {
  for (const base of ['/api/restaurants', '/api/menu-items']) {
    const missing = new mongoose.Types.ObjectId().toString();
    await request(app).get(`${base}/invalid`).expect(400);
    await request(app).delete(`${base}/invalid`).expect(400);
    await request(app).get(`${base}/${missing}`).expect(404);
    await request(app).delete(`${base}/${missing}`).expect(404);
  }
  await request(app).post('/api/restaurants').set('Content-Type', 'application/json').send('{bad').expect(400);
  await request(app).get('/unknown').expect(404);
  const health = await request(app).get('/').expect(200);
  assert.equal(health.body.databaseConnected, true);
});

test('both directions are populated and stored version fields are excluded from responses', async () => {
  const parent = await request(app).post('/api/restaurants').send(restaurant).expect(201);
  const parentId = parent.body._id;
  assert.deepEqual(parent.body.menuItems, []);
  assert.equal(Object.hasOwn(parent.body, '__v'), false);
  assert.equal((await Restaurant.findById(parentId).lean()).__v, 0);
  const created = await request(app).post('/api/menu-items').send(menuItem(parentId)).expect(201);
  assert.equal(created.body.restaurant._id, parentId);
  assert.equal(created.body.restaurant.name, restaurant.name);
  assert.equal(Object.hasOwn(created.body, '__v'), false);
  assert.equal(Object.hasOwn(created.body.restaurant, '__v'), false);
  assert.equal((await MenuItem.findById(created.body._id).lean()).__v, 0);
  const fetched = await request(app).get(`/api/restaurants/${parentId}`).expect(200);
  assert.equal(fetched.body.menuItems.length, 1);
  assert.equal(fetched.body.menuItems[0]._id, created.body._id);
  assert.equal(Object.hasOwn(fetched.body.menuItems[0], '__v'), false);
  const parents = await request(app).get('/api/restaurants').expect(200);
  assert.equal(parents.body[0].menuItems[0]._id, created.body._id);
  const items = await request(app).get('/api/menu-items').expect(200);
  assert.equal(items.body[0].restaurant._id, parentId);
  assert.equal(Object.hasOwn(items.body[0].restaurant, '__v'), false);
});

test('replacing a menu item moves the reverse relationship and deletion removes it', async () => {
  const first = await Restaurant.create(restaurant);
  const second = await Restaurant.create({ ...restaurant, name: 'Second Kitchen' });
  const child = await MenuItem.create(menuItem(first.id));
  const updated = await request(app).put(`/api/menu-items/${child.id}`).send(menuItem(second.id)).expect(200);
  assert.equal(updated.body.restaurant._id, second.id);
  const previous = await request(app).get(`/api/restaurants/${first.id}`).expect(200);
  assert.deepEqual(previous.body.menuItems, []);
  const current = await request(app).get(`/api/restaurants/${second.id}`).expect(200);
  assert.equal(current.body.menuItems[0]._id, child.id);
  await request(app).delete(`/api/menu-items/${child.id}`).expect(204);
  const afterDelete = await request(app).get(`/api/restaurants/${second.id}`).expect(200);
  assert.deepEqual(afterDelete.body.menuItems, []);
});

test('valid but missing IDs return shared not-found messages for GET, PUT and DELETE', async () => {
  const id = new mongoose.Types.ObjectId().toString();
  for (const [base, body, error] of [
    ['/api/restaurants', restaurant, 'Restaurant not found.'],
    ['/api/menu-items', menuItem(id), 'Menu item not found.'],
  ]) {
    for (const method of ['get', 'put', 'delete']) {
      let query = request(app)[method](`${base}/${id}`);
      if (method === 'put') query = query.send(body);
      const result = await query.expect(404);
      assert.deepEqual(result.body, { error });
    }
  }
  assert.equal(await Restaurant.countDocuments(), 0);
  assert.equal(await MenuItem.countDocuments(), 0);
});

test('3.4 restaurant ranges, query selection, sort and pagination work together', async () => {
  await Restaurant.insertMany([
    { ...restaurant, name: 'Alpha', rating: 3 },
    { ...restaurant, name: 'Bravo', rating: 4 },
    { ...restaurant, name: 'Charlie', rating: 5 },
    { ...restaurant, name: 'Delta', rating: 4.5 },
  ]);
  const result = await request(app).get('/api/restaurants?minRating=4&maxRating=4.5&exclude=openedOn,menuItems&sort=-rating&page=1&limit=1').expect(200);
  assert.equal(result.headers['x-total-count'], '2');
  assert.equal(result.headers['x-total-pages'], '2');
  assert.equal(result.body.length, 1);
  assert.equal(result.body[0].name, 'Delta');
  assert.equal(Object.hasOwn(result.body[0], 'openedOn'), false);
  assert.equal(Object.hasOwn(result.body[0], 'menuItems'), false);
  const second = await request(app).get('/api/restaurants?minRating=4&maxRating=4.5&sort=-rating&page=2&limit=1').expect(200);
  assert.equal(second.body[0].name, 'Bravo');
  const empty = await request(app).get('/api/restaurants?page=10&limit=1').expect(200);
  assert.deepEqual(empty.body, []);
});

test('3.4 menu price bounds are inclusive; exclusion and pagination preserve relationships', async () => {
  const parent = await Restaurant.create(restaurant);
  await MenuItem.insertMany([10, 20, 30, 40].map((price) => ({ ...menuItem(parent.id), name: `Dish ${price}`, price })));
  const result = await request(app).get('/api/menu-items?minPrice=20&maxPrice=30&exclude=category&sort=-price&limit=1&page=2').expect(200);
  assert.equal(result.headers['x-total-count'], '2');
  assert.equal(result.headers['x-page'], '2');
  assert.equal(result.body[0].price, 20);
  assert.equal(Object.hasOwn(result.body[0], 'category'), false);
  assert.equal(result.body[0].restaurant.name, restaurant.name);
  const excluded = await request(app).get('/api/menu-items?exclude=restaurant').expect(200);
  assert.equal(Object.hasOwn(excluded.body[0], 'restaurant'), false);
});

test('3.4 rejects invalid query values and operator injection on both lists', async () => {
  for (const [base, minKey, maxKey] of [
    ['/api/restaurants', 'minRating', 'maxRating'],
    ['/api/menu-items', 'minPrice', 'maxPrice'],
  ]) {
    for (const query of [
      'page=0', 'limit=101', 'page=1.5', 'limit=abc', 'exclude=unknown', 'sort=$where',
      `${minKey}=oops`, `${minKey}=`, `${minKey}=5&${maxKey}=2`,
      `${minKey}=1&${minKey}=2`, '$where=true', 'exclude=name&exclude=price',
    ]) await request(app).get(`${base}?${query}`).expect(400);
  }
});

test('3.4 defaults paginate both lists and sorting is stable for equal values', async () => {
  const parents = await Restaurant.insertMany(Array.from({ length: 12 }, (_, i) => ({ ...restaurant, name: `Restaurant ${i}`, rating: 4 })));
  await MenuItem.insertMany(Array.from({ length: 12 }, (_, i) => ({ ...menuItem(parents[0].id), name: `Dish ${i}`, price: 10 })));
  for (const [base, sort] of [['/api/restaurants', 'rating'], ['/api/menu-items', 'price']]) {
    const result = await request(app).get(base).expect(200);
    assert.equal(result.body.length, 10);
    assert.equal(result.headers['x-total-count'], '12');
    const first = await request(app).get(`${base}?sort=${sort}&page=1&limit=6`).expect(200);
    const second = await request(app).get(`${base}?sort=${sort}&page=2&limit=6`).expect(200);
    const ids = [...first.body, ...second.body].map((item) => item._id);
    assert.equal(new Set(ids).size, 12);
  }
});
