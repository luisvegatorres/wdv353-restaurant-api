# Module 4 recording guide

## Before recording

- Run `npm run setup`, then `npm test`, `npm run test:e2e`, and `npm run build`.
- Start your persistent MongoDB server, `npm run dev:server`, and `npm run dev:client` in separate terminals.
- Open http://127.0.0.1:5173 and optionally MongoDB Compass with the same URI as `server/.env`.
- Keep `.env`, credentials, and personal records out of the recording. Use sample restaurant data.
- Rehearse adding a restaurant, adding its menu item, editing, refreshing, and deleting the item before its parent.

## Approximately two-minute script

**0:00–0:20 — Overview and structure**

“This is my Module 4 full stack restaurant application. The client uses React and Axios, and the server uses Node.js, Express, Mongoose, and MongoDB. The project is organized into separate client and server folders.”

Show the folder structure briefly, then return to the app.

**0:20–0:45 — Restaurant creation**

“Here I’m adding a restaurant. The form collects the same five fields defined in the existing Restaurant model. Axios sends a POST request to the API, and the server validates and saves the record in MongoDB.”

Add a sample restaurant with name, cuisine, rating, date, and open status.

**0:45–1:10 — Relationship and reading**

“Now I’m adding a menu item and selecting the restaurant it belongs to. The API stores the restaurant’s ObjectId. The restaurant card displays its related menu items. Refreshing the browser runs GET requests and retrieves these saved records again.”

Add a dish, switch to restaurants to show the relationship, then refresh the browser.

**1:10–1:30 — Updating and deleting**

“I can also edit records with PUT and delete them with DELETE. The client refreshes both lists after a successful change. Restaurants with menu items are protected from deletion, so I remove the menu item first.”

Edit the dish’s price, save, then delete the dish and restaurant with the confirmation controls.

**1:30–1:55 — Code and state**

“App.jsx manages records, loading, and error state with React hooks. RecordForm and RecordList receive props and callbacks. The service module centralizes Axios requests, and Vite forwards API requests to Express. Validation errors remain visible, and controls are disabled while requests are in progress.”

Show `client/services/api.js` and the state/refresh handlers in `client/App.jsx`.

**1:55–2:00 — Close**

“My submission includes the GitHub repository link and this demonstration video.”

## Submit

Include the GitHub repository URL and either the uploaded recording or a clickable YouTube video link. Make sure the repository link points to the branch containing this implementation, or merge the reviewed changes before submitting the default branch link. Verify the video is accessible to your instructor.
