import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine database file storage path (writable in both dev & installed desktop app)
function getDbFilePath() {
  const isPackaged = process.env.NODE_ENV === 'production' && !process.env.DEV_MODE;
  let targetDir;
  if (isPackaged && process.env.APPDATA) {
    targetDir = path.join(process.env.APPDATA, 'IsharwalFeedMill', 'data');
  } else {
    targetDir = path.resolve(__dirname, '../data');
  }

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      targetDir = path.resolve(__dirname, '../data');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  return path.join(targetDir, 'ifm_gate_store.json');
}

const DB_FILE = getDbFilePath();

// In-Memory Database Cache
let store = {
  users: [],
  departments: [],
  employees: [],
  visitors: [],
  expected_visitors: [],
  notifications: [],
  counters: {
    users: 2,
    departments: 0,
    employees: 0,
    visitors: 0,
    expected_visitors: 0,
    notifications: 0
  }
};

// Seed default users if clean
function getInitialSeed() {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const guardHash = bcrypt.hashSync('guard123', 10);
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 1,
        employee_id: null,
        name: 'System Administrator',
        email: 'admin@isharwalfeedmill.com',
        password_hash: adminHash,
        role: 'admin',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        employee_id: null,
        name: 'Security Gate 1',
        email: 'gate@isharwalfeedmill.com',
        password_hash: guardHash,
        role: 'receptionist',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ],
    departments: [],
    employees: [],
    visitors: [],
    expected_visitors: [],
    notifications: [],
    counters: {
      users: 2,
      departments: 0,
      employees: 0,
      visitors: 0,
      expected_visitors: 0,
      notifications: 0
    }
  };
}

export function initEmbeddedStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      store = JSON.parse(raw);
      if (!store.users || store.users.length === 0) {
        store = getInitialSeed();
        saveStore();
      }
    } else {
      store = getInitialSeed();
      saveStore();
    }
    console.log(`[Embedded DB] Successfully initialized at: ${DB_FILE}`);
    return true;
  } catch (err) {
    console.error('[Embedded DB] Load error, resetting to clean state:', err.message);
    store = getInitialSeed();
    saveStore();
    return true;
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[Embedded DB] Save error:', err.message);
  }
}

// Helpers for dates
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

function isYesterday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  return d.getFullYear() === yest.getFullYear() &&
         d.getMonth() === yest.getMonth() &&
         d.getDate() === yest.getDate();
}

