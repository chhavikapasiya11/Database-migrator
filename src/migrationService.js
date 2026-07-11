const fs = require('fs');
const path = require('path');

const migrationsDirectory = path.join(__dirname, '..', 'migrations');

function readMigrations() {
  return fs.readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.up.sql'))
    .sort()
    .map((upFile) => {
      const version = upFile.replace('.up.sql', '');
      const downFile = `${version}.down.sql`;
      return {
        version,
        upSql: fs.readFileSync(path.join(migrationsDirectory, upFile), 'utf8'),
        downSql: fs.existsSync(path.join(migrationsDirectory, downFile)) ? fs.readFileSync(path.join(migrationsDirectory, downFile), 'utf8') : null
      };
    });
}

async function ensureHistoryTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function getStatus(pool) {
  await ensureHistoryTable(pool);
  const migrations = readMigrations();
  const [rows] = await pool.query('SELECT version, applied_at FROM schema_migrations ORDER BY version');
  const applied = new Map(rows.map((row) => [row.version, row.applied_at]));
  return migrations.map((migration) => ({
    version: migration.version,
    status: applied.has(migration.version) ? 'applied' : 'pending',
    appliedAt: applied.get(migration.version) || null
  }));
}

async function migrateUp(pool) {
  await ensureHistoryTable(pool);
  const status = await getStatus(pool);
  const migrationByVersion = new Map(readMigrations().map((item) => [item.version, item]));
  const pending = status.filter((item) => item.status === 'pending');
  for (const item of pending) {
    const migration = migrationByVersion.get(item.version);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(migration.upSql);
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw new Error(`Migration ${migration.version} failed: ${error.message}`);
    } finally { connection.release(); }
  }
  return pending.map((item) => item.version);
}

async function migrateDown(pool) {
  await ensureHistoryTable(pool);
  const [rows] = await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
  if (!rows.length) return null;
  const migration = readMigrations().find((item) => item.version === rows[0].version);
  if (!migration || !migration.downSql) throw new Error(`No rollback file exists for ${rows[0].version}`);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(migration.downSql);
    await connection.query('DELETE FROM schema_migrations WHERE version = ?', [migration.version]);
    await connection.commit();
    return migration.version;
  } catch (error) {
    await connection.rollback();
    throw new Error(`Rollback ${migration.version} failed: ${error.message}`);
  } finally { connection.release(); }
}

module.exports = { getStatus, migrateUp, migrateDown };
