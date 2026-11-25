import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'ifm_super_secret_jwt_key_2026_feedmillsystem', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// 1. User Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active, u.employee_id,
              e.name as employee_name, d.name as department_name
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Contact Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    // Exclude password_hash
    delete user.password_hash;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('[Login Error]:', error.message);
    res.status(500).json({ success: false, message: 'Server error during login: ' + error.message });
  }
};

// 2. Get Current Logged-in User Profile
export const getMe = async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.employee_id,
              e.name as employee_name, d.name as department_name
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user: userRes.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Admin: Get All System Users
export const getAllUsers = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
             e.name as employee_name, d.name as department_name
      FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY u.id ASC
    `);
    res.status(200).json({ success: true, users: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Admin: Create New User
export const createUser = async (req, res) => {
  const { name, email, password, role, employeeId } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });
  }

  try {
    // Check duplicate email
    const check = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, employee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email.toLowerCase().trim(), passwordHash, role, employeeId || null]
    );

    res.status(201).json({ success: true, message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Admin: Toggle User Active Status
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const current = await query('SELECT is_active FROM users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = !current.rows[0].is_active;
    await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);

    res.status(200).json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      isActive: newStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Change Login Email & Password (User Self-Service / Security Update)
export const changeCredentials = async (req, res) => {
  const { currentEmail, currentPassword, newEmail, newPassword } = req.body;

  if (!currentEmail || !currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide your current email address and current password.'
    });
  }

  if (!newEmail && !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide either a new email address or a new password to update.'
    });
  }

  try {
    const userRes = await query(
      `SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1`,
      [currentEmail.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found matching the current email address.'
      });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match. Please enter the correct password.'
      });
    }

    let finalEmail = user.email;
    if (newEmail && newEmail.trim() !== '') {
      const emailTrim = newEmail.toLowerCase().trim();
      if (emailTrim !== user.email) {
        // Check if new email is already in use
        const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [emailTrim, user.id]);
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'This new email address is already registered to another account.'
          });
        }
        finalEmail = emailTrim;
      }
    }

    let finalPasswordHash = user.password_hash;
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword.trim().length < 4) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 4 characters long.'
        });
      }
      const salt = await bcrypt.genSalt(10);
      finalPasswordHash = await bcrypt.hash(newPassword.trim(), salt);
    }

    await query(
      `UPDATE users SET email = $1, password_hash = $2, updated_at = NOW() WHERE id = $3`,
      [finalEmail, finalPasswordHash, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Login credentials updated successfully in database! You can now log in.',
      updatedEmail: finalEmail
    });
  } catch (error) {
    console.error('[Change Credentials Error]:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
