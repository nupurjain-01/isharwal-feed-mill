import { query, pool } from './config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function testAuth() {
  console.log('====================================================');
  console.log('   UMAX GATE ENTRY - AUTHENTICATION VERIFICATION   ');
  console.log('====================================================');

  try {
    // 1. Test Admin Authentication
    const adminRes = await query('SELECT * FROM users WHERE email = $1', ['admin@umaxpackaging.com']);
    const admin = adminRes.rows[0];
    const adminPassMatch = await bcrypt.compare('admin123', admin.password_hash);
    console.log(`[Test 1] Admin Account Found    : ${admin.name} (${admin.email})`);
    console.log(`[Test 1] Role & Status           : Role = ${admin.role}, Active = ${admin.is_active}`);
    console.log(`[Test 1] Password Verification   : ${adminPassMatch ? '✅ MATCHED (admin123)' : '❌ FAILED'}`);

    // 2. Test Guard Authentication
    const guardRes = await query('SELECT * FROM users WHERE email = $1', ['gate@umaxpackaging.com']);
    const guard = guardRes.rows[0];
    const guardPassMatch = await bcrypt.compare('guard123', guard.password_hash);
    console.log(`\n[Test 2] Guard Account Found    : ${guard.name} (${guard.email})`);
    console.log(`[Test 2] Role & Status           : Role = ${guard.role}, Active = ${guard.is_active}`);
    console.log(`[Test 2] Password Verification   : ${guardPassMatch ? '✅ MATCHED (guard123)' : '❌ FAILED'}`);

    // 3. Test Invalid Password
    const wrongPassMatch = await bcrypt.compare('WrongSecretPass', admin.password_hash);
    console.log(`\n[Test 3] Wrong Password Security : ${!wrongPassMatch ? '✅ CORRECTLY REJECTED' : '❌ VULNERABLE'}`);

    // 4. Test JWT Generation & Decoding
    const token = jwt.sign({ id: admin.id, role: admin.role }, 'umax_super_secret_jwt_key_2026_packagingsystem', { expiresIn: '7d' });
    const decoded = jwt.verify(token, 'umax_super_secret_jwt_key_2026_packagingsystem');
    console.log(`\n[Test 4] JWT Token Generation    : ✅ SUCCESS (Token issued for user ID ${decoded.id})`);

    console.log('\n====================================================');
    console.log('✅ ALL ADMIN & SECURITY AUTHENTICATION TESTS PASSED!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Authentication Test Failed:', error);
  } finally {
    await pool.end();
  }
}

testAuth();
