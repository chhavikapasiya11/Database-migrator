require('dotenv').config();
const createPool = require('./database');
const { getStatus, migrateUp, migrateDown } = require('./migrationService');

async function run() {
  const command = process.argv[2];
  const pool = createPool();
  try {
    if (command === 'up') console.log('Applied:', (await migrateUp(pool)).join(', ') || 'No pending migrations');
    else if (command === 'down') console.log('Rolled back:', (await migrateDown(pool)) || 'No applied migrations');
    else if (command === 'status') console.table(await getStatus(pool));
    else throw new Error('Use: npm run migrate:up | migrate:down | migrate:status');
  } finally { await pool.end(); }
}

run().catch((error) => { console.error(error.message); process.exit(1); });
