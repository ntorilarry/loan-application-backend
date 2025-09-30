-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    entity VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity, action)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Users table (created after roles)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    company_address TEXT,
    password_hash VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    tenant_schema VARCHAR(64),
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    location TEXT NOT NULL,
    landmark TEXT,
    business VARCHAR(255),
    dob DATE,
    marital_status VARCHAR(20),
    profile_image VARCHAR(500),
    occupation VARCHAR(255),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_front_image VARCHAR(500),
    id_back_image VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client witnesses/guarantees
CREATE TABLE IF NOT EXISTS client_witnesses (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    fullname VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    marital_status VARCHAR(20),
    email VARCHAR(255),
    occupation VARCHAR(255),
    residence_address TEXT,
    residence_gps VARCHAR(255),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_front_image VARCHAR(500),
    id_back_image VARCHAR(500),
    profile_pic VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business locations
CREATE TABLE IF NOT EXISTS business_locations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    gps_address VARCHAR(255),
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Residences
CREATE TABLE IF NOT EXISTS residences (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    gps_address VARCHAR(255),
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    requested_amount DECIMAL(15,2) NOT NULL,
    approved_amount DECIMAL(15,2),
    loan_duration VARCHAR(50), -- in months or weeks
    payment_mode VARCHAR(20), -- 'weekly' or 'monthly'
    payment_schedule_start DATE,
    payment_start_date DATE,
    payment_end_date DATE,
    processing_fee DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'registration', -- registration, capturing, approval, disbursement, active, completed, defaulted
    phase INTEGER DEFAULT 1, -- 1=registration, 2=capturing, 3=approval, 4=disbursement
    registered_by INTEGER REFERENCES users(id),
    captured_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    disbursed_by INTEGER REFERENCES users(id),
    disbursement_method VARCHAR(50),
    disbursement_notes TEXT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    capturing_date TIMESTAMP,
    approval_date TIMESTAMP,
    disbursement_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, partial
    received_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan payments (for tracking individual payments)
CREATE TABLE IF NOT EXISTS loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    received_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT,
    company_email VARCHAR(255),
    company_contact VARCHAR(20),
    company_logo VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
('Owner', 'The person who owns the app. Can do anything in the system'),
('Admin', 'Can do anything as owner but cannot delete logs'),
('Viewer', 'Can view everything in the system but cannot add or modify'),
('Manager', 'Disbursement Only'),
('Call Center', 'Registration Process'),
('Sales Executive', 'Registration Capturing'),
('Loan Officer', 'Registration Capturing'),
('Credit Risk Analyst', 'Approve Loans')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (entity, action, description) VALUES 
('Users', 'CanCreate', 'Can create users'),
('Users', 'CanDelete', 'Can delete users'),
('Users', 'CanUpdate', 'Can update users'),
('Users', 'CanView', 'Can view users'),
('Users', 'CanList', 'Can list users'),
('Clients', 'CanCreate', 'Can create clients'),
('Clients', 'CanDelete', 'Can delete clients'),
('Clients', 'CanUpdate', 'Can update clients'),
('Clients', 'CanView', 'Can view clients'),
('Clients', 'CanList', 'Can list clients'),
('Loans', 'CanCreate', 'Can create loans'),
('Loans', 'CanDelete', 'Can delete loans'),
('Loans', 'CanUpdate', 'Can update loans'),
('Loans', 'CanView', 'Can view loans'),
('Loans', 'CanList', 'Can list loans'),
('Loans', 'CanApprove', 'Can approve loans'),
('Loans', 'CanDisburse', 'Can disburse loans'),
('Reports', 'CanView', 'Can view reports'),
('Reports', 'CanExport', 'Can export reports'),
('Logs', 'CanView', 'Can view logs'),
('Logs', 'CanDelete', 'Can delete logs'),
('Settings', 'CanUpdate', 'Can update company settings')
ON CONFLICT (entity, action) DO NOTHING;
