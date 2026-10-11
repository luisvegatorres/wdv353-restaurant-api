const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json({ limit: '32kb' }));
app.get('/', (req, res) => res.json({ message: 'Restaurant API', databaseConnected: mongoose.connection.readyState === 1 }));
app.use('/api/restaurants', require('./routes/restaurantRoutes'));
app.use('/api/menu-items', require('./routes/menuItemRoutes'));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
// Express 5 forwards rejected async controller promises to this middleware.
app.use(require('./middleware/errorHandler'));

module.exports = app;
