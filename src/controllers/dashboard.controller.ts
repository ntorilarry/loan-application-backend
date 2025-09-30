import type { Response } from "express"
import DashboardService from "../services/dashboard.service"
import type { AuthenticatedRequest } from "../common/types"

class DashboardController {
  async getComprehensiveDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const dashboard = await DashboardService.getComprehensiveDashboard()

      res.json({
        success: true,
        message: "Comprehensive dashboard data retrieved successfully",
        data: dashboard,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard data",
      })
    }
  }

  async getClientStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await DashboardService.getClientStats()

      res.json({
        success: true,
        message: "Client statistics retrieved successfully",
        data: stats,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve client statistics",
      })
    }
  }

  async getEmployeeStats(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await DashboardService.getEmployeeStats()

      res.json({
        success: true,
        message: "Employee statistics retrieved successfully",
        data: stats,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve employee statistics",
      })
    }
  }
}

export default new DashboardController()