// Main Query Dispatcher for Embedded Database
export async function executeEmbeddedQuery(sql, params = []) {
  const trimmed = sql.trim().replace(/\s+/g, ' ');
  const upper = trimmed.toUpperCase();

  // 1. Connection check
  if (upper.includes('SELECT NOW()') || upper.includes('CURRENT_DATABASE()')) {
    return {
      rows: [{ current_time: new Date().toISOString(), db_name: 'ifm_embedded_store' }],
      rowCount: 1
    };
  }

  // 2. Transaction controls (No-op in single-process embedded store)
  if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
    return { rows: [], rowCount: 0 };
  }

  // 3. USERS
  if (upper.startsWith('SELECT') && upper.includes('FROM USERS')) {
    // Single user by ID
    if (upper.includes('WHERE U.ID = $1') || upper.includes('WHERE ID = $1')) {
      const id = parseInt(params[0], 10);
      const user = store.users.find(u => u.id === id);
      if (!user) return { rows: [], rowCount: 0 };
      const row = { ...user };
      if (user.employee_id) {
        const emp = store.employees.find(e => e.id === user.employee_id);
        row.employee_name = emp?.name || null;
        if (emp?.department_id) {
          const dept = store.departments.find(d => d.id === emp.department_id);
          row.department_name = dept?.name || null;
        }
      }
      return { rows: [row], rowCount: 1 };
    }

    // User by email / identifier
    if (upper.includes('WHERE U.EMAIL = $1') || upper.includes('WHERE EMAIL = $1')) {
      const identifier = String(params[0] || '').toLowerCase().trim();
      const user = store.users.find(u => {
        const email = (u.email || '').toLowerCase().trim();
        const name = (u.name || '').toLowerCase().trim();
        return email === identifier ||
               (identifier === 'admin' && u.role === 'admin') ||
               ((identifier === 'gate' || identifier === 'guard') && u.role === 'receptionist');
      });
      if (!user) return { rows: [], rowCount: 0 };
      const row = { ...user };
      if (user.employee_id) {
        const emp = store.employees.find(e => e.id === user.employee_id);
        row.employee_name = emp?.name || null;
        if (emp?.department_id) {
          const dept = store.departments.find(d => d.id === emp.department_id);
          row.department_name = dept?.name || null;
        }
      }
      return { rows: [row], rowCount: 1 };
    }

    // Email check with ID exclusion
    if (upper.includes('WHERE EMAIL = $1 AND ID !=')) {
      const email = String(params[0] || '').toLowerCase().trim();
      const excludeId = parseInt(params[1], 10);
      const match = store.users.find(u => (u.email || '').toLowerCase().trim() === email && u.id !== excludeId);
      return { rows: match ? [{ id: match.id }] : [], rowCount: match ? 1 : 0 };
    }

    // Check duplicate email
    if (upper.includes('SELECT 1 FROM USERS WHERE EMAIL = $1')) {
      const email = String(params[0] || '').toLowerCase().trim();
      const exists = store.users.some(u => (u.email || '').toLowerCase().trim() === email);
      return { rows: exists ? [{ '?column?': 1 }] : [], rowCount: exists ? 1 : 0 };
    }

    // Check is_active
    if (upper.includes('SELECT IS_ACTIVE FROM USERS WHERE ID = $1')) {
      const id = parseInt(params[0], 10);
      const user = store.users.find(u => u.id === id);
      return { rows: user ? [{ is_active: user.is_active }] : [], rowCount: user ? 1 : 0 };
    }

    // Get all users
    const list = store.users.map(u => {
      const row = { ...u };
      delete row.password_hash;
      if (u.employee_id) {
        const emp = store.employees.find(e => e.id === u.employee_id);
        row.employee_name = emp?.name || null;
        if (emp?.department_id) {
          const dept = store.departments.find(d => d.id === emp.department_id);
          row.department_name = dept?.name || null;
        }
      }
      return row;
    });
    return { rows: list, rowCount: list.length };
  }

  // Insert user
  if (upper.startsWith('INSERT INTO USERS')) {
    store.counters.users = (store.counters.users || 0) + 1;
    const now = new Date().toISOString();
    const newUser = {
      id: store.counters.users,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3],
      employee_id: params[4] || null,
      is_active: true,
      created_at: now,
      updated_at: now
    };
    store.users.push(newUser);
    saveStore();
    return { rows: [{ ...newUser }], rowCount: 1 };
  }

  // Update user
  if (upper.startsWith('UPDATE USERS')) {
    if (upper.includes('SET IS_ACTIVE = $1')) {
      const newStatus = !!params[0];
      const id = parseInt(params[1], 10);
      const user = store.users.find(u => u.id === id);
      if (user) {
        user.is_active = newStatus;
        user.updated_at = new Date().toISOString();
        saveStore();
        return { rows: [user], rowCount: 1 };
      }
    }
    if (upper.includes('SET EMAIL = $1')) {
      const email = params[0];
      const passHash = params[1];
      const id = parseInt(params[2], 10);
      const user = store.users.find(u => u.id === id);
      if (user) {
        user.email = email;
        user.password_hash = passHash;
        user.updated_at = new Date().toISOString();
        saveStore();
        return { rows: [user], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  // 4. DEPARTMENTS
  if (upper.startsWith('SELECT') && upper.includes('FROM DEPARTMENTS')) {
    // Check duplicate code or name
    if (upper.includes('WHERE CODE = $1 OR NAME = $2') || upper.includes('WHERE LOWER(NAME) =') || upper.includes('WHERE UPPER(CODE) =')) {
      const val1 = String(params[0] || '').toLowerCase().trim();
      const val2 = String(params[1] || val1).toLowerCase().trim();
      const match = store.departments.find(d => 
        (d.code || '').toLowerCase().trim() === val1 ||
        (d.name || '').toLowerCase().trim() === val2 ||
        (d.name || '').toLowerCase().trim() === val1
      );
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // Single department by ID
    if (upper.includes('WHERE ID = $1')) {
      const id = parseInt(params[0], 10);
      const dept = store.departments.find(d => d.id === id);
      return { rows: dept ? [dept] : [], rowCount: dept ? 1 : 0 };
    }

    // All active departments
    if (upper.includes('WHERE IS_ACTIVE = TRUE')) {
      const activeDepts = store.departments.filter(d => d.is_active !== false);
      return { rows: activeDepts, rowCount: activeDepts.length };
    }

    // All departments with employee count
    const deptsWithCount = store.departments.map(d => {
      const empCount = store.employees.filter(e => e.department_id === d.id && e.is_active !== false).length;
      return { ...d, employee_count: empCount };
    });
    deptsWithCount.sort((a, b) => a.name.localeCompare(b.name));
    return { rows: deptsWithCount, rowCount: deptsWithCount.length };
  }

  // Insert department
  if (upper.startsWith('INSERT INTO DEPARTMENTS')) {
    store.counters.departments = (store.counters.departments || 0) + 1;
    const now = new Date().toISOString();
    const newDept = {
      id: store.counters.departments,
      name: params[0],
      code: String(params[1] || '').toUpperCase(),
      description: params[2] || '',
      is_active: true,
      created_at: now,
      updated_at: now
    };
    store.departments.push(newDept);
    saveStore();
    return { rows: [newDept], rowCount: 1 };
  }

  // Update department
  if (upper.startsWith('UPDATE DEPARTMENTS')) {
    const id = parseInt(params[params.length - 1], 10);
    const dept = store.departments.find(d => d.id === id);
    if (dept) {
      if (params[0] !== undefined && params[0] !== null) dept.name = params[0];
      if (params[1] !== undefined && params[1] !== null) dept.code = params[1];
      if (params[2] !== undefined && params[2] !== null) dept.description = params[2];
      if (params[3] !== undefined && params[3] !== null) dept.is_active = params[3];
      dept.updated_at = new Date().toISOString();
      saveStore();
      return { rows: [dept], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // Delete department
  if (upper.startsWith('DELETE FROM DEPARTMENTS')) {
    const id = parseInt(params[0], 10);
    store.departments = store.departments.filter(d => d.id !== id);
    saveStore();
    return { rows: [{ id }], rowCount: 1 };
  }

  // 5. EMPLOYEES
  if (upper.startsWith('SELECT') && upper.includes('FROM EMPLOYEES')) {
    // Count employees in department
    if (upper.includes('SELECT COUNT(*)') && upper.includes('WHERE DEPARTMENT_ID = $1')) {
      const deptId = parseInt(params[0], 10);
      const count = store.employees.filter(e => e.department_id === deptId && e.is_active !== false).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    // Check duplicate code or email
    if (upper.includes('WHERE EMPLOYEE_CODE = $1 OR EMAIL = $2') || upper.includes('WHERE PHONE = $1 OR EMAIL = $2')) {
      const val1 = String(params[0] || '').toLowerCase().trim();
      const val2 = String(params[1] || '').toLowerCase().trim();
      const match = store.employees.find(e => 
        (e.employee_code || '').toLowerCase().trim() === val1 ||
        (e.phone || '').trim() === val1 ||
        (e.email || '').toLowerCase().trim() === val2
      );
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // Single employee by ID
    if (upper.includes('WHERE E.ID = $1') || upper.includes('WHERE ID = $1')) {
      const id = parseInt(params[0], 10);
      const emp = store.employees.find(e => e.id === id);
      if (!emp) return { rows: [], rowCount: 0 };
      const dept = store.departments.find(d => d.id === emp.department_id);
      return { rows: [{ ...emp, department_name: dept?.name || '', department_code: dept?.code || '' }], rowCount: 1 };
    }

    // List employees with department info
    let list = store.employees.filter(e => e.is_active !== false);
    
    // Filter department
    const deptParam = params.find(p => typeof p === 'number' || (typeof p === 'string' && /^\d+$/.test(p)));
    if (deptParam && upper.includes('DEPARTMENT_ID =')) {
      const deptId = parseInt(deptParam, 10);
      list = list.filter(e => e.department_id === deptId);
    }

    // Search query
    const searchParam = params.find(p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
    if (searchParam) {
      const q = searchParam.replace(/%/g, '').toLowerCase().trim();
      list = list.filter(e => 
        (e.name || '').toLowerCase().includes(q) ||
        (e.employee_code || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      );
    }

    const enriched = list.map(e => {
      const dept = store.departments.find(d => d.id === e.department_id);
      return {
        ...e,
        department_name: dept?.name || '',
        department_code: dept?.code || ''
      };
    });
    enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return { rows: enriched, rowCount: enriched.length };
  }

  // Insert employee
  if (upper.startsWith('INSERT INTO EMPLOYEES')) {
    store.counters.employees = (store.counters.employees || 0) + 1;
    const now = new Date().toISOString();
    const newEmp = {
      id: store.counters.employees,
      employee_code: String(params[0] || '').toUpperCase(),
      name: params[1],
      email: String(params[2] || '').toLowerCase(),
      phone: params[3],
      department_id: parseInt(params[params.length === 6 ? 5 : 4], 10),
      designation: params[params.length === 6 ? 4 : 5] || 'Staff',
      is_active: true,
      created_at: now,
      updated_at: now
    };
    store.employees.push(newEmp);
    saveStore();
    return { rows: [newEmp], rowCount: 1 };
  }

  // Update employee
  if (upper.startsWith('UPDATE EMPLOYEES')) {
    if (upper.includes('SET IS_ACTIVE = FALSE')) {
      const id = parseInt(params[0], 10);
      const emp = store.employees.find(e => e.id === id);
      if (emp) {
        emp.is_active = false;
        emp.updated_at = new Date().toISOString();
        saveStore();
        return { rows: [emp], rowCount: 1 };
      }
    }
    const id = parseInt(params[params.length - 1], 10);
    const emp = store.employees.find(e => e.id === id);
    if (emp) {
      if (params[0]) emp.name = params[0];
      if (params[1]) emp.email = params[1];
      if (params[2]) emp.phone = params[2];
      if (params[3]) emp.designation = params[3];
      if (params[4]) emp.department_id = parseInt(params[4], 10);
      if (params[5] !== undefined) emp.is_active = params[5];
      emp.updated_at = new Date().toISOString();
      saveStore();
      return { rows: [emp], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // Delete employee
  if (upper.startsWith('DELETE FROM EMPLOYEES')) {
    const id = parseInt(params[0], 10);
    store.employees = store.employees.filter(e => e.id !== id);
    saveStore();
    return { rows: [{ id }], rowCount: 1 };
  }

  // 6. VISITORS
  if (upper.startsWith('SELECT') && upper.includes('FROM VISITORS')) {
    // Highest ID query for today
    if (upper.includes('SELECT VISITOR_ID FROM VISITORS WHERE VISITOR_ID LIKE $1')) {
      const prefix = params[0].replace('%', '');
      const matches = store.visitors.filter(v => (v.visitor_id || '').startsWith(prefix));
      matches.sort((a, b) => b.id - a.id);
      return { rows: matches.length > 0 ? [{ visitor_id: matches[0].visitor_id }] : [], rowCount: matches.length };
    }

    // Check count for employee deletion protection
    if (upper.includes('SELECT COUNT(*)') && upper.includes('WHERE HOST_EMPLOYEE_ID = $1')) {
      const empId = parseInt(params[0], 10);
      const count = store.visitors.filter(v => v.host_employee_id === empId).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    // Check single visitor for checkout
    if (upper.includes('WHERE ID::TEXT = $1 OR VISITOR_ID = $1 OR GATE_PASS_NO = $1') || upper.includes('WHERE V.ID::TEXT = $1')) {
      const queryId = String(params[0]);
      const visitor = store.visitors.find(v => String(v.id) === queryId || v.visitor_id === queryId || v.gate_pass_no === queryId);
      if (!visitor) return { rows: [], rowCount: 0 };
      const dept = store.departments.find(d => d.id === visitor.department_id);
      const emp = store.employees.find(e => e.id === visitor.host_employee_id);
      return {
        rows: [{
          ...visitor,
          department_name: dept?.name || '',
          host_employee_name: emp?.name || visitor.custom_host_name || 'Host',
          host_designation: emp?.designation || 'Host',
          host_email: emp?.email || '',
          host_phone: emp?.phone || ''
        }],
        rowCount: 1
      };
    }

    // Visitor by id
    if (upper.includes('WHERE V.ID = $1')) {
      const id = parseInt(params[0], 10);
      const v = store.visitors.find(x => x.id === id);
      if (!v) return { rows: [], rowCount: 0 };
      const dept = store.departments.find(d => d.id === v.department_id);
      const emp = store.employees.find(e => e.id === v.host_employee_id);
      return {
        rows: [{
          ...v,
          department_name: dept?.name || '',
          host_employee_name: emp?.name || v.custom_host_name || 'Host',
          host_designation: emp?.designation || 'Host',
          host_phone: emp?.phone || ''
        }],
        rowCount: 1
      };
    }

    // Total count query
    if (upper === 'SELECT COUNT(*) FROM VISITORS WHERE 1=1' || upper === 'SELECT COUNT(*) FROM VISITORS') {
      return { rows: [{ count: store.visitors.length }], rowCount: 1 };
    }

    // Metrics query for Dashboard
    if (upper.includes('VISITORS_TODAY') && upper.includes('CURRENTLY_INSIDE')) {
      const visitorsToday = store.visitors.filter(v => isToday(v.in_time)).length;
      const currentlyInside = store.visitors.filter(v => v.status === 'INSIDE').length;
      const checkedOutToday = store.visitors.filter(v => v.status === 'CHECKED_OUT' && isToday(v.out_time)).length;
      const totalAllTime = store.visitors.length;
      return {
        rows: [{
          visitors_today: visitorsToday,
          currently_inside: currentlyInside,
          checked_out_today: checkedOutToday,
          total_all_time: totalAllTime
        }],
        rowCount: 1
      };
    }

    // Hourly query for Dashboard
    if (upper.includes("TO_CHAR(IN_TIME, 'HH24:00') AS HOUR")) {
      const todayVisitors = store.visitors.filter(v => isToday(v.in_time));
      const hourMap = {};
      todayVisitors.forEach(v => {
        const hour = new Date(v.in_time).getHours();
        const hourStr = String(hour).padStart(2, '0') + ':00';
        hourMap[hourStr] = (hourMap[hourStr] || 0) + 1;
      });
      const rows = Object.entries(hourMap).map(([hour, count]) => ({ hour, count }));
      rows.sort((a, b) => a.hour.localeCompare(b.hour));
      return { rows, rowCount: rows.length };
    }

    // General list query (Visitor Records, Reports & Dashboard recent)
    let list = [...store.visitors];

    // Status filter
    if (upper.includes('V.STATUS =')) {
      const statusParam = params.find(p => p === 'INSIDE' || p === 'CHECKED_OUT');
      if (statusParam) list = list.filter(v => v.status === statusParam);
    }

    // Date filters (Reports)
    if (upper.includes('DATE_FILTER === TODAY') || upper.includes('V.IN_TIME >= CURRENT_DATE')) {
      list = list.filter(v => isToday(v.in_time));
    } else if (upper.includes('DATE_FILTER === YESTERDAY') || upper.includes('INTERVAL \'1 DAY\'')) {
      list = list.filter(v => isYesterday(v.in_time));
    }

    // Text search filter
    const searchParam = params.find(p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
    if (searchParam) {
      const q = searchParam.replace(/%/g, '').toLowerCase().trim();
      list = list.filter(v => 
        (v.name || '').toLowerCase().includes(q) ||
        (v.mobile || '').toLowerCase().includes(q) ||
        (v.company_name || '').toLowerCase().includes(q) ||
        (v.visitor_id || '').toLowerCase().includes(q) ||
        (v.gate_pass_no || '').toLowerCase().includes(q)
      );
    }

    // Department filter
    if (upper.includes('V.DEPARTMENT_ID =')) {
      const deptP = params.find(p => typeof p === 'number' || (typeof p === 'string' && /^\d+$/.test(p)));
      if (deptP) list = list.filter(v => v.department_id === parseInt(deptP, 10));
    }

    // Order by in_time DESC
    list.sort((a, b) => new Date(b.in_time).getTime() - new Date(a.in_time).getTime());

    // Enrich with dept & host name
    const enriched = list.map(v => {
      const dept = store.departments.find(d => d.id === v.department_id);
      const emp = store.employees.find(e => e.id === v.host_employee_id);
      return {
        ...v,
        department_name: dept?.name || '',
        department_code: dept?.code || '',
        host_employee_name: emp?.name || v.custom_host_name || 'Other Host',
        host_designation: emp?.designation || 'Host',
        registered_by_name: 'Security Gate'
      };
    });

    // Check for LIMIT
    if (upper.includes('LIMIT 8')) {
      const sliced = enriched.slice(0, 8);
      return { rows: sliced, rowCount: sliced.length };
    }

    return { rows: enriched, rowCount: enriched.length };
  }

  // Insert visitor
  if (upper.startsWith('INSERT INTO VISITORS')) {
    store.counters.visitors = (store.counters.visitors || 0) + 1;
    const now = new Date().toISOString();
    const newVisitor = {
      id: store.counters.visitors,
      visitor_id: params[0],
      gate_pass_no: params[1] || `GP-${Date.now()}`,
      name: params[2],
      mobile: params[3],
      email: params[4] || '',
      company_name: params[5] || 'Individual / Guest',
      address: params[6] || '',
      photo_url: params[7] || '',
      department_id: parseInt(params[8], 10),
      host_employee_id: params[9] ? parseInt(params[9], 10) : null,
      custom_host_name: params[10] || '',
      purpose: params[11],
      vehicle_number: params[12] || '',
      number_of_visitors: parseInt(params[13], 10) || 1,
      material_details: params[14] || '',
      remarks: params[15] || '',
      expected_visitor_id: params[16] || null,
      registered_by_user_id: params[17] || null,
      status: 'INSIDE',
      in_time: now,
      out_time: null,
      verification_mode: params[18] || 'manual',
      verification_status: params[19] || 'Manual Entry',
      masked_uid: params[20] || '',
      consent_recorded: !!params[21],
      guard_name: params[22] || 'Main Gate Security Officer',
      qr_code_data: params[23] || '',
      created_at: now,
      updated_at: now
    };
    store.visitors.push(newVisitor);
    saveStore();
    return { rows: [newVisitor], rowCount: 1 };
  }

  // Update visitor (Checkout)
  if (upper.startsWith('UPDATE VISITORS') && upper.includes("STATUS = 'CHECKED_OUT'")) {
    const id = parseInt(params[0], 10);
    const visitor = store.visitors.find(v => v.id === id);
    if (visitor) {
      const now = new Date().toISOString();
      visitor.status = 'CHECKED_OUT';
      visitor.out_time = now;
      visitor.updated_at = now;
      saveStore();
      return { rows: [visitor], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // Delete visitor
  if (upper.startsWith('DELETE FROM VISITORS')) {
    const queryId = String(params[0]);
    const idx = store.visitors.findIndex(v => String(v.id) === queryId || v.visitor_id === queryId || v.gate_pass_no === queryId);
    if (idx !== -1) {
      const deleted = store.visitors.splice(idx, 1)[0];
      saveStore();
      return { rows: [{ id: deleted.id, name: deleted.name }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 7. EXPECTED VISITORS
  if (upper.startsWith('SELECT') && upper.includes('FROM EXPECTED_VISITORS')) {
    // Count expected today
    if (upper.includes('SELECT COUNT(*)') && upper.includes('EXPECTED_TODAY')) {
      const today = new Date().toISOString().split('T')[0];
      const expToday = store.expected_visitors.filter(ev => ev.expected_date === today);
      const pending = expToday.filter(ev => ev.status === 'PENDING').length;
      return {
        rows: [{
          expected_today: expToday.length,
          expected_pending: pending
        }],
        rowCount: 1
      };
    }

    // Single by id
    if (upper.includes('WHERE ID = $1')) {
      const id = parseInt(params[0], 10);
      const ev = store.expected_visitors.find(x => x.id === id);
      return { rows: ev ? [ev] : [], rowCount: ev ? 1 : 0 };
    }

    // List query
    let list = [...store.expected_visitors];
    if (upper.includes('EV.STATUS =')) {
      const statusP = params.find(p => p === 'PENDING' || p === 'ARRIVED' || p === 'CANCELLED');
      if (statusP) list = list.filter(ev => ev.status === statusP);
    }

    const enriched = list.map(ev => {
      const dept = store.departments.find(d => d.id === ev.department_id);
      const emp = store.employees.find(e => e.id === ev.host_employee_id);
      return {
        ...ev,
        department_name: dept?.name || '',
        host_employee_name: emp?.name || 'Host',
        host_designation: emp?.designation || 'Staff',
        host_phone: emp?.phone || ''
      };
    });
    enriched.sort((a, b) => (b.expected_date || '').localeCompare(a.expected_date || ''));
    return { rows: enriched, rowCount: enriched.length };
  }

  // Insert expected visitor
  if (upper.startsWith('INSERT INTO EXPECTED_VISITORS')) {
    store.counters.expected_visitors = (store.counters.expected_visitors || 0) + 1;
    const now = new Date().toISOString();
    const newEV = {
      id: store.counters.expected_visitors,
      name: params[0],
      mobile: params[1],
      company_name: params[2] || 'N/A',
      department_id: parseInt(params[3], 10),
      host_employee_id: parseInt(params[4], 10),
      purpose: params[5],
      expected_date: params[6],
      expected_time: params[7],
      status: 'PENDING',
      created_at: now,
      updated_at: now
    };
    store.expected_visitors.push(newEV);
    saveStore();
    return { rows: [newEV], rowCount: 1 };
  }

  // Update expected visitor
  if (upper.startsWith('UPDATE EXPECTED_VISITORS')) {
    const id = parseInt(params[0], 10);
    const ev = store.expected_visitors.find(x => x.id === id);
    if (ev) {
      if (upper.includes("STATUS = 'ARRIVED'")) ev.status = 'ARRIVED';
      if (upper.includes("STATUS = 'CANCELLED'")) ev.status = 'CANCELLED';
      ev.updated_at = new Date().toISOString();
      saveStore();
      return { rows: [ev], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 8. NOTIFICATIONS
  if (upper.startsWith('SELECT') && upper.includes('FROM NOTIFICATIONS')) {
    let list = [...store.notifications];
    if (upper.includes('N.EMPLOYEE_ID = $1')) {
      const empId = parseInt(params[0], 10);
      list = list.filter(n => n.employee_id === empId);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const enriched = list.slice(0, 30).map(n => {
      const emp = store.employees.find(e => e.id === n.employee_id);
      return { ...n, employee_name: emp?.name || 'Staff' };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  if (upper.startsWith('INSERT INTO NOTIFICATIONS')) {
    store.counters.notifications = (store.counters.notifications || 0) + 1;
    const now = new Date().toISOString();
    const newNotif = {
      id: store.counters.notifications,
      employee_id: params[0] ? parseInt(params[0], 10) : null,
      title: params[1],
      message: params[2],
      type: params[3] || 'VISITOR_ARRIVAL',
      is_read: false,
      created_at: now
    };
    store.notifications.push(newNotif);
    saveStore();
    return { rows: [newNotif], rowCount: 1 };
  }

  if (upper.startsWith('UPDATE NOTIFICATIONS')) {
    if (upper.includes('WHERE ID = $1')) {
      const id = parseInt(params[0], 10);
      const n = store.notifications.find(x => x.id === id);
      if (n) n.is_read = true;
    } else {
      store.notifications.forEach(n => { n.is_read = true; });
    }
    saveStore();
    return { rows: [], rowCount: 0 };
  }

  // Fallback for unhandled queries: return empty
  console.log('[Embedded DB] Unhandled query passed through safely:', sql);
  return { rows: [], rowCount: 0 };
}
