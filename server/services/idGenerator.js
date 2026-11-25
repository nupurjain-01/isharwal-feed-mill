import { query } from '../config/db.js';

export const generateVisitorAndPassIds = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const visitorPrefix = `IFM-${dateStr}-`;
  const passPrefix = `GP-${dateStr}-`;

  // Query highest ID for today
  const res = await query(
    `SELECT visitor_id FROM visitors 
     WHERE visitor_id LIKE $1 
     ORDER BY id DESC LIMIT 1`,
    [`${visitorPrefix}%`]
  );

  let nextNumber = 1;
  if (res.rows.length > 0) {
    const lastId = res.rows[0].visitor_id; // e.g. "UMX-20261120-0042"
    const parts = lastId.split('-');
    if (parts.length === 3) {
      const parsedNum = parseInt(parts[2], 10);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }
  }

  const paddedNumber = String(nextNumber).padStart(4, '0');
  return {
    visitorId: `${visitorPrefix}${paddedNumber}`,
    gatePassNo: `${passPrefix}${paddedNumber}`
  };
};

export const generateVisitorId = async () => {
  const ids = await generateVisitorAndPassIds();
  return ids.visitorId;
};
