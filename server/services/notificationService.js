import { query } from '../config/db.js';
import nodemailer from 'nodemailer';

let ioInstance = null;

export const setSocketIO = (io) => {
  ioInstance = io;
};

// Create in-app and real-time notification
export const sendVisitorNotification = async ({
  employeeId,
  visitorName,
  companyName,
  purpose,
  visitorId,
  inTime,
  gate = 'Gate 1'
}) => {
  try {
    const title = `Visitor Arrived: ${visitorName}`;
    const message = `${visitorName} from ${companyName || 'N/A'} has arrived at ${gate} for purpose: "${purpose}". (Pass ID: ${visitorId})`;

    // 1. Save to Database
    const res = await query(
      `INSERT INTO notifications (employee_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [employeeId, title, message, 'VISITOR_ARRIVAL']
    );

    const notification = res.rows[0];

    // 2. Real-time broadcast via Socket.io to office LAN / web browser clients
    if (ioInstance) {
      // Emit to employee-specific room & global notifications channel
      ioInstance.to(`employee_${employeeId}`).emit('new_notification', notification);
      ioInstance.emit('global_visitor_alert', {
        type: 'VISITOR_CHECKIN',
        notification,
        visitor: { visitorId, visitorName, companyName, purpose, inTime, gate }
      });
      console.log(`[Socket.io] Real-time visitor alert emitted for Employee ID: ${employeeId}`);
    }

    // 3. Send Free Email Alert if SMTP is configured
    sendEmailAlert(employeeId, visitorName, companyName, purpose, visitorId, inTime, gate)
      .catch(err => console.log('[Email Alert Skipped/Error]:', err.message));

    return notification;
  } catch (error) {
    console.error('[Notification Service Error]:', error.message);
  }
};

// Email notification helper
const sendEmailAlert = async (employeeId, visitorName, companyName, purpose, visitorId, inTime, gate) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return; // SMTP not configured yet
  }

  const empRes = await query('SELECT name, email FROM employees WHERE id = $1', [employeeId]);
  if (empRes.rows.length === 0 || !empRes.rows[0].email) return;

  const emp = empRes.rows[0];

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Isharwal Feed Mill Security Gate" <${process.env.SMTP_USER}>`,
    to: emp.email,
    subject: `🔔 Visitor Arrival Alert: ${visitorName} is waiting for you`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0c8de9;">ISHARWAL FEED MILL – Visitor Arrival Alert</h2>
        <p>Dear <strong>${emp.name}</strong>,</p>
        <p>A visitor has checked in at the security gate to meet you:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Visitor Name:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${visitorName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Company:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${companyName || 'Personal'}</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Purpose:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${purpose}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Gate Pass ID:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${visitorId}</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Arrival Time:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(inTime).toLocaleTimeString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Gate Location:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${gate}</td></tr>
        </table>
        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">This is an automated security gate notification from ISHARWAL FEED MILL.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[Email Alert] Sent arrival email to ${emp.email}`);
};
