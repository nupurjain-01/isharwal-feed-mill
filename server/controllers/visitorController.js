import { query } from '../config/db.js';
import { generateVisitorAndPassIds } from '../services/idGenerator.js';
import { sendVisitorNotification } from '../services/notificationService.js';

// 1. Check-In New Visitor
export const createVisitor = async (req, res) => {
  const {
    name,
    mobile,
    email,
    company_name,
    address,
    photo_url,
    department_id,
    host_employee_id,
    custom_host_name,
    purpose,
    vehicle_number,
    number_of_visitors,
    material_details,
    remarks,
    expected_visitor_id,
    verification_mode,
    verification_status,
    masked_uid,
    consent_recorded,
    guard_name
  } = req.body;

  const resolvedHostId = (host_employee_id === 'OTHER' || !host_employee_id) ? null : parseInt(host_employee_id, 10);
  const resolvedCustomHost = custom_host_name?.trim() || (host_employee_id === 'OTHER' ? 'Custom Host' : '');

  if (!name || !mobile || !department_id || (!resolvedHostId && !resolvedCustomHost) || !purpose) {
    return res.status(400).json({
      success: false,
      message: 'Name, Mobile, Department, Person to meet, and Purpose are required.'
    });
  }

  try {
    // Generate unique sequential Visitor ID and Gate Pass Number
    const { visitorId, gatePassNo } = await generateVisitorAndPassIds();
    const activeGuard = guard_name || req.user?.name || 'Main Gate Security Officer';
    const qrData = JSON.stringify({ passNo: gatePassNo, visitorId, name: name.trim(), mobile: mobile.trim() });

    const insertSql = `
      INSERT INTO visitors (
        visitor_id, gate_pass_no, name, mobile, email, company_name, address, photo_url,
        department_id, host_employee_id, custom_host_name, purpose, vehicle_number,
        number_of_visitors, material_details, remarks, expected_visitor_id,
        registered_by_user_id, status, in_time,
        verification_mode, verification_status, masked_uid, consent_recorded,
        guard_name, qr_code_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, 'INSIDE', NOW(),
        $19, $20, $21, $22,
        $23, $24
      ) RETURNING *
    `;

    const values = [
      visitorId,
      gatePassNo,
      name.trim(),
      mobile.trim(),
      email?.trim() || '',
      company_name?.trim() || 'Individual / Guest',
      address?.trim() || '',
      photo_url || '',
      department_id,
      resolvedHostId,
      resolvedCustomHost,
      purpose.trim(),
      vehicle_number?.trim()?.toUpperCase() || '',
      parseInt(number_of_visitors, 10) || 1,
      material_details?.trim() || '',
      remarks?.trim() || '',
      expected_visitor_id || null,
      req.user?.id || null,
      verification_mode || 'manual',
      verification_status || 'Manual Entry',
      masked_uid || '',
      consent_recorded === true || consent_recorded === 'true',
      activeGuard,
      qrData
    ];

    const result = await query(insertSql, values);
    const newVisitor = result.rows[0];

    // Fetch department and employee details for response
    const enrichedRes = await query(`
      SELECT v.*, d.name as department_name,
             COALESCE(e.name, v.custom_host_name, 'Other Host') as host_employee_name,
             COALESCE(e.designation, 'Host') as host_designation,
             e.phone as host_phone
      FROM visitors v
      JOIN departments d ON d.id = v.department_id
      LEFT JOIN employees e ON e.id = v.host_employee_id
      WHERE v.id = $1
    `, [newVisitor.id]);

    const visitorData = enrichedRes.rows[0] || newVisitor;

    // If converted from expected visitor, update expected visitor status to 'ARRIVED'
    if (expected_visitor_id) {
      await query(
        `UPDATE expected_visitors SET status = 'ARRIVED', updated_at = NOW() WHERE id = $1`,
        [expected_visitor_id]
      );
    }

    // Trigger Real-Time Notification (Socket.io and WhatsApp if configured)
    sendVisitorNotification({
      employeeId: resolvedHostId,
      visitorName: name,
      companyName: company_name,
      purpose,
      visitorId,
      gatePassNo,
      inTime: visitorData.in_time,
      gate: 'Main Gate'
    }).catch(err => console.error('Notification dispatch error:', err.message));

    res.status(201).json({
      success: true,
      message: `Visitor checked in successfully! Gate Pass No: ${gatePassNo}`,
      visitor: visitorData
    });
  } catch (error) {
    console.error('[Create Visitor Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Visitors (Supports advanced search & filters)
export const getVisitors = async (req, res) => {
  const {
    search,
    department_id,
    host_employee_id,
    status,
    date,
    page = 1,
    limit = 50
  } = req.query;

  try {
    let sql = `
      SELECT v.*,
             d.name as department_name, d.code as department_code,
             COALESCE(e.name, v.custom_host_name, 'Other Host') as host_employee_name,
             COALESCE(e.designation, 'Host') as host_designation,
             u.name as registered_by_name
      FROM visitors v
      JOIN departments d ON d.id = v.department_id
      LEFT JOIN employees e ON e.id = v.host_employee_id
      LEFT JOIN users u ON u.id = v.registered_by_user_id
      WHERE 1=1
    `;
    const params = [];

    // Search by name, mobile, company, or pass number
    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (
        v.name ILIKE $${params.length} OR 
        v.mobile ILIKE $${params.length} OR 
        v.visitor_id ILIKE $${params.length} OR 
        v.gate_pass_no ILIKE $${params.length} OR 
        v.company_name ILIKE $${params.length}
      )`;
    }

    if (department_id) {
      params.push(department_id);
      sql += ` AND v.department_id = $${params.length}`;
    }

    if (host_employee_id) {
      params.push(host_employee_id);
      sql += ` AND v.host_employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND v.status = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND DATE(v.in_time) = $${params.length}`;
    }

    sql += ' ORDER BY v.in_time DESC';

    const offset = (page - 1) * limit;
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    // Get total count
    const countSql = `SELECT COUNT(*) FROM visitors WHERE 1=1`;
    const totalCountRes = await query(countSql);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      total: parseInt(totalCountRes.rows[0].count, 10),
      visitors: result.rows
    });
  } catch (error) {
    console.error('[Get Visitors Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Single Visitor by ID
export const getVisitorById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT v.*,
              d.name as department_name,
              COALESCE(e.name, v.custom_host_name, 'Other Host') as host_employee_name,
              COALESCE(e.designation, 'Host') as host_designation,
              e.email as host_email, e.phone as host_phone,
              u.name as registered_by_name
       FROM visitors v
       JOIN departments d ON d.id = v.department_id
       LEFT JOIN employees e ON e.id = v.host_employee_id
       LEFT JOIN users u ON u.id = v.registered_by_user_id
       WHERE v.id::text = $1 OR v.visitor_id = $1 OR v.gate_pass_no = $1`,
      [String(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    res.status(200).json({ success: true, visitor: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Check-Out Visitor (1-Click Exit Stamp)
export const checkOutVisitor = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if visitor exists and is inside
    const checkRes = await query(
      `SELECT id, name, visitor_id, gate_pass_no, status, in_time FROM visitors 
       WHERE id::text = $1 OR visitor_id = $1 OR gate_pass_no = $1`,
      [String(id)]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    const visitor = checkRes.rows[0];

    if (visitor.status === 'CHECKED_OUT') {
      return res.status(400).json({
        success: false,
        message: `Visitor ${visitor.name} has ALREADY exited.`
      });
    }

    // Update status to CHECKED_OUT and record out_time
    const updateRes = await query(
      `UPDATE visitors 
       SET status = 'CHECKED_OUT', out_time = NOW(), updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [visitor.id]
    );

    res.status(200).json({
      success: true,
      message: `Visitor ${visitor.name} marked as EXITED. Gate Pass: ${visitor.gate_pass_no || visitor.visitor_id}`,
      visitor: updateRes.rows[0]
    });
  } catch (error) {
    console.error('[Check-Out Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Visitor (Admin only)
export const deleteVisitor = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM visitors WHERE id::text = $1 OR visitor_id = $1 OR gate_pass_no = $1 RETURNING id, name',
      [String(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    res.status(200).json({
      success: true,
      message: `Visitor record for ${result.rows[0].name} deleted permanently`
    });
  } catch (error) {
    console.error('[Delete Visitor Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
