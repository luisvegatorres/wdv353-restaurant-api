# Restaurant Manager — WDV353 Module 4

A React client connected to the existing Node.js, Express, Mongoose, and MongoDB restaurant API. Create, read, update, and delete restaurants and their menu items through the browser. Both collections retain the models, validation, populated relationships, and error messages from the previous assignments.

## Run on your computer

Use Node.js **22.12 or newer** and a running MongoDB instance. From the repository root:

```sh
npm run setup
cp server/.env.example server/.env
```

Edit `server/.env` if you use a different MongoDB connection. Never commit that file.

Start the API in terminal 1:

```sh
npm run dev:server
```

Start React in terminal 2:

```sh
npm run dev:client
```

Open **http://127.0.0.1:5173**. Keep both processes running. The API listens on **127.0.0.1:3000** by default. If you change the API port, also change the proxy target in `client/vite.config.js`.

Without a MongoDB installation, use `npm run demo` instead of `npm run dev:server`. It starts the same API with a real temporary MongoDB process. The first run downloads a MongoDB binary and requires internet access; data disappears when stopped. Use persistent MongoDB for a recording that demonstrates persistence after a server restart.

## Try the application

1. Under Restaurants, add a restaurant with its name, cuisine, rating, opening date, and open status.
2. Switch to Menu items. Add a dish and select its restaurant. Prices are numeric amounts; the API does not define a currency.
3. Edit either record. The form submits every application field because PUT replaces the complete resource.
4. Reload the browser to show that the API retrieves the records from MongoDB.
5. Check the restaurant card to see its related menu items. Edit the item's restaurant to move that relationship.
6. Delete the menu item, then the restaurant. The UI asks for confirmation. A restaurant with menu items cannot be deleted; remove or move those children first.

The client includes search, loading and empty states, disabled controls during requests, and visible API validation/network errors. Failed saves retain the form. Both lists refresh after each successful write so their populated relationships stay current. If a write succeeds but refreshing fails, the editor closes and further changes are disabled until Refresh succeeds, avoiding a duplicate submission.

## Project organization

| Path | Purpose |
| --- | --- |
| `client/App.jsx` | Collection selection, React state, initial load, mutation handlers |
| `client/components/RecordForm.jsx` | Controlled add/edit form with correctly typed JSON payloads |
| `client/components/RecordList.jsx` | Restaurant and menu item cards and actions |
| `client/services/api.js` | Shared Axios instance and GET/POST/PUT/DELETE services |
| `client/styles.css` | Responsive styling and keyboard focus states |
| `client/test/` | React interaction tests |
| `server/src/` | Existing API models, controllers, routes, validation, and messages |
| `server/test/` | Existing database integration tests |
| `server/postman/` | Existing Postman collections |
| `test/fullstack.test.cjs` | Real API and temporary MongoDB checks through the Vite proxy |
| `DEMO.md` | Recording checklist and a short walkthrough script |

The existing backend files were moved into `server/` without changing their implementation. API details and prior Postman instructions are in [server/README.md](server/README.md). Run those earlier API commands from `server/`.

## How the connection works

React uses `useState` for records, form values, selected collection, errors, and request state. `useEffect` loads both collections when the app mounts and cancels that initial request when it unmounts. Child components receive data and callbacks through props.

Axios sends relative `/api/restaurants` and `/api/menu-items` requests to the React development server. Vite forwards `/api` to Express on port 3000. This same-origin development setup avoids cross-origin browser requests without changing backend CORS behavior. Requests go through the real controllers and Mongoose models to MongoDB; there is no browser-only data store or mocked API in the application.

## Checks

```sh
npm test
npm run test:e2e
npm run build
```

- `npm test`: 9 existing API integration tests, followed by 8 React interaction tests. API tests require a runnable temporary MongoDB binary. If API tests fail first, run `npm test --prefix client` separately to check the UI.
- `npm run test:e2e`: starts isolated MongoDB, Express, and Vite; verifies the React entry is served and both CRUD collections work through the proxy. This is an HTTP integration test, not a visual browser test.
- `npm run build`: compiles the client into `client/dist/`. Continue using the two development servers for the assignment demonstration. This project does not configure a production web host.

Tests use their own temporary database and never read `server/.env`. React tests replace the service boundary with mocks to exercise success and failure paths.

### Verification in the preparation environment

The client production build and all 8 React tests passed. Database integration checks were attempted but the environment prevented MongoDB 8.0.16 from starting (`open: Operation not permitted`). Their results remain unverified here; run both database checks on your computer before recording. No visual browser review was performed in this environment.

## Assignment submission

Submit a **GitHub repository link and a video** showing the application running and explaining the code. The assignment accepts a directly uploaded Zoom video or a YouTube link. Use clickable links in the submission. Minimal client styling is allowed. The tutorial demonstrates GET and POST; this client also connects PUT and DELETE to the existing API.

See [DEMO.md](DEMO.md) before recording. The recording itself still needs to be made by you.

## References

- [React state](https://react.dev/reference/react/useState) and [effects](https://react.dev/reference/react/useEffect)
- [Axios instances](https://axios-http.com/docs/instance) and [errors](https://axios-http.com/docs/handling_errors)
- [Vite development proxy](https://vite.dev/config/server-options#server-proxy)
