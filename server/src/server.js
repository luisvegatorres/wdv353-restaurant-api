const mongoose = require('mongoose');
const app = require('./app');

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant_api', { serverSelectionTimeoutMS: 5000 });
  const server = app.listen(process.env.PORT || 3000, '127.0.0.1', () => {
    console.log(`Restaurant API: http://127.0.0.1:${server.address().port}`);
  });
  server.on('error', async (error) => {
    console.error(`HTTP server failed: ${error.code}`);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }));
  }
}

start().catch(async (error) => {
  console.error(`Startup failed (${error.name}). Check that MongoDB is running and MONGODB_URI is valid.`);
  await mongoose.disconnect();
  process.exitCode = 1;
});
