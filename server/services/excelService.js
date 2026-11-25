import ExcelJS from 'exceljs';
import { pool, query } from '../config/db.js';

// 1. Export Visitor Records to Excel Workbook
export const generateVisitorReportExcel = async (visitors) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Isharwal Feed Mill Gate System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Visitor Gate Log', {
    properties: { tabColor: { argb: '0C8DE9' } },
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  // Title Banner
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'ISHARWAL FEED MILL – VISITOR GATE ENTRY REPORT';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '0258A1' }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // Header Row
  worksheet.getRow(2).values = [
    'Pass ID',
    'Visitor Name',
    'Mobile',
    'Company',
    'Department',
    'Person to Meet',
    'Purpose',
    'Vehicle No',
    'Visitors Count',
    'In Time',
    'Out Time',
    'Status'
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.height = 24;
  headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '0C8DE9' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Data Rows
  visitors.forEach((v) => {
    const row = worksheet.addRow([
      v.visitor_id,
      v.name,
      v.mobile,
      v.company_name || 'N/A',
      v.department_name,
      v.host_employee_name,
      v.purpose,
      v.vehicle_number || '-',
      v.number_of_visitors || 1,
      v.in_time ? new Date(v.in_time).toLocaleString() : '-',
      v.out_time ? new Date(v.out_time).toLocaleString() : 'INSIDE',
      v.status
    ]);

    row.height = 20;
    row.font = { name: 'Arial', size: 9 };
    
    // Status color badge
    const statusCell = row.getCell(12);
    if (v.status === 'INSIDE') {
      statusCell.font = { bold: true, color: { argb: '059669' } }; // green
    } else {
      statusCell.font = { color: { argb: '4B5563' } }; // gray
    }
  });

  // Auto-fit Column Widths
  worksheet.columns.forEach((col) => {
    let maxLength = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    col.width = Math.min(maxLength + 3, 30);
  });

  return workbook;
};

// 2. Generate Sample Excel Templates for Import
export const generateTemplate = async (type) => {
  const workbook = new ExcelJS.Workbook();

  if (type === 'master') {
    const ws = workbook.addWorksheet('IFM Master Data');
    ws.getRow(1).values = [
      'Department Name*',
      'Department Code',
      'Employee / HOD Name*',
      'Designation',
      'Mobile Phone*',
      'Email'
    ];
    ws.addRow(['Plant Operations', 'OPS', 'Suresh Kumar', 'Plant Head', '9876543210', 'suresh.kumar@isharwalfeedmill.com']);
    ws.addRow(['Feed Production', 'PROD', 'Rajesh Sharma', 'Production In-Charge', '9876543211', 'rajesh.sharma@isharwalfeedmill.com']);
    ws.addRow(['Quality Control', 'QC', 'Amit Verma', 'Quality Lab Head', '9876543212', 'amit.verma@isharwalfeedmill.com']);
    ws.addRow(['Procurement & Grain Storage', 'PROC', 'Vikram Singh', 'Purchase Manager', '9876543214', 'vikram.singh@isharwalfeedmill.com']);
    ws.addRow(['Accounts & Billing', 'ACC', 'Naresh Jain', 'Finance Lead', '9898012345', 'naresh.jain@isharwalfeedmill.com']);
    ws.addRow(['Dispatch & Weighbridge', 'DISP', 'Ramesh Yadav', 'Logistics Supervisor', '9825123499', 'ramesh.yadav@isharwalfeedmill.com']);
    formatTemplateHeader(ws);
  } else if (type === 'departments') {
    const ws = workbook.addWorksheet('Departments Template');
    ws.getRow(1).values = ['Department Name*', 'Department Code*', 'Description'];
    ws.addRow(['Raw Material Gate', 'RMG', 'Grain & raw material intake']);
    ws.addRow(['Maintenance', 'MAINT', 'Mill machinery & electrical maintenance']);
    formatTemplateHeader(ws);
  } else if (type === 'employees') {
    const ws = workbook.addWorksheet('Employees Template');
    ws.getRow(1).values = [
      'Employee Code*',
      'Full Name*',
      'Email*',
      'Mobile Phone*',
      'Department Code*',
      'Designation'
    ];
    ws.addRow(['EMP-QC-01', 'Amit Verma', 'amit.verma@isharwalfeedmill.com', '9898012345', 'QC', 'Quality Lab Head']);
    ws.addRow(['EMP-DISP-01', 'Ramesh Yadav', 'ramesh.yadav@isharwalfeedmill.com', '9898012346', 'DISP', 'Logistics Supervisor']);
    formatTemplateHeader(ws);
  }

  return workbook;
};

