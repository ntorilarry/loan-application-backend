import pool from "../database/connection"
import type { PaginatedResponse } from "../common/types"

interface ExpectedRepayment {
  loan_id: number
  client_name: string
  client_contact: string
  amount: number
  due_date: Date
  days_overdue?: number
  status: string
}

interface RepaymentReceived {
  loan_id: number
  client_name: string
  client_contact: string
  amount: number
  payment_date: Date
  received_by_name: string
}

interface LoanDefaulter {
  loan_id: number
  client_name: string
  client_contact: string
  client_email?: string
  overdue_amount: number
  days_overdue: number
  last_payment_date?: Date
}

interface DashboardStats {
  total_loans: number
  active_loans: number
  completed_loans: number
  defaulted_loans: number
  total_disbursed: number
  total_collected: number
  pending_approvals: number
  pending_disbursements: number
  loans_by_phase: {
    registration: number
    capturing: number
    approval: number
    disbursement: number
  }
  monthly_disbursements: Array<{
    month: string
    amount: number
    count: number
  }>
  recent_activities: Array<{
    id: number
    action: string
    entity_type: string
    entity_id: number
    user_name?: string
    created_at: Date
  }>
}

interface LoanStatement {
  loan: {
    id: number
    client_name: string
    client_contact: string
    client_email?: string
    approved_amount: number
    loan_duration: number
    payment_mode: string
    disbursement_date: Date
    status: string
  }
  repayments: Array<{
    id: number
    amount: number
    due_date: Date
    payment_date?: Date
    status: string
    days_overdue?: number
  }>
  summary: {
    total_amount: number
    paid_amount: number
    outstanding_amount: number
    overdue_amount: number
    next_payment_date?: Date
    next_payment_amount?: number
  }
}

