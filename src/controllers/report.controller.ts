import type { Response } from "express";
import ReportService from "../services/report.service";
import type { AuthenticatedRequest } from "../common/types";
import { logSystemActivity } from "../middlewares/logger.middleware";
import pool from "../db"; 

class ReportController {
  async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await ReportService.getDashboardStats();

      res.json({
        success: true,
        message: "Dashboard statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard statistics",
      });
    }
  }

  async getExpectedRepayments(req: AuthenticatedRequest, res: Response) {
    try {
      const date = req.query.date
        ? new Date(req.query.date as string)
        : new Date();
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;

      const result = await ReportService.getExpectedRepayments(
        date,
        page,
        limit
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve expected repayments",
      });
    }
  }

  async getLoanDefaulters(req: AuthenticatedRequest, res: Response) {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;

      const result = await ReportService.getLoanDefaulters(page, limit);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve loan defaulters",
      });
    }
  }

  async getRepaymentsReceived(req: AuthenticatedRequest, res: Response) {
    try {
      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date();
      const endDate = req.query.end_date
        ? new Date(req.query.end_date as string)
        : new Date();
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;

      // Set default date range if not provided
      if (!req.query.start_date) {
        startDate.setHours(0, 0, 0, 0);
      }
      if (!req.query.end_date) {
        endDate.setHours(23, 59, 59, 999);
      }

      const result = await ReportService.getRepaymentsReceived(
        startDate,
        endDate,
        page,
        limit
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve repayments received",
      });
    }
  }

  async generateLoanStatement(req: AuthenticatedRequest, res: Response) {
    try {
      const { loanId } = req.params;

      const statement = await ReportService.generateLoanStatement(
        Number.parseInt(loanId)
      );

      await logSystemActivity(
        req.user?.id,
        "Loan statement generated",
        "Loan",
        Number.parseInt(loanId),
        { client_name: statement.loan.client_name },
        req
      );

      res.json({
        success: true,
        message: "Loan statement generated successfully",
        data: statement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate loan statement",
      });
    }
  }

  async exportReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { reportType } = req.params;
      const filters = req.query;

      // Convert date strings to Date objects
      const processedFilters: any = { ...filters };
      if (filters.date) {
        processedFilters.date = new Date(filters.date as string);
      }
      if (filters.start_date) {
        processedFilters.start_date = new Date(filters.start_date as string);
      }
      if (filters.end_date) {
        processedFilters.end_date = new Date(filters.end_date as string);
      }

      const data = await ReportService.exportReport(
        reportType,
        processedFilters
      );

      await logSystemActivity(
        req.user?.id,
        `Report exported: ${reportType}`,
        "Report",
        undefined,
        { report_type: reportType, filters },
        req
      );

      res.json({
        success: true,
        message: "Report exported successfully",
        data,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to export report",
      });
    }
  }

  async getSystemLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;
      const action = req.query.action as string;
      const entityType = req.query.entity_type as string;
      const userId = req.query.user_id
        ? Number.parseInt(req.query.user_id as string)
        : undefined;

      const offset = (page - 1) * limit;

      let query = `
        SELECT sl.id, sl.user_id, sl.action, sl.entity_type, sl.entity_id,
               sl.details, sl.ip_address, sl.user_agent, sl.created_at,
               u.fullname as user_name, u.email as user_email
        FROM system_logs sl
        LEFT JOIN users u ON sl.user_id = u.id
        WHERE 1=1
      `;

      let countQuery = `
        SELECT COUNT(*) FROM system_logs sl
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (action) {
        query += ` AND sl.action ILIKE $${paramIndex}`;
        countQuery += ` AND sl.action ILIKE $${paramIndex}`;
        queryParams.push(`%${action}%`);
        paramIndex++;
      }

      if (entityType) {
        query += ` AND sl.entity_type = $${paramIndex}`;
        countQuery += ` AND sl.entity_type = $${paramIndex}`;
        queryParams.push(entityType);
        paramIndex++;
      }

      if (userId) {
        query += ` AND sl.user_id = $${paramIndex}`;
        countQuery += ` AND sl.user_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      }

      query += ` ORDER BY sl.created_at DESC LIMIT $${paramIndex} OFFSET $${
        paramIndex + 1
      }`;
      queryParams.push(limit, offset);

      const [logsResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ]);

      const total = Number.parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        message: "System logs retrieved successfully",
        data: logsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve system logs",
      });
    }
  }

  async deleteSystemLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const { logIds } = req.body;

      if (!Array.isArray(logIds) || logIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Log IDs array is required",
        });
      }

      const placeholders = logIds.map((_, index) => `$${index + 1}`).join(", ");
      const deleteQuery = `DELETE FROM system_logs WHERE id IN (${placeholders})`;

      const result = await pool.query(deleteQuery, logIds);

      await logSystemActivity(
        req.user?.id,
        "System logs deleted",
        "SystemLog",
        undefined,
        { deleted_count: result.rowCount, log_ids: logIds },
        req
      );

      res.json({
        success: true,
        message: `${result.rowCount} system logs deleted successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete system logs",
      });
    }
  }
}

export default new ReportController();
