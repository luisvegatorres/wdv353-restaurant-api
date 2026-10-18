# Assignment 3.6 — Jest API query tests

The Jest suites exercise both collection endpoints through the real Express application using Supertest. Each endpoint has six cases, covering two tests for each requested category:

| Category | Test one | Test two |
| --- | --- | --- |
| Query operators and select | Inclusive lower/upper range and excluded field | Equal bounds retain only the boundary record and exclude the field |
| Pagination | Page 1: skip 0, limit 2 | Page 2: skip 2, limit 2 |
| Sorting | Numeric field ascending | Numeric field descending |

Restaurants use rating and exclude cuisine. Menu items use price and exclude category. Four deterministic fixture documents per collection make page boundaries and sort direction visible. Response bodies are arrays.

## Run in your IDE terminal

```bash
npm ci
npm run test:mocked
npm run test:database
```

- `test:mocked`: 12 Jest tests, no MongoDB server required. `jest.spyOn` replaces the model find/count methods with controlled async results. Chain spies verify filters, projections, sorting, skip, and limit passed by each controller. Real routes, query parsing, controllers, and HTTP serialization still execute. `jest.restoreAllMocks` restores models after every test.
- `test:database`: the same 12 Jest cases with unmocked Mongoose methods and a real disposable MongoDB 8.0.16 process supplied by mongodb-memory-server. Each test resets and reseeds only that temporary database. It never uses your Atlas URI or production data. The first run downloads a MongoDB binary.
- `test:jest`: runs both Jest suites, 24 tests total.
- `test:legacy`: retains the previous 16 node:test checks.
- `npm test`: runs the legacy tests and then both Jest suites, 40 total tests when all pass.

The mocked suite checks the controller's database contract; canned results alone cannot establish MongoDB filtering behavior. The unmocked suite independently exercises real database filtering, selection, pagination, and sorting using the same expected result assertions.

## Files

- `jest.config.cjs`: Node environment, dedicated Jest test discovery, timeout.
- `tests/jest/queryCases.cjs`: shared assertions, fixture data, database lifecycle, model mock setup.
- `tests/jest/query.mocked.test.cjs`: registers the mocked suite.
- `tests/jest/query.database.test.cjs`: registers the unmocked suite.

Existing node:test files stay under `test/`; Jest only discovers files under `tests/jest/`. This prevents the runners from executing each other's test files.

## Submission video outline (about 90 seconds)

1. Show the two Jest entry files and shared cases.
2. Explain the two selection/filter tests, two pagination tests, and two sorting-direction tests for each endpoint.
3. Show the mocked query chain and `jest.spyOn`; explain that call assertions verify MongoDB query arguments.
4. Run `npm run test:mocked` in your IDE terminal and show 12 passing tests.
5. Run `npm run test:database` and show 12 passing tests, using real temporary MongoDB without model mocks.
6. Explain the fixture setup, teardown, and why the actual response is traversed as an array.

Submit clickable links to the GitHub code and your own video running and explaining the tests. Do not claim the database suite passes until it succeeds on your computer.

Jest references: https://jestjs.io/docs/jest-object and https://jestjs.io/docs/configuration