const formatTemplateHeader = (worksheet) => {
  const header = worksheet.getRow(1);
  header.height = 25;
  header.font = { bold: true, color: { argb: 'FFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '0258A1' }
  };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.columns.forEach(col => col.width = 22);
};

// 3. Import Departments from Excel Buffer
export const processDepartmentImport = async (fileBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  const worksheet = workbook.worksheets[0];

  const results = { total: 0, imported: 0, skipped: 0, errors: [] };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const name = row.getCell(1).text?.trim();
      const code = row.getCell(2).text?.trim()?.toUpperCase();
      const desc = row.getCell(3).text?.trim() || '';

      if (name && code) {
        rows.push({ name, code, desc, rowNumber });
      } else {
        results.errors.push(`Row ${rowNumber}: Department Name and Code are required.`);
        results.skipped++;
      }
      results.total++;
    });

    for (const r of rows) {
      try {
        const res = await client.query(
          `INSERT INTO departments (name, code, description) 
           VALUES ($1, $2, $3)
           ON CONFLICT (code) DO NOTHING
           RETURNING id`,
          [r.name, r.code, r.desc]
        );

        if (res.rowCount > 0) {
          results.imported++;
        } else {
          results.skipped++;
          results.errors.push(`Row ${r.rowNumber}: Department code '${r.code}' already exists.`);
        }
      } catch (err) {
        results.skipped++;
        results.errors.push(`Row ${r.rowNumber}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// 4. Import Employees from Excel Buffer
export const processEmployeeImport = async (fileBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  const worksheet = workbook.worksheets[0];

  const results = { total: 0, imported: 0, skipped: 0, errors: [] };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch existing department map (Code -> ID)
    const deptRes = await client.query('SELECT id, code FROM departments WHERE is_active = true');
    const deptMap = new Map();
    deptRes.rows.forEach(d => deptMap.set(d.code.toUpperCase(), d.id));

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const code = row.getCell(1).text?.trim()?.toUpperCase();
      const name = row.getCell(2).text?.trim();
      const email = row.getCell(3).text?.trim()?.toLowerCase();
      const phone = row.getCell(4).text?.trim();
      const deptCode = row.getCell(5).text?.trim()?.toUpperCase();
      const designation = row.getCell(6).text?.trim() || 'Staff';

      if (!code || !name || !email || !phone || !deptCode) {
        results.errors.push(`Row ${rowNumber}: Missing mandatory fields.`);
        results.skipped++;
      } else if (!deptMap.has(deptCode)) {
        results.errors.push(`Row ${rowNumber}: Department code '${deptCode}' not found. Please create department first.`);
        results.skipped++;
      } else {
        rows.push({
          code,
          name,
          email,
          phone,
          departmentId: deptMap.get(deptCode),
          designation,
          rowNumber
        });
      }
      results.total++;
    });

    for (const r of rows) {
      try {
        const res = await client.query(
          `INSERT INTO employees (employee_code, name, email, phone, department_id, designation)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (employee_code) DO NOTHING
           RETURNING id`,
          [r.code, r.name, r.email, r.phone, r.departmentId, r.designation]
        );

        if (res.rowCount > 0) {
          results.imported++;
        } else {
          results.skipped++;
          results.errors.push(`Row ${r.rowNumber}: Employee code '${r.code}' already exists.`);
        }
      } catch (err) {
        results.skipped++;
        results.errors.push(`Row ${r.rowNumber}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// 5. Combined Master Import (Reads Excel with Departments, Employees & HODs in one single file)
export const processMasterImport = async (fileBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  const worksheet = workbook.worksheets[0];

  const results = {
    total: 0,
    departmentsCreated: 0,
    employeesCreated: 0,
    employeesUpdated: 0,
    skipped: 0,
    errors: []
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Cache existing departments
    const existingDepts = await client.query('SELECT id, name, code FROM departments');
    const deptByName = new Map();
    const deptByCode = new Map();
    existingDepts.rows.forEach(d => {
      deptByName.set(d.name.toLowerCase().trim(), d);
      deptByCode.set(d.code.toUpperCase().trim(), d);
    });

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const deptName = row.getCell(1).text?.trim();
      let deptCode = row.getCell(2).text?.trim()?.toUpperCase();
      const empName = row.getCell(3).text?.trim();
      const designation = row.getCell(4).text?.trim() || 'Staff';
      const phone = row.getCell(5).text?.trim()?.replace(/\D/g, '');
      let email = row.getCell(6).text?.trim()?.toLowerCase();

      if (!deptName && !empName) return; // Empty row

      if (!deptName) {
        results.errors.push(`Row ${rowNumber}: Department Name is required.`);
        results.skipped++;
        results.total++;
        return;
      }

      if (!empName) {
        results.errors.push(`Row ${rowNumber}: Employee/HOD Name is required.`);
        results.skipped++;
        results.total++;
        return;
      }

      if (!deptCode) {
        // Auto-generate code from department name (first 3-4 letters)
        deptCode = deptName.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase();
        if (deptCode.length < 2) deptCode = 'DEPT' + Math.floor(10 + Math.random() * 90);
      }

      // Generate phone if missing or format to 10 digits
      const cleanPhone = phone && phone.length >= 10 ? phone.slice(-10) : ('98' + Math.floor(10000000 + Math.random() * 90000000));

      // Generate email if missing
      if (!email) {
        const slug = empName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        email = `${slug}.${deptCode.toLowerCase()}@isharwalfeedmill.com`;
      }

      rows.push({
        deptName,
        deptCode,
        empName,
        designation,
        phone: cleanPhone,
        email,
        rowNumber
      });
      results.total++;
    });

    for (const r of rows) {
      try {
        let deptId = null;

        // 1. Resolve or Create Department
        const existingDept = deptByName.get(r.deptName.toLowerCase()) || deptByCode.get(r.deptCode);
        if (existingDept) {
          deptId = existingDept.id;
        } else {
          const dbDept = await client.query(
            'SELECT id, name, code FROM departments WHERE LOWER(name) = LOWER($1) OR UPPER(code) = UPPER($2)',
            [r.deptName, r.deptCode]
          );
          if (dbDept.rows.length > 0) {
            deptId = dbDept.rows[0].id;
            deptByName.set(r.deptName.toLowerCase(), dbDept.rows[0]);
            deptByCode.set(r.deptCode, dbDept.rows[0]);
          } else {
            const newDept = await client.query(
              `INSERT INTO departments (name, code, description)
               VALUES ($1, $2, $3)
               RETURNING id, name, code`,
              [r.deptName, r.deptCode, 'Imported via Master Excel']
            );
            deptId = newDept.rows[0].id;
            deptByName.set(r.deptName.toLowerCase(), newDept.rows[0]);
            deptByCode.set(r.deptCode, newDept.rows[0]);
            results.departmentsCreated++;
          }
        }

        // 2. Resolve or Create Employee
        const empCheck = await client.query(
          'SELECT id FROM employees WHERE phone = $1 OR email = $2',
          [r.phone, r.email]
        );

        if (empCheck.rows.length > 0) {
          // Update existing employee designation and department
          await client.query(
            `UPDATE employees SET department_id = $1, designation = $2, name = $3, updated_at = NOW() WHERE id = $4`,
            [deptId, r.designation, r.empName, empCheck.rows[0].id]
          );
          results.employeesUpdated++;
        } else {
          // Generate unique employee code
          const empCode = `EMP-${r.deptCode}-${Math.floor(100 + Math.random() * 900)}`;
          await client.query(
            `INSERT INTO employees (employee_code, name, email, phone, department_id, designation)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [empCode, r.empName, r.email, r.phone, deptId, r.designation]
          );
          results.employeesCreated++;
        }
      } catch (rowErr) {
        results.skipped++;
        results.errors.push(`Row ${r.rowNumber} (${r.empName}): ${rowErr.message}`);
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
