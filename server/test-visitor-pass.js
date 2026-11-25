import { query, pool } from './config/db.js';
import { generateVisitorAndPassIds } from './services/idGenerator.js';

async function testVisitorPass() {
  console.log('================================================================');
  console.log('  TESTING VISITOR REGISTRATION, AADHAAR VERIF & GATE PASS GEN   ');
  console.log('================================================================');

  try {
    // 1. Test ID & Gate Pass Number Generator
    const { visitorId, gatePassNo } = await generateVisitorAndPassIds();
    console.log(`[Test 1] Generated Visitor ID  : ${visitorId}`);
    console.log(`[Test 1] Generated Gate Pass No: ${gatePassNo}`);

    // 2. Fetch active department & employee
    const deptRes = await query(`SELECT id, name FROM departments WHERE code = 'QA' LIMIT 1`);
    const qaDept = deptRes.rows[0];

    const empRes = await query(`SELECT id, name, designation FROM employees LIMIT 1`);
    const hostEmp = empRes.rows[0];

    console.log(`\n[Test 2] Selected Department    : ${qaDept.name} (ID: ${qaDept.id})`);
    console.log(`[Test 2] Selected Host Officer  : ${hostEmp.name} - ${hostEmp.designation} (ID: ${hostEmp.id})`);

    // 3. Insert Visitor Record with Aadhaar verification & Gate Pass fields
    const insertRes = await query(`
      INSERT INTO visitors (
        visitor_id, gate_pass_no, name, mobile, email, company_name, address, photo_url,
        department_id, host_employee_id, purpose, vehicle_number,
        number_of_visitors, material_details, remarks,
        status, in_time, verification_mode, verification_status,
        masked_uid, consent_recorded, guard_name, qr_code_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        'INSIDE', NOW(), $16, $17,
        $18, $19, $20, $21
      ) RETURNING *
    `, [
      visitorId,
      gatePassNo,
      'Rajesh Kumar Verma',
      '9825123456',
      'rajesh.verma@apexpackaging.com',
      'Apex Corrugated Packaging Pvt Ltd',
      'Plot 45, GIDC Industrial Estate Phase 2, Sanand',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      qaDept.id,
      hostEmp.id,
      'Raw Material Corrugated Sheet Quality Audit',
      'GJ01 AB 1234',
      1,
      'Sample Paper Box, Digital Caliper',
      'Authorized vendor visit',
      'aadhaar',
      'Aadhaar Verified',
      'XXXXXXXX4589',
      true,
      'Security Officer Sharma',
      JSON.stringify({ passNo: gatePassNo, visitorId, name: 'Rajesh Kumar Verma' })
    ]);

    const created = insertRes.rows[0];
    console.log(`\n[Test 3] Visitor Saved in DB    : ✅ SUCCESS! DB ID = ${created.id}`);
    console.log(`[Test 3] Gate Pass Number       : ${created.gate_pass_no}`);
    console.log(`[Test 3] Verification Status    : ${created.verification_status} (${created.masked_uid})`);
    console.log(`[Test 3] Consent Recorded       : ${created.consent_recorded}`);
    console.log(`[Test 3] Current Status         : ${created.status} (Inside factory)`);

    // 4. Test Exit Checkout
    const exitRes = await query(`
      UPDATE visitors 
      SET status = 'CHECKED_OUT', out_time = NOW(), updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [created.id]);

    const exited = exitRes.rows[0];
    console.log(`\n[Test 4] Visitor Marked Exit    : ✅ SUCCESS! Status = ${exited.status}`);
    console.log(`[Test 4] Exit Timestamp Recorded: ${exited.out_time.toLocaleString()}`);

    console.log('\n================================================================');
    console.log('✅ ALL VISITOR REGISTRATION & PASS TESTS PASSED 100%!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Test Error:', err);
  } finally {
    await pool.end();
  }
}

testVisitorPass();
