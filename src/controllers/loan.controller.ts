import type { Response } from "express";
import LoanService from "../services/loan.service";
import type { AuthenticatedRequest, PaginatedResponse } from "../common/types";
import type {
  CreateClientRequest,
  UpdateClientRequest,
} from "../models/client.model";
import type { ApproveLoanRequest, DisburseLoanRequest } from "../models/loan.model";
import { logSystemActivity } from "../middlewares/logger.middleware";
import pool from "../database/connection";

class LoanController {
  // Phase 1: Registration
  async registerLoan(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const clientData: CreateClientRequest = req.body;
      const result = await LoanService.registerLoan(clientData, req.user.id);

      await logSystemActivity(
        req.user.id,
        "Loan registered",
        "Loan",
        result.loan.id,
        {
          client_name: result.client.fullname,
          requested_amount: clientData.requested_amount,
        },
        req
      );

      // Fetch full loan details including user names
      const detailed = await LoanService.getLoanById(result.loan.id);
      res.status(201).json({
        success: true,
        message: "Loan registered successfully",
        data: {
          client: result.client,
          loan: detailed ?? result.loan,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to register loan",
      });
    }
  }

  // Phase 2: Capturing
  async captureLoanDetails(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { loanId } = req.params;
      const clientDetails: UpdateClientRequest = req.body;

      const loan = await LoanService.captureLoanDetails(
        Number.parseInt(loanId),
        clientDetails,
        req.user.id
      );

      await logSystemActivity(
        req.user.id,
        "Loan details captured",
        "Loan",
        loan.id,
        { phase: "capturing" },
        req
      );

      res.json({
        success: true,
        message: "Loan details captured successfully",
        data: loan,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to capture loan details",
      });
    }
  }

  // Phase 3: Approval
  async approveLoan(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { loanId } = req.params;
      const approvalData: ApproveLoanRequest = req.body;

      const loan = await LoanService.approveLoan(
        Number.parseInt(loanId),
        approvalData,
        req.user.id
      );

      await logSystemActivity(
        req.user.id,
        "Loan approved",
        "Loan",
        loan.id,
        {
          approved_amount: approvalData.approved_amount,
          loan_duration: approvalData.loan_duration,
        },
        req
      );

      res.json({
        success: true,
        message: "Loan approved successfully",
        data: loan,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to approve loan",
      });
    }
  }

  // Phase 4: Disbursement
  async disburseLoan(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { loanId } = req.params;
      const disbursementData: DisburseLoanRequest = req.body;

      const loan = await LoanService.disburseLoan(
        Number.parseInt(loanId),
        disbursementData,
        req.user.id
      );

      await logSystemActivity(
        req.user.id,
        "Loan disbursed",
        "Loan",
        loan.id,
        { 
          disbursement_date: loan.disbursement_date,
          disbursement_method: disbursementData.disbursement_method,
          disbursement_notes: disbursementData.disbursement_notes
        },
        req
      );

      res.json({
        success: true,
        message: "Loan disbursed successfully",
        data: loan,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to disburse loan",
      });
    }
  }

  async getAllLoans(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const phase = req.query.phase
        ? Number.parseInt(req.query.phase as string)
        : undefined;
      const search = req.query.search as string;

      // Get user role for filtering
      const userRole = await this.getUserRole(req.user.id);

      const result = await LoanService.getLoansWithFilters({
        status,
        phase,
        page,
        limit,
        search,
        userId: req.user.id,
        userRole,
      });

      const response = {
        success: true,
        message: "Loans retrieved successfully",
        data: result.loans,
        stats: result.stats,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as PaginatedResponse<any> & { stats: { total_registrations: number; registered: number; captured: number; total_requested: number } };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve loans",
      });
    }
  }

  async getLoanById(req: AuthenticatedRequest, res: Response) {
    try {
      const { loanId } = req.params;

      const loan = await LoanService.getStructuredLoanById(Number.parseInt(loanId));

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found",
        });
      }

      res.json({
        success: true,
        message: "Loan retrieved successfully",
        data: loan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve loan",
      });
    }
  }

  async recordRepayment(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { loanId } = req.params;
      const { amount, payment_date, notes } = req.body;

      const result = await LoanService.recordRepayment(
        Number.parseInt(loanId),
        amount,
        new Date(payment_date),
        req.user.id,
        notes
      );

      await logSystemActivity(
        req.user.id,
        "Repayment recorded",
        "Loan",
        Number.parseInt(loanId),
        { amount, payment_date, notes },
        req
      );

      res.json({
        success: true,
        message: "Repayment recorded successfully",
        data: {
          amount,
          payment_date,
          remainingBalance: result.remainingBalance,
          totalPaid: result.totalPaid,
          nextDueAmount: result.nextDueAmount,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to record repayment",
      });
    }
  }

  async getLoanRepayments(req: AuthenticatedRequest, res: Response) {
    try {
      const { loanId } = req.params;

      const repayments = await LoanService.getLoanRepayments(
        Number.parseInt(loanId)
      );

      res.json({
        success: true,
        message: "Loan repayments retrieved successfully",
        data: repayments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve loan repayments",
      });
    }
  }

  async getLoanPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const { loanId } = req.params;

      const payments = await LoanService.getLoanPayments(
        Number.parseInt(loanId)
      );

      res.json({
        success: true,
        message: "Loan payments retrieved successfully",
        data: payments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve loan payments",
      });
    }
  }

  async getLoanBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const { loanId } = req.params;

      const balance = await LoanService.getLoanBalance(
        Number.parseInt(loanId)
      );

      res.json({
        success: true,
        message: "Loan balance retrieved successfully",
        data: balance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve loan balance",
      });
    }
  }

  async editLoan(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { loanId } = req.params;
      const loanData = req.body;

      const loan = await LoanService.editLoan(
        Number.parseInt(loanId),
        loanData,
        req.user.id
      );

      await logSystemActivity(
        req.user.id,
        "Loan edited",
        "Loan",
        loan.id,
        { edited_fields: Object.keys(loanData) },
        req
      );

      res.json({
        success: true,
        message: "Loan updated successfully",
        data: loan,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update loan",
      });
    }
  }

  async deleteLoan(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { loanId } = req.params;

      await LoanService.deleteLoan(Number.parseInt(loanId), req.user.id);

      await logSystemActivity(
        req.user.id,
        "Loan deleted",
        "Loan",
        Number.parseInt(loanId),
        { deleted_loan_id: Number.parseInt(loanId) },
        req
      );

      res.json({
        success: true,
        message: "Loan deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete loan",
      });
    }
  }

  private async getUserRole(userId: number): Promise<string> {
    try {
      const result = await pool.query(
        "SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1",
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0].name : "Viewer";
    } catch (error) {
      return "Viewer";
    }
  }
}

export default new LoanController();
