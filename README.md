# Restaurant API — WDV353-O 2.6

A restaurant has menu items. This project provides full CRUD for two MongoDB collections using Express and Mongoose, with separate models, controllers, routes, and error middleware.

## Setup

Use Node.js 22 or newer and a running local MongoDB server.

```sh
npm ci
cp .env.example .env
npm start
```

The API runs at `http://127.0.0.1:3000`. The normal server uses persistent MongoDB at `mongodb://127.0.0.1:27017/restaurant_api`. You can inspect that connection in MongoDB Compass. Keep `.env` out of Git.

If MongoDB is not installed yet, `npm run demo` starts a real temporary MongoDB process and the same API for practice. It downloads a MongoDB binary on first use and requires internet access then. Demo data disappears when stopped; use `npm start` with your installed MongoDB for the course recording if you need persistent Compass data.

## Models

| Model | Five application fields |
| --- | --- |
| Restaurant | `name` String, `cuisine` String, `rating` Number, `isOpen` Boolean, `openedOn` Date |
| MenuItem | `name` String, `price` Number, `available` Boolean, `category` String, `restaurant` ObjectId |

MongoDB also creates `_id`. MenuItem's `restaurant` field references Restaurant. GET menu-item responses use `populate` to show the related restaurant. Names and cuisine have length checks, ratings must be 0–5, prices 0–1000, and category must be starter/main/dessert/drink. All five fields are required. Send real JSON numbers and booleans; send dates as date strings.

## Endpoints

| Method | Restaurant | Menu item | Result |
| --- | --- | --- | --- |
| GET | `/api/restaurants` | `/api/menu-items` | 200 list |
| GET | `/api/restaurants/:id` | `/api/menu-items/:id` | 200 document |
| POST | `/api/restaurants` | `/api/menu-items` | 201 created document |
| PUT | `/api/restaurants/:id` | `/api/menu-items/:id` | 200 replaced document |
| DELETE | `/api/restaurants/:id` | `/api/menu-items/:id` | 204, no body |

PUT is a complete replacement: send all five fields. IDs must be 24 hex characters. Invalid JSON, fields, types, or schema values return 400; missing documents or related restaurants return 404. Deleting a restaurant with menu items returns 409: delete those items first. Unknown routes return 404. Unexpected failures return a generic 500 response.

The relationship checks are suitable for the sequential coursework workflow. They are separate queries, so concurrent parent deletion and child creation are not transactionally protected. This local assignment API has no authentication and is not intended for public deployment.

## Postman

Import `postman/Restaurant-API.postman_collection.json`. Start the API, then run the collection in order using Collection Runner, or send each numbered request manually. Creation requests save IDs as collection variables. The collection covers all CRUD routes, populated relationships, validation errors, missing IDs, and the parent deletion conflict. The last requests delete the records created by this run.

### Restaurant integration collection

`postman/Restaurant-Integration-Tests.postman_collection.json` tests the Restaurant resource. Import it into Postman, start the API, and run the entire collection in order with one iteration and no data file. Keep `baseUrl` set to `http://127.0.0.1:3000` for the default local server. The runner creates a unique restaurant and saves its ID automatically; no manual ID setup is needed.

The collection groups seven requests into Create, Read, Update, and Delete folders. It includes 26 named tests, with at least three tests for each of POST, GET all, GET by ID, PUT by ID, and DELETE by ID. Assertions check status codes, record IDs, all submitted field values, JSON types, persisted updates, and confirmed deletion. DELETE returns no payload, so its tests check the empty body and make a follow-up GET to confirm a 404 error. There are no response-time tests.

A successful full run shows 26 passing tests. The runner also makes one follow-up GET from the DELETE script. The collection deletes only the restaurant created by its own run. If the run is interrupted, that restaurant may remain; rerunning creates a new one.

Test syntax follows [Postman's test examples](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-examples/).

## Verification

```sh
npm test
```

Six integration tests run the real routes against an isolated temporary MongoDB process. They verify persistence, both CRUD flows, relationships, failed-update preservation, schema validation, and error responses. They never connect to the database in `.env`.

## Code walkthrough

`src/server.js` connects before listening. `src/app.js` configures JSON parsing and mounts both routers. Each router attaches HTTP methods to its controller. Controllers await Mongoose queries. Models define field constraints and the ObjectId relationship. Middleware validates request bodies and IDs, then formats errors as JSON. Express 5 forwards rejected async handlers to error middleware.

## References

- [Mongoose queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose validation](https://mongoosejs.com/docs/validation.html)
- [Mongoose connections](https://mongoosejs.com/docs/connections.html)
- [Express error handling](https://expressjs.com/en/guide/error-handling/)
