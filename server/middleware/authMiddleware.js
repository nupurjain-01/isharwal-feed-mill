import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'umax_super_secret_jwt_key_2026_packagingsystem');
    const userRes = await query(
      'SELECT id, name, email, role, employee_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role}' is not authorized to perform this action.`
      });
    }
    next();
  };
};