class ReportService {
  async getExpectedRepayments(date: Date, page = 1, limit = 10): Promise<PaginatedResponse<ExpectedRepayment>> {
    const offset = (page - 1) * limit

    const query = `
      SELECT lr.loan_id, c.fullname as client_name, c.contact as client_contact,
             lr.amount, lr.due_date, lr.status,
             CASE 
               WHEN lr.due_date < $1 AND lr.status = 'pending' 
               THEN EXTRACT(DAY FROM $1 - lr.due_date)::integer 
               ELSE 0 
             END as days_overdue
      FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      WHERE DATE(lr.due_date) = DATE($1)
         OR (lr.due_date < $1 AND lr.status = 'pending')
      ORDER BY lr.due_date ASC
      LIMIT $2 OFFSET $3
    `

    const countQuery = `
      SELECT COUNT(*) FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      WHERE DATE(lr.due_date) = DATE($1)
         OR (lr.due_date < $1 AND lr.status = 'pending')
    `

    const [result, countResult] = await Promise.all([
      pool.query(query, [date, limit, offset]),
      pool.query(countQuery, [date]),
    ])

    const total = Number.parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      message: "Expected repayments retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  async getLoanDefaulters(page = 1, limit = 10): Promise<PaginatedResponse<LoanDefaulter>> {
    const offset = (page - 1) * limit

    const query = `
      SELECT DISTINCT l.id as loan_id, c.fullname as client_name, c.contact as client_contact, 
             c.email as client_email,
             SUM(lr.amount) as overdue_amount,
             MAX(EXTRACT(DAY FROM CURRENT_DATE - lr.due_date)::integer) as days_overdue,
             MAX(paid_lr.payment_date) as last_payment_date
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN loan_repayments lr ON l.id = lr.loan_id
      LEFT JOIN loan_repayments paid_lr ON l.id = paid_lr.loan_id AND paid_lr.status = 'paid'
      WHERE lr.status = 'pending' AND lr.due_date < CURRENT_DATE
      GROUP BY l.id, c.fullname, c.contact, c.email
      HAVING MAX(EXTRACT(DAY FROM CURRENT_DATE - lr.due_date)::integer) > 0
      ORDER BY days_overdue DESC
      LIMIT $1 OFFSET $2
    `

    const countQuery = `
      SELECT COUNT(DISTINCT l.id) FROM loans l
      JOIN loan_repayments lr ON l.id = lr.loan_id
      WHERE lr.status = 'pending' AND lr.due_date < CURRENT_DATE
    `

    const [result, countResult] = await Promise.all([pool.query(query, [limit, offset]), pool.query(countQuery)])

    const total = Number.parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      message: "Loan defaulters retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  async getRepaymentsReceived(
    startDate: Date,
    endDate: Date,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<RepaymentReceived>> {
    const offset = (page - 1) * limit

    const query = `
      SELECT lr.loan_id, c.fullname as client_name, c.contact as client_contact,
             lr.amount, lr.payment_date, u.fullname as received_by_name
      FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      LEFT JOIN users u ON lr.received_by = u.id
      WHERE lr.status = 'paid' 
        AND lr.payment_date >= $1 
        AND lr.payment_date <= $2
      ORDER BY lr.payment_date DESC
      LIMIT $3 OFFSET $4
    `

    const countQuery = `
      SELECT COUNT(*) FROM loan_repayments lr
      WHERE lr.status = 'paid' 
        AND lr.payment_date >= $1 
        AND lr.payment_date <= $2
    `

    const [result, countResult] = await Promise.all([
      pool.query(query, [startDate, endDate, limit, offset]),
      pool.query(countQuery, [startDate, endDate]),
    ])

    const total = Number.parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      message: "Repayments received retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  async generateLoanStatement(loanId: number): Promise<LoanStatement> {
    // Get loan details
    const loanQuery = `
      SELECT l.id, c.fullname as client_name, c.contact as client_contact, 
             c.email as client_email, l.approved_amount, l.loan_duration, 
             l.payment_mode, l.disbursement_date, l.status
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      WHERE l.id = $1
    `

    const loanResult = await pool.query(loanQuery, [loanId])

    if (loanResult.rows.length === 0) {
      throw new Error("Loan not found")
    }

    const loan = loanResult.rows[0]

    // Get repayments
    const repaymentsQuery = `
      SELECT id, amount, due_date, payment_date, status,
             CASE 
               WHEN status = 'pending' AND due_date < CURRENT_DATE 
               THEN EXTRACT(DAY FROM CURRENT_DATE - due_date)::integer 
               ELSE 0 
             END as days_overdue
      FROM loan_repayments
      WHERE loan_id = $1
      ORDER BY due_date ASC
    `

    const repaymentsResult = await pool.query(repaymentsQuery, [loanId])
    const repayments = repaymentsResult.rows

    // Calculate summary
    const totalAmount = loan.approved_amount
    const paidAmount = repayments
      .filter((r: any) => r.status === "paid")
      .reduce((sum: number, r: any) => sum + Number.parseFloat(r.amount), 0)
    const outstandingAmount = totalAmount - paidAmount
    const overdueAmount = repayments
      .filter((r: any) => r.status === "pending" && r.days_overdue > 0)
      .reduce((sum: number, r: any) => sum + Number.parseFloat(r.amount), 0)

    const nextPayment = repayments.find((r: any) => r.status === "pending")

    return {
      loan,
      repayments,
      summary: {
        total_amount: totalAmount,
        paid_amount: paidAmount,
        outstanding_amount: outstandingAmount,
        overdue_amount: overdueAmount,
        next_payment_date: nextPayment?.due_date,
        next_payment_amount: nextPayment ? Number.parseFloat(nextPayment.amount) : undefined,
      },
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    // Get basic loan counts
    const loanStatsQuery = `
      SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_loans,
        COUNT(CASE WHEN phase = 1 THEN 1 END) as registration_phase,
        COUNT(CASE WHEN phase = 2 THEN 1 END) as capturing_phase,
        COUNT(CASE WHEN phase = 3 THEN 1 END) as approval_phase,
        COUNT(CASE WHEN phase = 4 AND status != 'active' THEN 1 END) as disbursement_phase,
        COALESCE(SUM(CASE WHEN status IN ('active', 'completed') THEN approved_amount END), 0) as total_disbursed
      FROM loans
    `

    const loanStatsResult = await pool.query(loanStatsQuery)
    const loanStats = loanStatsResult.rows[0]

    // Get total collected amount
    const collectedQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_collected
      FROM loan_repayments
      WHERE status = 'paid'
    `

    const collectedResult = await pool.query(collectedQuery)
    const totalCollected = Number.parseFloat(collectedResult.rows[0].total_collected)

    // Get pending approvals and disbursements
    const pendingQuery = `
      SELECT 
        COUNT(CASE WHEN phase = 2 THEN 1 END) as pending_approvals,
        COUNT(CASE WHEN phase = 3 THEN 1 END) as pending_disbursements
      FROM loans
    `

    const pendingResult = await pool.query(pendingQuery)
    const pending = pendingResult.rows[0]

    // Get monthly disbursements for the last 12 months
    const monthlyQuery = `
      SELECT 
        TO_CHAR(disbursement_date, 'YYYY-MM') as month,
        COALESCE(SUM(approved_amount), 0) as amount,
        COUNT(*) as count
      FROM loans
      WHERE disbursement_date >= CURRENT_DATE - INTERVAL '12 months'
        AND disbursement_date IS NOT NULL
      GROUP BY TO_CHAR(disbursement_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `

    const monthlyResult = await pool.query(monthlyQuery)

    // Get recent activities
    const activitiesQuery = `
      SELECT sl.id, sl.action, sl.entity_type, sl.entity_id, 
             u.fullname as user_name, sl.created_at
      FROM system_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE sl.entity_type IN ('Loan', 'User', 'Client')
      ORDER BY sl.created_at DESC
      LIMIT 10
    `

    const activitiesResult = await pool.query(activitiesQuery)

    return {
      total_loans: Number.parseInt(loanStats.total_loans),
      active_loans: Number.parseInt(loanStats.active_loans),
      completed_loans: Number.parseInt(loanStats.completed_loans),
      defaulted_loans: Number.parseInt(loanStats.defaulted_loans),
      total_disbursed: Number.parseFloat(loanStats.total_disbursed),
      total_collected: totalCollected,
      pending_approvals: Number.parseInt(pending.pending_approvals),
      pending_disbursements: Number.parseInt(pending.pending_disbursements),
      loans_by_phase: {
        registration: Number.parseInt(loanStats.registration_phase),
        capturing: Number.parseInt(loanStats.capturing_phase),
        approval: Number.parseInt(loanStats.approval_phase),
        disbursement: Number.parseInt(loanStats.disbursement_phase),
      },
      monthly_disbursements: monthlyResult.rows.map((row) => ({
        month: row.month,
        amount: Number.parseFloat(row.amount),
        count: Number.parseInt(row.count),
      })),
      recent_activities: activitiesResult.rows,
    }
  }

  async exportReport(reportType: string, filters: any): Promise<any[]> {
    switch (reportType) {
      case "expected_repayments":
        const expectedResult = await this.getExpectedRepayments(filters.date, 1, 10000)
        return expectedResult.data || []

      case "loan_defaulters":
        const defaultersResult = await this.getLoanDefaulters(1, 10000)
        return defaultersResult.data || []

      case "repayments_received":
        const receivedResult = await this.getRepaymentsReceived(filters.start_date, filters.end_date, 1, 10000)
        return receivedResult.data || []

      case "all_loans":
        const loansQuery = `
          SELECT l.id, c.fullname as client_name, c.contact as client_contact,
                 l.requested_amount, l.approved_amount, l.status, l.phase,
                 l.registration_date, l.disbursement_date,
                 u1.fullname as registered_by, u2.fullname as approved_by
          FROM loans l
          JOIN clients c ON l.client_id = c.id
          LEFT JOIN users u1 ON l.registered_by = u1.id
          LEFT JOIN users u2 ON l.approved_by = u2.id
          ORDER BY l.created_at DESC
        `
        const loansResult = await pool.query(loansQuery)
        return loansResult.rows

      default:
        throw new Error("Invalid report type")
    }
  }
}

export default new ReportService()
