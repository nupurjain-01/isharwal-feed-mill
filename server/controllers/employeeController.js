import { query } from '../config/db.js';

// 1. Get All Employees (Supports search by name/code and filter by department)
export const getEmployees = async (req, res) => {
  const { department_id, search } = req.query;

  try {
    let sql = `
      SELECT e.id, e.employee_code, e.name, e.email, e.phone, e.designation,
             e.is_active, e.created_at, e.department_id,
             d.name as department_name, d.code as department_code
      FROM employees e
      JOIN departments d ON d.id = e.department_id
      WHERE e.is_active = true
    `;
    const params = [];

    // Filter by specific department (for dynamic dropdown)
    if (department_id) {
      params.push(department_id);
      sql += ` AND e.department_id = $${params.length}`;
    }

    // Search by name, code or email
    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (e.name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
    }

    sql += ' ORDER BY e.name ASC';

    const result = await query(sql, params);
    res.status(200).json({ success: true, employees: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create Employee
export const createEmployee = async (req, res) => {
  const { employee_code, name, email, phone, designation, department_id } = req.body;

  if (!employee_code || !name || !email || !phone || !department_id) {
    return res.status(400).json({ success: false, message: 'All fields including Department are required' });
  }

  try {
    const check = await query(
      'SELECT 1 FROM employees WHERE employee_code = $1 OR email = $2',
      [employee_code.toUpperCase().trim(), email.toLowerCase().trim()]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Employee with this code or email already exists' });
    }

    const result = await query(
      `INSERT INTO employees (employee_code, name, email, phone, designation, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [employee_code.toUpperCase().trim(), name.trim(), email.toLowerCase().trim(), phone.trim(), designation?.trim() || 'Staff', department_id]
    );

    res.status(201).json({ success: true, message: 'Employee created successfully', employee: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update Employee
export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, designation, department_id, is_active } = req.body;

  try {
    const current = await query('SELECT * FROM employees WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const result = await query(
      `UPDATE employees
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           designation = COALESCE($4, designation),
           department_id = COALESCE($5, department_id),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name?.trim(), email?.toLowerCase()?.trim(), phone?.trim(), designation?.trim(), department_id, is_active, id]
    );

    res.status(200).json({ success: true, message: 'Employee updated successfully', employee: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Delete Employee
export const deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if visitor logs reference this employee
    const visitorCheck = await query('SELECT COUNT(*) FROM visitors WHERE host_employee_id = $1', [id]);
    const count = parseInt(visitorCheck.rows[0].count, 10);

    if (count > 0) {
      // Soft-delete (deactivate) so historical visitor audit trails are not broken
      await query('UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
      return res.status(200).json({
        success: true,
        message: 'Employee has visitor history; account has been safely deactivated instead of deleted.'
      });
    }

    await query('DELETE FROM employees WHERE id = $1', [id]);
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
