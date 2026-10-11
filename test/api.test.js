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
