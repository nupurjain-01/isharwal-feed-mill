import { query, pool } from './config/db.js';

async function checkStatus() {
  console.log('--- UMAX GATE ENTRY POSTGRESQL VERIFICATION ---');
  try {
    const dbInfo = await query('SELECT current_database() as db, version() as ver');
    console.log(`✅ Connected Database : ${dbInfo.rows[0].db}`);
    console.log(`✅ PostgreSQL Version : ${dbInfo.rows[0].ver.split(' ')[0]} ${dbInfo.rows[0].ver.split(' ')[1]}`);

    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables Created:');
    for (const t of tables.rows) {
      const count = await query(`SELECT COUNT(*) FROM "${t.table_name}"`);
      console.log(`   - ${t.table_name.padEnd(20)} : ${count.rows[0].count} records`);
    }

    console.log('\n✅ ALL DATABASE TABLES ARE HEALTHY AND READY!');
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkStatus();
