import EmailService from "./email.service"
import pool from "../database/connection"

interface NotificationJob {
  type: "repayment_reminder" | "overdue_notification" | "loan_approval" | "loan_disbursement"
  data: any
  scheduledFor: Date
}

class NotificationService {
  // Send repayment reminders for upcoming due dates
  async sendRepaymentReminders(): Promise<void> {
    try {
      // Get repayments due in the next 3 days
      const query = `
        SELECT lr.id, lr.loan_id, lr.amount, lr.due_date,
               c.fullname, c.email, c.contact,
               EXTRACT(DAY FROM lr.due_date - CURRENT_DATE)::integer as days_until_due
        FROM loan_repayments lr
        JOIN loans l ON lr.loan_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE lr.status = 'pending' 
          AND lr.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
          AND c.email IS NOT NULL
      `

      const result = await pool.query(query)

      for (const repayment of result.rows) {
        if (repayment.email) {
          await EmailService.sendRepaymentReminderEmail(repayment.email, repayment.fullname, {
            loanId: repayment.loan_id,
            amount: Number.parseFloat(repayment.amount),
            dueDate: repayment.due_date,
            daysUntilDue: repayment.days_until_due,
          })
        }
      }

      console.log(`Sent ${result.rows.length} repayment reminder emails`)
    } catch (error) {
      console.error("Failed to send repayment reminders:", error)
    }
  }

  // Send overdue notifications
  async sendOverdueNotifications(): Promise<void> {
    try {
      const query = `
        SELECT l.id as loan_id, c.fullname, c.email, c.contact,
               SUM(lr.amount) as overdue_amount,
               MAX(EXTRACT(DAY FROM CURRENT_DATE - lr.due_date)::integer) as days_overdue,
               (SELECT SUM(amount) FROM loan_repayments WHERE loan_id = l.id AND status = 'pending') as total_outstanding
        FROM loans l
        JOIN clients c ON l.client_id = c.id
        JOIN loan_repayments lr ON l.id = lr.loan_id
        WHERE lr.status = 'pending' 
          AND lr.due_date < CURRENT_DATE
          AND c.email IS NOT NULL
        GROUP BY l.id, c.fullname, c.email, c.contact
        HAVING MAX(EXTRACT(DAY FROM CURRENT_DATE - lr.due_date)::integer) > 0
      `

      const result = await pool.query(query)

      for (const overdue of result.rows) {
        if (overdue.email) {
          await EmailService.sendOverdueNotificationEmail(overdue.email, overdue.fullname, {
            loanId: overdue.loan_id,
            overdueAmount: Number.parseFloat(overdue.overdue_amount),
            daysOverdue: overdue.days_overdue,
            totalOutstanding: Number.parseFloat(overdue.total_outstanding),
          })
        }
      }

      console.log(`Sent ${result.rows.length} overdue notification emails`)
    } catch (error) {
      console.error("Failed to send overdue notifications:", error)
    }
  }

  // Send loan approval notifications
  async sendLoanApprovalNotification(loanId: number): Promise<void> {
    try {
      const query = `
        SELECT l.id, l.approved_amount, l.loan_duration, l.payment_mode,
               c.fullname, c.email
        FROM loans l
        JOIN clients c ON l.client_id = c.id
        WHERE l.id = $1 AND c.email IS NOT NULL
      `

      const result = await pool.query(query, [loanId])

      if (result.rows.length > 0) {
        const loan = result.rows[0]
        await EmailService.sendLoanApprovalNotification(loan.email, loan.fullname, {
          loanId: loan.id,
          approvedAmount: Number.parseFloat(loan.approved_amount),
          loanDuration: loan.loan_duration,
          paymentMode: loan.payment_mode,
        })
      }
    } catch (error) {
      console.error("Failed to send loan approval notification:", error)
    }
  }

  // Send loan disbursement notifications
  async sendLoanDisbursementNotification(loanId: number): Promise<void> {
    try {
      const query = `
        SELECT l.id, l.approved_amount, l.disbursement_date, l.payment_schedule_start,
               c.fullname, c.email
        FROM loans l
        JOIN clients c ON l.client_id = c.id
        WHERE l.id = $1 AND c.email IS NOT NULL
      `

      const result = await pool.query(query, [loanId])

      if (result.rows.length > 0) {
        const loan = result.rows[0]
        await EmailService.sendLoanDisbursementNotification(loan.email, loan.fullname, {
          loanId: loan.id,
          disbursedAmount: Number.parseFloat(loan.approved_amount),
          disbursementDate: loan.disbursement_date,
          firstPaymentDate: loan.payment_schedule_start,
        })
      }
    } catch (error) {
      console.error("Failed to send loan disbursement notification:", error)
    }
  }

  // Send welcome email to new users
  async sendWelcomeNotification(userId: number): Promise<void> {
    try {
      const query = `
        SELECT u.fullname, u.email, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `

      const result = await pool.query(query, [userId])

      if (result.rows.length > 0) {
        const user = result.rows[0]
        await EmailService.sendWelcomeEmail(user.email, user.fullname, user.role_name)
      }
    } catch (error) {
      console.error("Failed to send welcome notification:", error)
    }
  }

  // Schedule daily notification jobs
  async scheduleDailyNotifications(): Promise<void> {
    console.log("Running daily notification jobs...")

    await Promise.allSettled([this.sendRepaymentReminders(), this.sendOverdueNotifications()])

    console.log("Daily notification jobs completed")
  }

  // Test all notification types
  async testNotifications(testEmail: string): Promise<void> {
    const testData = {
      fullname: "Test User",
      loanId: 12345,
      amount: 1000,
      dueDate: new Date(),
      daysUntilDue: 2,
    }

    await EmailService.sendRepaymentReminderEmail(testEmail, testData.fullname, testData)
    console.log("Test notification sent successfully")
  }
}

export default new NotificationService()
