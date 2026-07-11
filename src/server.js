require('dotenv').config();
const express = require('express');
const createPool = require('./database');
const { getStatus, migrateUp, migrateDown } = require('./migrationService');

const app = express();
const pool = createPool();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/migrations/status', async (_req, res, next) => { try { res.json(await getStatus(pool)); } catch (error) { next(error); } });
app.post('/api/migrations/up', async (_req, res, next) => { try { res.json({ applied: await migrateUp(pool) }); } catch (error) { next(error); } });
app.post('/api/migrations/down', async (_req, res, next) => { try { res.json({ rolledBack: await migrateDown(pool) }); } catch (error) { next(error); } });
app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
app.listen(process.env.PORT || 3000, () => console.log('Migration API running on port 3000'));
