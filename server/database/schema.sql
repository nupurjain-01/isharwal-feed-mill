-- ============================================================
-- UMAX Packaging – Gate Entry Management System Database Schema
-- Database: PostgreSQL
-- ============================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    designation VARCHAR(100) DEFAULT 'Staff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table (System Logins: Admin, Receptionist, Employee)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'receptionist' CHECK (role IN ('admin', 'receptionist', 'employee')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Expected Visitors Table (Pre-registration)
CREATE TABLE IF NOT EXISTS expected_visitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    host_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    purpose VARCHAR(200) NOT NULL,
    expected_date DATE NOT NULL,
    expected_time VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ARRIVED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Visitors Table (Actual Gate Passes)
CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    visitor_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    photo_url TEXT DEFAULT '',
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    host_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    purpose VARCHAR(200) NOT NULL,
    vehicle_number VARCHAR(50) DEFAULT '',
    number_of_visitors INTEGER DEFAULT 1 CHECK (number_of_visitors >= 1),
    material_details TEXT DEFAULT '',
    in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    out_time TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'INSIDE' CHECK (status IN ('INSIDE', 'CHECKED_OUT')),
    remarks TEXT DEFAULT '',
    expected_visitor_id INTEGER REFERENCES expected_visitors(id) ON DELETE SET NULL,
    registered_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications Table (Real-time alerts for employees)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'VISITOR_ARRIVAL',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_visitors_in_time ON visitors(in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_dept ON visitors(department_id);
CREATE INDEX IF NOT EXISTS idx_visitors_emp ON visitors(host_employee_id);
CREATE INDEX IF NOT EXISTS idx_visitors_mobile ON visitors(mobile);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_notifications_emp ON notifications(employee_id, is_read);
