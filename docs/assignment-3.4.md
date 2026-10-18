# Assignment 3.4: API query data from MongoDB

This extends the existing Restaurant and MenuItem API. All filters execute at the collection endpoints, not separate action routes. Existing CRUD routes and array-shaped GET responses remain available.

## Requirements mapping

| Requirement | Restaurants | Menu items |
| --- | --- | --- |
| Two MongoDB query operators | `minRating` → `$gte`, `maxRating` → `$lte` | `minPrice` → `$gte`, `maxPrice` → `$lte` |
| Query-controlled exclusion with `.select()` | `exclude=openedOn,cuisine` | `exclude=category,available` |
| Query-controlled `.sort()` | `sort=-rating,name` | `sort=price,name` |
| Pagination with `.skip()` and `.limit()` | `page=2&limit=5` | `page=2&limit=5` |

Ranges are inclusive and can be supplied independently. Restaurant ratings must be 0–5; menu prices must be 0–1000. With no bounds, all matching records are eligible for pagination.

## Try these requests

```text
GET /api/restaurants?minRating=3&maxRating=5&exclude=openedOn&sort=-rating&page=1&limit=5
GET /api/menu-items?minPrice=5&maxPrice=25&exclude=category&sort=price&page=1&limit=5
```

`exclude` accepts comma-separated top-level fields:

- Restaurants: `name,cuisine,rating,isOpen,openedOn,menuItems`.
- Menu items: `name,price,available,category,restaurant`.

`__v` is always excluded. `_id` is retained to support relationships. Excluding a relationship skips population for that relationship. Other exclusions affect only the top-level documents, not nested populated documents. Sorting accepts the listed stored fields, excluding relationship fields; prefix `-` for descending. Default sort is name ascending, with `_id` as a stable tie-breaker.

Pagination defaults to page 1 and 10 records; limit is at most 100. Both parameters must be positive integers (page is capped at 1,000,000). The body remains an array, preserving the previous client contract. Response headers provide:

- `X-Total-Count`: count after filtering, before pagination.
- `X-Page`, `X-Limit`: requested page settings.
- `X-Total-Pages`: number of matching pages, or 0 when there are no matches.

A page past the end returns HTTP 200 with an empty array. Unknown parameters, repeated parameters, unsupported selection/sort fields, malformed numbers, and reversed ranges return HTTP 400. An allowlist prevents passing arbitrary client operators into MongoDB.

## Verification

```bash
npm ci
npm test
```

The tests run a temporary MongoDB instance via mongodb-memory-server. The first run downloads MongoDB 8.0.16. They check both operators and boundary values, field exclusion (including relationships), sort order, page sizes and counts, distinct pages for equal sort values, empty pages, invalid query input, and the previous CRUD behavior.

## Recording guide

Record yourself explaining and demonstrating your code:

1. Show both models and explain the Restaurant–MenuItem relationship.
2. Open `src/utils/listQuery.js`: show how min/max become `$gte`/`$lte`, validated exclusion becomes a projection, and page/limit produce the skip offset.
3. Open both controllers: explain `find`, `select`, `sort`, `skip`, `limit`, and the filtered count query.
4. In Postman, show each collection without filters and then apply both bounds together. Use seeded records with different ratings/prices so the difference is visible.
5. Demonstrate exclusion, ascending/descending sort, and pages 1 and 2 on both endpoints. Show the pagination headers.
6. Demonstrate one invalid request returning HTTP 400 and run `npm test`.

Explain the code in your own words. Submit clickable links to this GitHub branch (or the merged repository) and your actual recorded video. The recording must still be made; this guide is not the video submission.

Mongoose reference: https://mongoosejs.com/docs/api/query.html
