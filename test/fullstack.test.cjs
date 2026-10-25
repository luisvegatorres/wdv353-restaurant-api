const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const serverRequire = createRequire(path.resolve(__dirname, '../server/package.json'));
const { MongoMemoryServer } = serverRequire('mongodb-memory-server');
const mongoose = serverRequire('mongoose');
const app = require('../server/src/app');

test('Vite serves React and proxies both CRUD collections to the real MongoDB API', async () => {
  let database, server, vite;
  try {
    database = await MongoMemoryServer.create({ binary: { version: '8.0.16' } });
    await mongoose.connect(database.getUri(), { dbName: 'fullstack_test' });
    server = await new Promise((resolve) => { const http = app.listen(0, '127.0.0.1', () => resolve(http)); });
    const { createServer } = await import('../client/node_modules/vite/dist/node/index.js');
    vite = await createServer({
      configFile: false, root: path.resolve(__dirname, '../client'),
      server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: `http://127.0.0.1:${server.address().port}` } } },
    });
    await vite.listen();
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
    assert.match(await (await fetch(base)).text(), /main.jsx/);
    const entry = await fetch(`${base}/main.jsx`);
    assert.equal(entry.status, 200);
    assert.match(await entry.text(), /createRoot/);
    async function request(route, method = 'GET', body, status = 200) {
      const response = await fetch(`${base}/api/${route}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      assert.equal(response.status, status);
      return status === 204 ? null : response.json();
    }
    const payload = { name: 'Test Kitchen', cuisine: 'Italian', rating: 4.5, isOpen: true, openedOn: '2025-01-01' };
    const restaurant = await request('restaurants', 'POST', payload, 201);
    const dish = { name: 'Pasta', price: 12.5, available: true, category: 'main', restaurant: restaurant._id };
    const item = await request('menu-items', 'POST', dish, 201);
    assert.equal(item.restaurant.name, payload.name);
    assert.equal((await request('restaurants'))[0].menuItems[0]._id, item._id);
    assert.equal((await request('menu-items'))[0]._id, item._id);
    assert.equal((await request(`restaurants/${restaurant._id}`, 'PUT', { ...payload, rating: 5 })).rating, 5);
    assert.equal((await request(`menu-items/${item._id}`, 'PUT', { ...dish, price: 15 })).price, 15);
    await request(`restaurants/${restaurant._id}`, 'DELETE', undefined, 409);
    await request(`menu-items/${item._id}`, 'DELETE', undefined, 204);
    assert.deepEqual((await request(`restaurants/${restaurant._id}`)).menuItems, []);
    await request(`restaurants/${restaurant._id}`, 'DELETE', undefined, 204);
    assert.deepEqual(await request('restaurants'), []);
    assert.deepEqual(await request('menu-items'), []);
  } finally {
    if (vite) await vite.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (database) await database.stop();
  }
});
