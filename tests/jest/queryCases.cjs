const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Restaurant = require('../../src/models/Restaurant');
const MenuItem = require('../../src/models/MenuItem');

const ids = [1, 2, 3, 4].map((n) => n.toString(16).padStart(24, '0'));
const restaurants = [1, 3, 4, 5].map((rating, index) => ({
  _id: ids[index], name: ['Alpha', 'Bravo', 'Charlie', 'Delta'][index],
  cuisine: 'Italian', rating, isOpen: true, openedOn: new Date('2024-06-01'),
}));
const items = [5, 10, 20, 30].map((price, index) => ({
  _id: (index + 11).toString(16).padStart(24, '0'),
  name: ['Apple', 'Bread', 'Cake', 'Dumpling'][index],
  price, category: 'main', available: true, restaurant: ids[0],
}));

const endpoints = [
  { path: '/api/restaurants', model: Restaurant, rows: restaurants, field: 'rating', minKey: 'minRating', maxKey: 'maxRating', lower: 3, upper: 4, exclude: 'cuisine', relation: 'menuItems' },
  { path: '/api/menu-items', model: MenuItem, rows: items, field: 'price', minKey: 'minPrice', maxKey: 'maxPrice', lower: 10, upper: 20, exclude: 'category', relation: 'restaurant' },
];

// Identical endpoint assertions run with mocked models and real temporary MongoDB.
function queryCases(mode) {
  describe(`${mode}: query endpoints`, () => {
    let database;
    beforeAll(async () => {
      if (mode === 'database') {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        database = await MongoMemoryServer.create({ binary: { version: '8.0.16' } });
        await mongoose.connect(database.getUri(), { dbName: 'assignment_36_test' });
      }
    });
    beforeEach(async () => {
      if (mode === 'database') {
        await MenuItem.deleteMany({});
        await Restaurant.deleteMany({});
        await Restaurant.insertMany(restaurants);
        await MenuItem.insertMany(items);
      }
    });
    afterEach(() => jest.restoreAllMocks());
    afterAll(async () => {
      if (mode === 'database') {
        await mongoose.disconnect();
        if (database) await database.stop();
      }
    });

    for (const endpoint of endpoints) {
      describe(endpoint.path, () => {
        const { field, lower, upper, minKey, maxKey, exclude } = endpoint;
        const cases = [
          { name: 'filters an inclusive range and excludes a field', params: { [minKey]: String(lower), [maxKey]: String(upper), exclude }, indices: [1, 2], filter: { [field]: { $gte: lower, $lte: upper } }, total: 2 },
          { name: 'equal bounds return only the boundary record with field excluded', params: { [minKey]: String(lower), [maxKey]: String(lower), exclude }, indices: [1], filter: { [field]: { $gte: lower, $lte: lower } }, total: 1 },
          { name: 'page one skips zero and limits results to two', params: { page: '1', limit: '2' }, indices: [0, 1], skip: 0, limit: 2, total: 4 },
          { name: 'page two skips two and returns the next two', params: { page: '2', limit: '2' }, indices: [2, 3], skip: 2, limit: 2, total: 4 },
          { name: 'sorts the collection ascending', params: { sort: field }, indices: [0, 1, 2, 3], sort: { [field]: 1, _id: 1 }, total: 4 },
          { name: 'sorts the collection descending', params: { sort: `-${field}` }, indices: [3, 2, 1, 0], sort: { [field]: -1, _id: 1 }, total: 4 },
        ];

        for (const scenario of cases) {
          test(scenario.name, async () => {
            let chain;
            if (mode === 'mocked') {
              // Canned database results are independent of application filter logic.
              // Spies also assert that the controller sends the correct query to Mongoose.
              const returned = scenario.indices.map((index) => {
                const row = { ...endpoint.rows[index] };
                if (scenario.params.exclude) delete row[scenario.params.exclude];
                return row;
              });
              chain = Object.fromEntries(['select', 'sort', 'skip', 'limit', 'populate'].map((method) => [method, jest.fn().mockReturnThis()]));
              chain.exec = jest.fn().mockResolvedValue(returned);
              jest.spyOn(endpoint.model, 'find').mockReturnValue(chain);
              jest.spyOn(endpoint.model, 'countDocuments').mockResolvedValue(scenario.total);
            }
            const response = await request(app).get(endpoint.path).query(scenario.params).expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.map((row) => row.name)).toEqual(scenario.indices.map((index) => endpoint.rows[index].name));
            expect(response.body).toHaveLength(scenario.indices.length);
            if (scenario.params.exclude) {
              for (const row of response.body) expect(row).not.toHaveProperty(scenario.params.exclude);
            }
            expect(response.headers['x-total-count']).toBe(String(scenario.total));
            expect(response.headers['x-page']).toBe(scenario.params.page || '1');
            expect(response.headers['x-limit']).toBe(String(scenario.limit || 10));
            expect(response.headers['x-total-pages']).toBe(String(Math.ceil(scenario.total / (scenario.limit || 10))));
            if (mode === 'mocked') {
              expect(endpoint.model.find).toHaveBeenCalledWith(scenario.filter || {});
              expect(endpoint.model.countDocuments).toHaveBeenCalledWith(scenario.filter || {});
              expect(chain.select).toHaveBeenCalledWith(scenario.params.exclude ? { __v: 0, [exclude]: 0 } : { __v: 0 });
              expect(chain.sort).toHaveBeenCalledWith(scenario.sort || { name: 1, _id: 1 });
              expect(chain.skip).toHaveBeenCalledWith(scenario.skip || 0);
              expect(chain.limit).toHaveBeenCalledWith(scenario.limit || 10);
              expect(chain.exec).toHaveBeenCalledTimes(1);
            }
          });
        }
      });
    }
  });
}
module.exports = { queryCases };
