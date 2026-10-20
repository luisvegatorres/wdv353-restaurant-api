const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/app');

// A real temporary MongoDB process for practice; records disappear on shutdown.
async function demo() {
  const database = await MongoMemoryServer.create({ binary: { version: '8.0.16' } });
  await mongoose.connect(database.getUri(), { dbName: 'restaurant_demo' });
  const server = app.listen(3000, '127.0.0.1', () => console.log('Demo API: http://127.0.0.1:3000 (temporary database)'));
  async function stop() {
    await mongoose.disconnect();
    await database.stop();
  }
  server.on('error', async (error) => { console.error(error.code); await stop(); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(async () => { await stop(); process.exit(0); }));
  }
}
demo().catch((error) => { console.error(error.message); process.exitCode = 1; });
