export const ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Viewer",
  MANAGER: "Manager",
  CALL_CENTER: "Call Center",
  SALES_EXECUTIVE: "Sales Executive",
  LOAN_OFFICER: "Loan Officer",
  CREDIT_RISK_ANALYST: "Credit Risk Analyst",
} as const

export const PERMISSIONS = {
  USERS_CREATE: "Users.CanCreate",
  USERS_DELETE: "Users.CanDelete",
  USERS_UPDATE: "Users.CanUpdate",
  USERS_VIEW: "Users.CanView",
  USERS_LIST: "Users.CanList",
  CLIENTS_CREATE: "Clients.CanCreate",
  CLIENTS_DELETE: "Clients.CanDelete",
  CLIENTS_UPDATE: "Clients.CanUpdate",
  CLIENTS_VIEW: "Clients.CanView",
  CLIENTS_LIST: "Clients.CanList",
  LOANS_CREATE: "Loans.CanCreate",
  LOANS_DELETE: "Loans.CanDelete",
  LOANS_UPDATE: "Loans.CanUpdate",
  LOANS_VIEW: "Loans.CanView",
  LOANS_LIST: "Loans.CanList",
  LOANS_APPROVE: "Loans.CanApprove",
  LOANS_DISBURSE: "Loans.CanDisburse",
  REPORTS_VIEW: "Reports.CanView",
  REPORTS_EXPORT: "Reports.CanExport",
  LOGS_VIEW: "Logs.CanView",
  LOGS_DELETE: "Logs.CanDelete",
  SETTINGS_UPDATE: "Settings.CanUpdate",
} as const

export const LOAN_STATUS = {
  REGISTERED: "registered",
  CAPTURED: "captured",
  APPROVED: "approved",
  DISBURSED: "disbursed",
  ACTIVE: "active",
  COMPLETED: "completed",
  DEFAULTED: "defaulted",
} as const

export const PAYMENT_MODE = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const
