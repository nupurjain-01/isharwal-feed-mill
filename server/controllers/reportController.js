import { query } from '../config/db.js';
import {
  generateVisitorReportExcel,
  generateTemplate,
  processDepartmentImport,
  processEmployeeImport,
  processMasterImport
} from '../services/excelService.js';

// 1. Get Filtered Reports Data
export const getReportsData = async (req, res) => {
  const { date_filter, start_date, end_date, department_id, host_employee_id, status } = req.query;

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

    // Quick Date Filters
    if (date_filter === 'today') {
      sql += ` AND v.in_time >= CURRENT_DATE`;
    } else if (date_filter === 'yesterday') {
      sql += ` AND v.in_time >= CURRENT_DATE - INTERVAL '1 day' AND v.in_time < CURRENT_DATE`;
    } else if (date_filter === 'this_week') {
      sql += ` AND v.in_time >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (date_filter === 'this_month') {
      sql += ` AND v.in_time >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (start_date && end_date) {
      params.push(start_date);
      sql += ` AND v.in_time >= $${params.length}::timestamp`;
      params.push(`${end_date} 23:59:59`);
      sql += ` AND v.in_time <= $${params.length}::timestamp`;
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

    sql += ' ORDER BY v.in_time DESC';

    const result = await query(sql, params);
    res.status(200).json({ success: true, count: result.rows.length, reports: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Export Filtered Reports to Excel
export const exportReportsToExcel = async (req, res) => {
  const { date_filter, start_date, end_date, department_id, host_employee_id, status } = req.query;

  try {
    let sql = `
      SELECT v.*,
             d.name as department_name,
             COALESCE(e.name, v.custom_host_name, 'Other Host') as host_employee_name
      FROM visitors v
      JOIN departments d ON d.id = v.department_id
      LEFT JOIN employees e ON e.id = v.host_employee_id
      WHERE 1=1
    `;
    const params = [];

    if (date_filter === 'today') {
      sql += ` AND v.in_time >= CURRENT_DATE`;
    } else if (date_filter === 'this_week') {
      sql += ` AND v.in_time >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (date_filter === 'this_month') {
      sql += ` AND v.in_time >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (start_date && end_date) {
      params.push(start_date);
      sql += ` AND v.in_time >= $${params.length}::timestamp`;
      params.push(`${end_date} 23:59:59`);
      sql += ` AND v.in_time <= $${params.length}::timestamp`;
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

    sql += ' ORDER BY v.in_time DESC';

    const result = await query(sql, params);
    const workbook = await generateVisitorReportExcel(result.rows);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="IFM_Visitor_Report_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Download Excel Template for Import
export const downloadTemplate = async (req, res) => {
  const { type } = req.params; // 'master', 'departments' or 'employees'

  try {
    const workbook = await generateTemplate(type);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="IFM_${type}_template.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Bulk Import Departments via Excel
export const importDepartments = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx)' });
  }

  try {
    const result = await processDepartmentImport(req.file.buffer);
    res.status(200).json({
      success: true,
      message: `Import processed: ${result.imported} created, ${result.skipped} skipped.`,
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Bulk Import Employees via Excel
export const importEmployees = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx)' });
  }

  try {
    const result = await processEmployeeImport(req.file.buffer);
    res.status(200).json({
      success: true,
      message: `Import processed: ${result.imported} created, ${result.skipped} skipped.`,
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Master Bulk Import (Reads Excel with Departments, Employees & HODs all-in-one)
export const importMaster = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx, .xls)' });
  }

  try {
    const result = await processMasterImport(req.file.buffer);
    res.status(200).json({
      success: true,
      message: `Master import processed successfully! Created ${result.departmentsCreated} departments, ${result.employeesCreated} employees/HODs (${result.employeesUpdated} updated, ${result.skipped} skipped).`,
      result
    });
  } catch (error) {
    console.error('[Master Import Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process master Excel: ' + error.message });
  }
};
