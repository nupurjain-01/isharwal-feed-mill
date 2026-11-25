import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initEmbeddedStore, executeEmbeddedQuery } from './embeddedStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env first, then cwd .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let usePostgres = false;
let pgPool = null;

// Initialize PostgreSQL Pool instance (Supports both cloud DATABASE_URL and local connection params)
try {
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Nupurjain123',
        database: process.env.DB_NAME || 'ifm_gate_db',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      };

  pgPool = new Pool(poolConfig);

  pgPool.on('error', (err) => {
    if (usePostgres) {
      console.error('[PostgreSQL Pool Error]:', err.message);
    }
  });
} catch (e) {
  pgPool = null;
}

// Unified Query Handler
export const query = async (text, params = []) => {
  if (usePostgres && pgPool) {
    try {
      return await pgPool.query(text, params);
    } catch (err) {
      console.warn('[Database] PostgreSQL query error, falling back to embedded engine:', err.message);
      return await executeEmbeddedQuery(text, params);
    }
  }
  return await executeEmbeddedQuery(text, params);
};

// Unified Pool Object (Supports transactions like in excelService.js)
export const pool = {
  query: (text, params) => query(text, params),
  connect: async () => {
    if (usePostgres && pgPool) {
      try {
        return await pgPool.connect();
      } catch (err) {
        console.warn('[Database] Client connect failed on PostgreSQL, using embedded store');
      }
    }
    // Return virtual client for embedded store
    return {
      query: (text, params) => query(text, params),
      release: () => {}
    };
  },
  on: (event, handler) => {
    if (pgPool) pgPool.on(event, handler);
  },
  end: async () => {
    if (pgPool) {
      try {
        await pgPool.end();
      } catch (e) {}
    }
  }
};

// Test Connection on startup
export const testConnection = async () => {
  // Always initialize embedded store first as reliable backing storage
  initEmbeddedStore();

  if (!pgPool) {
    usePostgres = false;
    console.log('[Database] Running in Zero-Dependency Embedded Engine mode (Persistent JSON Store)');
    return true;
  }

  try {
    const res = await pgPool.query('SELECT NOW() as current_time, current_database() as db_name');
    usePostgres = true;
    console.log(`[PostgreSQL] Connected to active database: ${res.rows[0].db_name}`);
    console.log(`[PostgreSQL] Server Time: ${res.rows[0].current_time}`);
    return true;
  } catch (error) {
    usePostgres = false;
    console.log(`[Database] PostgreSQL not detected on 127.0.0.1:5432 (${error.message}).`);
    console.log('✅ [Database] Self-Contained Zero-Dependency Database ACTIVE. Zero installation required for other PCs!');
    return true;
  }
};
