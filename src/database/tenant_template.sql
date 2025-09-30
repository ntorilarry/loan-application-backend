-- Create all tenant-scoped tables inside the provided schema name placeholder: __SCHEMA__

-- Roles table
CREATE TABLE IF NOT EXISTS "__SCHEMA__".roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS "__SCHEMA__".permissions (
  id SERIAL PRIMARY KEY,
  entity VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity, action)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS "__SCHEMA__".role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES "__SCHEMA__".roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES "__SCHEMA__".permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS "__SCHEMA__".clients (
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
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client witnesses/guarantees
CREATE TABLE IF NOT EXISTS "__SCHEMA__".client_witnesses (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "__SCHEMA__".clients(id) ON DELETE CASCADE,
  fullname VARCHAR(255) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  marital_status VARCHAR(20),
  email VARCHAR(255),
  occupation VARCHAR(255),
  residence_address TEXT,
  residence_gps VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business locations
CREATE TABLE IF NOT EXISTS "__SCHEMA__".business_locations (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "__SCHEMA__".clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  gps_address VARCHAR(255),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Residences
CREATE TABLE IF NOT EXISTS "__SCHEMA__".residences (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "__SCHEMA__".clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  gps_address VARCHAR(255),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans table
CREATE TABLE IF NOT EXISTS "__SCHEMA__".loans (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "__SCHEMA__".clients(id),
  requested_amount DECIMAL(15,2) NOT NULL,
  approved_amount DECIMAL(15,2),
  loan_duration INTEGER,
  payment_mode VARCHAR(20),
  payment_schedule_start DATE,
  status VARCHAR(50) DEFAULT 'registration',
  phase INTEGER DEFAULT 1,
  registered_by INTEGER,
  captured_by INTEGER,
  approved_by INTEGER,
  disbursed_by INTEGER,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  capturing_date TIMESTAMP,
  approval_date TIMESTAMP,
  disbursement_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan repayments
CREATE TABLE IF NOT EXISTS "__SCHEMA__".loan_repayments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES "__SCHEMA__".loans(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  received_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System logs (tenant-scoped)
CREATE TABLE IF NOT EXISTS "__SCHEMA__".system_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Company settings (tenant-scoped)
CREATE TABLE IF NOT EXISTS "__SCHEMA__".company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  company_address TEXT,
  company_email VARCHAR(255),
  company_contact VARCHAR(20),
  company_logo VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (tenant-scoped linkage to public.users)
CREATE TABLE IF NOT EXISTS "__SCHEMA__".users (
  id SERIAL PRIMARY KEY,
  public_user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES "__SCHEMA__".roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

