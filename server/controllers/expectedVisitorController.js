import { query } from '../config/db.js';
import { generateVisitorId } from '../services/idGenerator.js';
import { sendVisitorNotification } from '../services/notificationService.js';

// 1. Pre-register Expected Visitor
export const createExpectedVisitor = async (req, res) => {
  const {
    name,
    mobile,
    company_name,
    department_id,
    host_employee_id,
    purpose,
    expected_date,
    expected_time
  } = req.body;

  if (!name || !mobile || !department_id || !host_employee_id || !expected_date || !expected_time) {
    return res.status(400).json({
      success: false,
      message: 'Name, Mobile, Department, Host, Expected Date and Time are required'
    });
  }

  try {
    const result = await query(
      `INSERT INTO expected_visitors (
        name, mobile, company_name, department_id, host_employee_id,
        purpose, expected_date, expected_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *`,
      [
        name.trim(),
        mobile.trim(),
        company_name?.trim() || 'N/A',
        department_id,
        host_employee_id,
        purpose?.trim() || 'Scheduled Meeting',
        expected_date,
        expected_time
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Expected visitor registered successfully',
      expectedVisitor: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Expected Visitors (Filter by status: PENDING / ARRIVED / CANCELLED)
export const getExpectedVisitors = async (req, res) => {
  const { status, date, search } = req.query;

  try {
    let sql = `
      SELECT ev.*,
             d.name as department_name,
             e.name as host_employee_name, e.designation as host_designation, e.phone as host_phone
      FROM expected_visitors ev
      JOIN departments d ON d.id = ev.department_id
      JOIN employees e ON e.id = ev.host_employee_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND ev.status = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND ev.expected_date = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (ev.name ILIKE $${params.length} OR ev.company_name ILIKE $${params.length} OR ev.mobile ILIKE $${params.length})`;
    }

    sql += ' ORDER BY ev.expected_date DESC, ev.expected_time ASC';

    const result = await query(sql, params);
    res.status(200).json({ success: true, expectedVisitors: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. One-Click Convert Expected Visitor into Actual Gate Entry Pass
export const convertToCheckIn = async (req, res) => {
  const { id } = req.params;
  const { vehicle_number, number_of_visitors, material_details, remarks } = req.body;

  try {
    // 1. Fetch expected visitor
    const expRes = await query('SELECT * FROM expected_visitors WHERE id = $1', [id]);
    if (expRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expected visitor record not found' });
    }

    const exp = expRes.rows[0];

    if (exp.status === 'ARRIVED') {
      return res.status(400).json({ success: false, message: 'This visitor has already been checked in!' });
    }

    // 2. Generate unique Visitor ID
    const visitorId = await generateVisitorId();

    // 3. Insert into active visitors table
    const insertRes = await query(
      `INSERT INTO visitors (
        visitor_id, name, mobile, company_name, department_id, host_employee_id,
        purpose, vehicle_number, number_of_visitors, material_details, remarks,
        expected_visitor_id, registered_by_user_id, status, in_time
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, 'INSIDE', NOW()
      ) RETURNING *`,
      [
        visitorId,
        exp.name,
        exp.mobile,
        exp.company_name,
        exp.department_id,
        exp.host_employee_id,
        exp.purpose,
        vehicle_number?.trim()?.toUpperCase() || '',
        parseInt(number_of_visitors, 10) || 1,
        material_details?.trim() || '',
        remarks?.trim() || 'Converted from expected visit',
        exp.id,
        req.user?.id || null
      ]
    );

    const activeVisitor = insertRes.rows[0];

    // 4. Update expected visitor status
    await query(`UPDATE expected_visitors SET status = 'ARRIVED', updated_at = NOW() WHERE id = $1`, [id]);

    // 5. Send real-time alert
    sendVisitorNotification({
      employeeId: exp.host_employee_id,
      visitorName: exp.name,
      companyName: exp.company_name,
      purpose: exp.purpose,
      visitorId,
      inTime: activeVisitor.in_time,
      gate: 'Main Gate'
    }).catch(err => console.error(err.message));

    res.status(200).json({
      success: true,
      message: `Expected visitor ${exp.name} successfully checked in! Pass ID: ${visitorId}`,
      visitor: activeVisitor
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Cancel Expected Visitor
export const cancelExpectedVisitor = async (req, res) => {
  const { id } = req.params;

  try {
    await query(`UPDATE expected_visitors SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [id]);
    res.status(200).json({ success: true, message: 'Expected visit marked as Cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
