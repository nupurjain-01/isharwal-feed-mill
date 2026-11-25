import { query } from '../config/db.js';

// Get Recent Notifications
export const getNotifications = async (req, res) => {
  try {
    let sql = `
      SELECT n.*, e.name as employee_name
      FROM notifications n
      LEFT JOIN employees e ON e.id = n.employee_id
    `;
    const params = [];

    // If user is employee, only fetch their notifications. If admin/receptionist, show all recent
    if (req.user.role === 'employee' && req.user.employee_id) {
      params.push(req.user.employee_id);
      sql += ` WHERE n.employee_id = $1`;
    }

    sql += ' ORDER BY n.created_at DESC LIMIT 30';

    const result = await query(sql, params);
    res.status(200).json({ success: true, notifications: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark Single Notification as Read
export const markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark All Notifications as Read
export const markAllAsRead = async (req, res) => {
  try {
    if (req.user.role === 'employee' && req.user.employee_id) {
      await query('UPDATE notifications SET is_read = true WHERE employee_id = $1', [req.user.employee_id]);
    } else {
      await query('UPDATE notifications SET is_read = true');
    }
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
