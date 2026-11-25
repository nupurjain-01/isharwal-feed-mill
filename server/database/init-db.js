import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Nupurjain123';
const targetDbName = process.env.DB_NAME || 'umax_gate_db';

const initDatabase = async () => {
  console.log(`[Init] Connecting to PostgreSQL server on ${dbHost}:${dbPort} as user '${dbUser}'...`);
  
  // 1. Connect to default 'postgres' database
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('[Init] Connected to root PostgreSQL server successfully!');

    // 2. Check if umax_gate_db exists
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`[Init] Database '${targetDbName}' does not exist. Creating now...`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`[Init] Database '${targetDbName}' created successfully!`);
    } else {
      console.log(`[Init] Database '${targetDbName}' already exists.`);
    }

    await client.end();

    // 3. Run schema migration on the target database
    await runMigrations();

    console.log('========================================================');
    console.log('✅ POSTGRESQL DATABASE & ALL TABLES CREATED FOR UMAX GATE!');
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Init Failed]:', error.message);
    if (error.code === '28P01') {
      console.error('👉 TIP: Password authentication failed. Check DB_PASSWORD in server/.env');
    }
    process.exit(1);
  }
};

initDatabase();
