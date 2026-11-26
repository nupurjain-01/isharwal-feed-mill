import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const runMigrations = async () => {
  console.log('[Migration] Starting PostgreSQL schema migration for Isharwal Feed Mill...');
  const client = await pool.connect();

  try {
    // 1. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // 2. Execute DDL statements
    await client.query(sql);
    console.log('[Migration] All tables and indexes created successfully!');

    // 3. Seed Default Departments (if empty)
    const deptCheck = await client.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCheck.rows[0].count, 10) === 0) {
      console.log('[Migration] Seeding initial departments...');
      const departments = [
        ['General Administration', 'ADMIN', 'Farm administration and management'],
        ['Feed Production & Mill', 'PROD', 'Feed mill operations and plant floor'],
        ['Quality & Testing Lab', 'QC', 'Grain and feed quality testing'],
        ['Accounts & Billing', 'ACC', 'Accounts, cash counter and billing'],
        ['Logistics & Weighbridge', 'LOG', 'Truck incoming and dispatch gate'],
        ['Farm House Operations', 'FARM', 'Poultry and farm house management']
      ];

      for (const [name, code, desc] of departments) {
        await client.query(
          'INSERT INTO departments (name, code, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
          [name, code, desc]
        );
      }
      console.log('[Migration] Default departments seeded.');
    }

    // 4. Seed Default Admin & Gate Users (if empty)
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      console.log('[Migration] Seeding initial admin and receptionist users...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const guardPasswordHash = await bcrypt.hash('guard123', 10);

      await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES 
         ($1, $2, $3, $4),
         ($5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING`,
        [
          'System Administrator', 'admin@isharwalfeedmill.com', adminPasswordHash, 'admin',
          'Security Gate 1', 'gate@isharwalfeedmill.com', guardPasswordHash, 'receptionist'
        ]
      );
      console.log('[Migration] Default users seeded:');
      console.log('   Admin: admin@isharwalfeedmill.com / admin123');
      console.log('   Guard: gate@isharwalfeedmill.com / guard123');
    }

    // 5. Seed Sample Employees (if empty)
    const empCheck = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empCheck.rows[0].count, 10) === 0) {
      console.log('[Migration] Seeding sample employees for dependent dropdowns...');
      const adminDept = await client.query("SELECT id FROM departments WHERE code = 'ADMIN'");
      const prodDept = await client.query("SELECT id FROM departments WHERE code = 'PROD'");
      const farmDept = await client.query("SELECT id FROM departments WHERE code = 'FARM'");

      const employees = [
        [adminDept.rows[0]?.id, 'IFM-001', 'General Manager', 'manager@isharwalfeedmill.com', '9876543210', 'General Manager'],
        [prodDept.rows[0]?.id, 'IFM-002', 'Plant Supervisor', 'plant@isharwalfeedmill.com', '9876543211', 'Plant Supervisor'],
        [farmDept.rows[0]?.id, 'IFM-003', 'Farm House In-Charge', 'farm@isharwalfeedmill.com', '9876543212', 'Farm In-Charge']
      ];

      for (const [deptId, code, name, email, phone, desig] of employees) {
        if (deptId) {
          await client.query(
            `INSERT INTO employees (department_id, employee_code, name, email, phone, designation)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (employee_code) DO NOTHING`,
            [deptId, code, name, email, phone, desig]
          );
        }
      }
      console.log('[Migration] Sample employees seeded successfully.');
    }

    console.log('[Migration] Schema migration and seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('[Migration Error]:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Allow direct CLI execution: node server/database/migrate.js
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
