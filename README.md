# Loan Management System

A comprehensive loan management system built with Node.js, TypeScript, Express, and PostgreSQL. Features a multi-phase loan workflow, role-based access control, automated notifications, and comprehensive reporting.

## 🚀 Features

### Core Functionality
- **Multi-Phase Loan Workflow**: Registration → Capturing → Approval → Disbursement
- **Role-Based Access Control**: Owner, Admin, Manager, Sales Executive, Loan Officer, Credit Risk Analyst, Call Center, Viewer
- **User Management**: Complete CRUD operations with email verification
- **Client Management**: Detailed client information with witnesses, business locations, and residences
- **Loan Processing**: Full lifecycle management from application to completion
- **Repayment Tracking**: Automated schedule generation and payment recording

### Advanced Features
- **Comprehensive Reporting**: Dashboard statistics, expected repayments, defaulter reports, loan statements
- **Email Notifications**: SMTP (Nodemailer) integration with automated reminders and status updates
- **System Logging**: Complete audit trail of all system activities
- **Data Export**: Export reports in various formats
- **Company Settings**: Configurable company information and branding

### Technical Features
- **RESTful API**: Well-structured endpoints with comprehensive documentation
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Joi-based request validation
- **Rate Limiting**: Protection against abuse
- **Error Handling**: Comprehensive error management
- **Swagger Documentation**: Interactive API documentation
- **Database Migrations**: Automated database setup and seeding

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: Nodemailer (SMTP)
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- SMTP account (e.g., Gmail, Outlook, or any SMTP provider)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
\`\`\`bash
git clone <repository-url>
cd loan-management-system
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Environment Configuration
Copy the example environment file and configure your settings:
\`\`\`bash
cp .env.example .env
\`\`\`

Update the `.env` file with your configuration:
\`\`\`env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=loan_app

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@loan.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# App
PORT=3000
NODE_ENV=development
\`\`\`

### 4. Database Setup
Run the automated setup script:
\`\`\`bash
npm run setup
\`\`\`

This will:
- Create the database schema
- Insert default roles and permissions
- Create sample users for testing

### 5. Start the Development Server
\`\`\`bash
npm run dev
\`\`\`

The API will be available at `https://loan-application-backend-1-qz2o.onrender.com`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `https://loan-application-backend-1-qz2o.onrender.com/api-docs`
- **OpenAPI JSON**: `https://loan-application-backend-1-qz2o.onrender.com/api-docs.json`
- **Health Check**: `https://loan-application-backend-1-qz2o.onrender.com/health`

## 👥 Default User Accounts

The system comes with pre-configured user accounts for testing:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Owner | owner@loan.com | Owner123! | Full system access |
| Admin | admin@loan.com | Admin123! | All operations except log deletion |
| Call Center | callcenter@loan.com | CallCenter123! | Loan registration |
| Sales Executive | sales@loan.com | Sales123! | Loan capturing |
| Credit Risk Analyst | analyst@loan.com | Analyst123! | Loan approval |
| Manager | manager@loan.com | Manager123! | Loan disbursement |

## 🔄 Loan Workflow

### Phase 1: Registration
- **Role**: Call Center
- **Actions**: Create client profile, capture basic loan request
- **Data**: Name, contact, location, requested amount

### Phase 2: Capturing
- **Role**: Sales Executive / Loan Officer
- **Actions**: Collect detailed client information
- **Data**: Personal details, witnesses, business locations, residences

### Phase 3: Approval
- **Role**: Credit Risk Analyst
- **Actions**: Review and approve/modify loan terms
- **Data**: Approved amount, duration, payment schedule

### Phase 4: Disbursement
- **Role**: Manager
- **Actions**: Release funds to client
- **Data**: Disbursement confirmation, payment schedule activation

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email` - Verify email address
- `GET /api/auth/profile` - Get user profile

### User Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/roles` - Get all roles

### Loan Management
- `GET /api/loans` - List loans
- `POST /api/loans/register` - Register new loan (Phase 1)
- `PUT /api/loans/:id/capture` - Capture loan details (Phase 2)
- `PUT /api/loans/:id/approve` - Approve loan (Phase 3)
- `PUT /api/loans/:id/disburse` - Disburse loan (Phase 4)
- `GET /api/loans/:id` - Get loan details
- `GET /api/loans/:id/repayments` - Get repayment schedule
- `POST /api/loans/:id/repayments` - Record payment

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/expected-repayments` - Expected repayments
- `GET /api/reports/loan-defaulters` - Defaulter report
- `GET /api/reports/repayments-received` - Payment history
- `GET /api/reports/loan-statement/:id` - Individual loan statement
- `GET /api/reports/export/:type` - Export reports

### Settings
- `GET /api/settings/company` - Get company settings
- `PUT /api/settings/company` - Update company settings

### Notifications
- `POST /api/notifications/repayment-reminders` - Send payment reminders
- `POST /api/notifications/overdue-notifications` - Send overdue notices
- `GET /api/notifications/test-email` - Test email configuration

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against brute force attacks
- **Password Hashing**: bcrypt with salt rounds
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: Security headers and protections

## 📧 Email Notifications

The system supports automated email notifications for:
- User registration and email verification
- Password reset requests
- Loan approval notifications
- Loan disbursement confirmations
- Payment reminders
- Overdue payment notices
- Welcome emails for new users

## 🗄️ Database Schema

The system uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `roles` - User roles and permissions
- `clients` - Loan applicant information
- `loans` - Loan records and workflow status
- `loan_repayments` - Payment schedules and history
- `system_logs` - Audit trail and activity logs
- `company_settings` - System configuration

## 🚀 Deployment

### Production Build
\`\`\`bash
npm run build
npm start
\`\`\`

### Environment Variables
Ensure all production environment variables are properly configured:
- Database connection details
- JWT secret (use a strong, unique secret)
- SMTP credentials
- Frontend URL for email links

### Database Migration
\`\`\`bash
npm run migrate
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the system logs for troubleshooting

## 🔄 Version History

- **v1.0.0** - Initial release with complete loan management workflow
  - Multi-phase loan processing
  - Role-based access control
  - Comprehensive reporting
  - Email notifications
  - API documentation
