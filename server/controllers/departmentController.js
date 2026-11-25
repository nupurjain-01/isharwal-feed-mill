import { query } from '../config/db.js';

// 1. Get All Departments (with Employee count)
export const getDepartments = async (req, res) => {
  try {
    const result = await query(`
      SELECT d.id, d.name, d.code, d.description, d.is_active, d.created_at,
             COUNT(e.id)::int as employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = true
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    res.status(200).json({ success: true, departments: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create Department
export const createDepartment = async (req, res) => {
  const { name, code, description } = req.body;

  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Department Name and Code are required' });
  }

  try {
    const check = await query('SELECT 1 FROM departments WHERE code = $1 OR name = $2', [code.toUpperCase().trim(), name.trim()]);
    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Department with this code or name already exists' });
    }

    const result = await query(
      `INSERT INTO departments (name, code, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), code.toUpperCase().trim(), description?.trim() || '']
    );

    res.status(201).json({ success: true, message: 'Department created successfully', department: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update Department
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code, description, is_active } = req.body;

  try {
    const current = await query('SELECT * FROM departments WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const result = await query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name?.trim(), code?.toUpperCase()?.trim(), description?.trim(), is_active, id]
    );

    res.status(200).json({ success: true, message: 'Department updated successfully', department: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Delete Department (Protected: cannot delete if active employees exist)
export const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    const empCheck = await query('SELECT COUNT(*) FROM employees WHERE department_id = $1', [id]);
    const empCount = parseInt(empCheck.rows[0].count, 10);

    if (empCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. There are ${empCount} employee(s) assigned to it. Please reassign them first.`
      });
    }

    await query('DELETE FROM departments WHERE id = $1', [id]);
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
