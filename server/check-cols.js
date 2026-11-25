import { query, pool } from './config/db.js';

async function checkCols() {
  const res = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'visitors' 
    ORDER BY ordinal_position
  `);
  console.log('Visitors Table Columns:');
  console.table(res.rows);
  await pool.end();
}

checkCols();
