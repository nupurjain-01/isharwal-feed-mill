import { query } from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Metric Counters
    const metricsRes = await query(`
      SELECT
        -- Total visitors today
        COUNT(CASE WHEN in_time >= CURRENT_DATE AND in_time < CURRENT_DATE + INTERVAL '1 day' THEN 1 END) as visitors_today,
        -- Currently inside visitors
        COUNT(CASE WHEN status = 'INSIDE' THEN 1 END) as currently_inside,
        -- Checked out today
        COUNT(CASE WHEN status = 'CHECKED_OUT' AND out_time >= CURRENT_DATE THEN 1 END) as checked_out_today,
        -- Total historical visitors
        COUNT(*) as total_all_time
      FROM visitors
    `);

    // Expected visitors today
    const expRes = await query(`
      SELECT 
        COUNT(*) as expected_today,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as expected_pending
      FROM expected_visitors
      WHERE expected_date = CURRENT_DATE
    `);

    // 2. Department-wise Visitor Breakdown (for Chart)
    const deptStatsRes = await query(`
      SELECT d.name as department, COUNT(v.id) as count
      FROM departments d
      LEFT JOIN visitors v ON v.department_id = d.id 
           AND v.in_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY d.name
      HAVING COUNT(v.id) > 0
      ORDER BY count DESC
      LIMIT 8
    `);

    // 3. Hourly Activity for Today (for Area/Bar Chart)
    const hourlyRes = await query(`
      SELECT 
        TO_CHAR(in_time, 'HH24:00') as hour,
        COUNT(*) as count
      FROM visitors
      WHERE in_time >= CURRENT_DATE
      GROUP BY TO_CHAR(in_time, 'HH24:00')
      ORDER BY hour ASC
    `);

    // 4. Recent 8 Visitor Movements
    const recentRes = await query(`
      SELECT v.id, v.visitor_id, v.name, v.mobile, v.company_name, v.status,
             v.purpose, v.in_time, v.out_time,
             d.name as department_name,
             e.name as host_employee_name
      FROM visitors v
      JOIN departments d ON d.id = v.department_id
      JOIN employees e ON e.id = v.host_employee_id
      ORDER BY v.in_time DESC
      LIMIT 8
    `);

    res.status(200).json({
      success: true,
      stats: {
        visitorsToday: parseInt(metricsRes.rows[0].visitors_today, 10) || 0,
        currentlyInside: parseInt(metricsRes.rows[0].currently_inside, 10) || 0,
        checkedOutToday: parseInt(metricsRes.rows[0].checked_out_today, 10) || 0,
        totalAllTime: parseInt(metricsRes.rows[0].total_all_time, 10) || 0,
        expectedToday: parseInt(expRes.rows[0].expected_today, 10) || 0,
        expectedPending: parseInt(expRes.rows[0].expected_pending, 10) || 0
      },
      departmentStats: deptStatsRes.rows,
      hourlyActivity: hourlyRes.rows,
      recentVisitors: recentRes.rows
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
