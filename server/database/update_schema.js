import { query, pool } from '../config/db.js';

async function updateSchema() {
  console.log('[Migration] Updating visitors table with Gate Pass and Aadhaar verification columns...');
  try {
    const alterQueries = [
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS gate_pass_no VARCHAR(50);`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT '';`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS verification_mode VARCHAR(20) DEFAULT 'manual';`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Manual Entry';`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS masked_uid VARCHAR(30) DEFAULT '';`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_recorded BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS guard_name VARCHAR(100) DEFAULT '';`,
      `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS qr_code_data TEXT DEFAULT '';`,
      `CREATE INDEX IF NOT EXISTS idx_visitors_pass_no ON visitors(gate_pass_no);`,
      `CREATE INDEX IF NOT EXISTS idx_visitors_verif_status ON visitors(verification_status);`
    ];

    for (const q of alterQueries) {
      await query(q);
    }

    console.log('✅ visitors table updated with all Gate Pass & Aadhaar fields successfully!');
  } catch (error) {
    console.error('❌ Failed to update schema:', error.message);
  } finally {
    await pool.end();
  }
}

updateSchema();
