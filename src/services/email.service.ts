import nodemailer from "nodemailer"

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

class EmailService {
  private transporter: nodemailer.Transporter
  private fromEmail: string
  private frontendUrl: string

  constructor() {
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com"
    const smtpPort = Number.parseInt(process.env.SMTP_PORT || "465")
    const smtpSecure = (process.env.SMTP_SECURE || "true").toLowerCase() === "true"
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const isProduction = (process.env.NODE_ENV || "development") === "production"

    if (!smtpUser || !smtpPass) {
      if (isProduction) {
        throw new Error("SMTP_USER and SMTP_PASS environment variables are required for email sending")
      }
      // Dev fallback: JSON transport (logs emails to console, no network)
      this.transporter = nodemailer.createTransport({ jsonTransport: true })
    } else {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
      })
    }

    this.fromEmail = process.env.SMTP_FROM || "noreply@loandrift.com"
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
  }

  async sendVerificationEmail(email: string, fullname: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`

    const template = this.getEmailTemplate("verification", {
      fullname,
      verificationUrl,
    })

    await this.sendEmail(email, template)
  }

  async sendPasswordResetEmail(email: string, fullname: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`

    const template = this.getEmailTemplate("password-reset", {
      fullname,
      resetUrl,
    })

    await this.sendEmail(email, template)
  }

  async sendLoanApprovalNotification(
    email: string,
    fullname: string,
    loanDetails: {
      loanId: number
      approvedAmount: number
      loanDuration: number
      paymentMode: string
    },
  ): Promise<void> {
    const template = this.getEmailTemplate("loan-approval", {
      fullname,
      ...loanDetails,
    })

    await this.sendEmail(email, template)
  }

  async sendLoanDisbursementNotification(
    email: string,
    fullname: string,
    loanDetails: {
      loanId: number
      disbursedAmount: number
      disbursementDate: Date
      firstPaymentDate: Date
    },
  ): Promise<void> {
    const template = this.getEmailTemplate("loan-disbursement", {
      fullname,
      ...loanDetails,
      disbursementDate: loanDetails.disbursementDate.toLocaleDateString(),
      firstPaymentDate: loanDetails.firstPaymentDate.toLocaleDateString(),
    })

    await this.sendEmail(email, template)
  }

  async sendRepaymentReminderEmail(
    email: string,
    fullname: string,
    repaymentDetails: {
      loanId: number
      amount: number
      dueDate: Date
      daysUntilDue: number
    },
  ): Promise<void> {
    const template = this.getEmailTemplate("repayment-reminder", {
      fullname,
      ...repaymentDetails,
      dueDate: repaymentDetails.dueDate.toLocaleDateString(),
    })

    await this.sendEmail(email, template)
  }

  async sendOverdueNotificationEmail(
    email: string,
    fullname: string,
    overdueDetails: {
      loanId: number
      overdueAmount: number
      daysOverdue: number
      totalOutstanding: number
    },
  ): Promise<void> {
    const template = this.getEmailTemplate("overdue-notification", {
      fullname,
      ...overdueDetails,
    })

    await this.sendEmail(email, template)
  }

  async sendWelcomeEmail(email: string, fullname: string, userRole: string): Promise<void> {
    const template = this.getEmailTemplate("welcome", {
      fullname,
      userRole,
      loginUrl: `${this.frontendUrl}/login`,
    })

    await this.sendEmail(email, template)
  }

  async sendLoanStatusUpdateEmail(
    email: string,
    fullname: string,
    statusUpdate: {
      loanId: number
      oldStatus: string
      newStatus: string
      message: string
    },
  ): Promise<void> {
    const template = this.getEmailTemplate("loan-status-update", {
      fullname,
      ...statusUpdate,
    })

    await this.sendEmail(email, template)
  }

  private async sendEmail(email: string, template: EmailTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      })
    } catch (error) {
      console.error("Failed to send email:", error)
      if ((process.env.NODE_ENV || "development") === "production") {
      throw new Error("Failed to send email")
      }
    }
  }

  private getEmailTemplate(templateType: string, data: any): EmailTemplate {
    const baseStyle = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .alert { background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .success { background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; }
      </style>
    `

    switch (templateType) {
      case "verification":
        return {
          subject: "Verify Your Email Address",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Welcome to Loan Management System</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.fullname}!</h2>
                <p>Thank you for registering with our Loan Management System. Please verify your email address to complete your registration.</p>
                <p><a href="${data.verificationUrl}" class="button">Verify Email Address</a></p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>${data.verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Welcome to Loan Management System, ${data.fullname}! Please verify your email by visiting: ${data.verificationUrl}`,
        }

      case "password-reset":
        return {
          subject: "Reset Your Password",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.fullname},</h2>
                <p>You requested to reset your password. Click the button below to set a new password:</p>
                <p><a href="${data.resetUrl}" class="button" style="background-color: #dc3545;">Reset Password</a></p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>${data.resetUrl}</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Hello ${data.fullname}, you requested to reset your password. Visit: ${data.resetUrl}`,
        }

      case "loan-approval":
        return {
          subject: "Loan Application Approved",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Loan Approved!</h1>
              </div>
              <div class="content">
                <div class="success">
                  <h2>Congratulations ${data.fullname}!</h2>
                  <p>Your loan application has been approved.</p>
                </div>
                <h3>Loan Details:</h3>
                <ul>
                  <li><strong>Loan ID:</strong> #${data.loanId}</li>
                  <li><strong>Approved Amount:</strong> GHC${data.approvedAmount.toLocaleString()}</li>
                  <li><strong>Loan Duration:</strong> ${data.loanDuration} ${data.paymentMode === "weekly" ? "weeks" : "months"}</li>
                  <li><strong>Payment Mode:</strong> ${data.paymentMode}</li>
                </ul>
                <p>Your loan will be processed for disbursement shortly. You will receive another notification once the funds are disbursed.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Congratulations ${data.fullname}! Your loan application #${data.loanId} has been approved for $${data.approvedAmount.toLocaleString()}.`,
        }

      case "loan-disbursement":
        return {
          subject: "Loan Funds Disbursed",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Loan Disbursed</h1>
              </div>
              <div class="content">
                <div class="success">
                  <h2>Hello ${data.fullname},</h2>
                  <p>Your loan funds have been successfully disbursed!</p>
                </div>
                <h3>Disbursement Details:</h3>
                <ul>
                  <li><strong>Loan ID:</strong> #${data.loanId}</li>
                  <li><strong>Disbursed Amount:</strong> GHC${data.disbursedAmount.toLocaleString()}</li>
                  <li><strong>Disbursement Date:</strong> ${data.disbursementDate}</li>
                  <li><strong>First Payment Due:</strong> ${data.firstPaymentDate}</li>
                </ul>
                <p>Please ensure you make your payments on time to maintain a good credit standing.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Hello ${data.fullname}, your loan #${data.loanId} funds of $${data.disbursedAmount.toLocaleString()} have been disbursed on ${data.disbursementDate}.`,
        }

      case "repayment-reminder":
        return {
          subject: "Payment Reminder - Loan Repayment Due",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Payment Reminder</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.fullname},</h2>
                <p>This is a friendly reminder that your loan payment is due ${data.daysUntilDue > 0 ? `in ${data.daysUntilDue} days` : "today"}.</p>
                <h3>Payment Details:</h3>
                <ul>
                  <li><strong>Loan ID:</strong> #${data.loanId}</li>
                  <li><strong>Amount Due:</strong> $${data.amount.toLocaleString()}</li>
                  <li><strong>Due Date:</strong> ${data.dueDate}</li>
                </ul>
                <p>Please ensure your payment is made on time to avoid late fees and maintain your good standing.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Hello ${data.fullname}, your loan payment of $${data.amount.toLocaleString()} for loan #${data.loanId} is due on ${data.dueDate}.`,
        }

      case "overdue-notification":
        return {
          subject: "URGENT: Overdue Payment Notice",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header" style="background-color: #dc3545;">
                <h1>Overdue Payment Notice</h1>
              </div>
              <div class="content">
                <div class="alert">
                  <h2>URGENT: ${data.fullname}</h2>
                  <p>Your loan payment is now ${data.daysOverdue} days overdue.</p>
                </div>
                <h3>Overdue Details:</h3>
                <ul>
                  <li><strong>Loan ID:</strong> #${data.loanId}</li>
                  <li><strong>Overdue Amount:</strong> $${data.overdueAmount.toLocaleString()}</li>
                  <li><strong>Days Overdue:</strong> ${data.daysOverdue}</li>
                  <li><strong>Total Outstanding:</strong> $${data.totalOutstanding.toLocaleString()}</li>
                </ul>
                <p><strong>Please contact us immediately to arrange payment and avoid further action.</strong></p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `URGENT: ${data.fullname}, your loan payment is ${data.daysOverdue} days overdue. Amount: $${data.overdueAmount.toLocaleString()}. Please contact us immediately.`,
        }

      case "welcome":
        return {
          subject: "Welcome to Loan Management System",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Welcome to Our Team!</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.fullname},</h2>
                <p>Welcome to the Loan Management System! Your account has been created with the role of <strong>${data.userRole}</strong>.</p>
                <p>You can now access the system using your email address and the password provided to you.</p>
                <p><a href="${data.loginUrl}" class="button">Login to System</a></p>
                <p>If you have any questions or need assistance, please don't hesitate to contact your administrator.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Welcome ${data.fullname}! Your account has been created with the role of ${data.userRole}. Login at: ${data.loginUrl}`,
        }

      case "loan-status-update":
        return {
          subject: "Loan Status Update",
          html: `
            ${baseStyle}
            <div class="container">
              <div class="header">
                <h1>Loan Status Update</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.fullname},</h2>
                <p>There has been an update to your loan status.</p>
                <h3>Status Change:</h3>
                <ul>
                  <li><strong>Loan ID:</strong> #${data.loanId}</li>
                  <li><strong>Previous Status:</strong> ${data.oldStatus}</li>
                  <li><strong>New Status:</strong> ${data.newStatus}</li>
                </ul>
                <p><strong>Message:</strong> ${data.message}</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Loan Management System. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `Hello ${data.fullname}, your loan #${data.loanId} status has been updated from ${data.oldStatus} to ${data.newStatus}. ${data.message}`,
        }

      default:
        throw new Error("Invalid email template type")
    }
  }

  // Bulk email sending for notifications
  async sendBulkEmails(
    emails: Array<{
      email: string
      templateType: string
      data: any
    }>,
  ): Promise<void> {
    const promises = emails.map(({ email, templateType, data }) => {
      const template = this.getEmailTemplate(templateType, data)
      return this.sendEmail(email, template)
    })

    await Promise.allSettled(promises)
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error("Email configuration test failed:", error)
      return false
    }
  }
}

export default new EmailService()
