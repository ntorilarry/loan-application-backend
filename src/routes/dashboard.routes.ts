import { Router } from "express"
import DashboardController from "../controllers/dashboard.controller"
import { authenticate, authorize } from "../middlewares"
import { PERMISSIONS } from "../common/constants"

const router = Router()

/**
 * @swagger
 * /api/dashboard/comprehensive:
 *   get:
 *     summary: Get comprehensive dashboard with all metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_clients:
 *                       type: number
 *                     active_employees:
 *                       type: number
 *                     total_disbursed:
 *                       type: number
 *                     pending_approvals:
 *                       type: number
 *                     client_stats:
 *                       type: object
 *                     employee_stats:
 *                       type: object
 */
router.get(
  "/comprehensive",
  authenticate,
  authorize(PERMISSIONS.REPORTS_VIEW),
  DashboardController.getComprehensiveDashboard,
)

/**
 * @swagger
 * /api/dashboard/clients:
 *   get:
 *     summary: Get client statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client statistics retrieved successfully
 */
router.get("/clients", authenticate, authorize(PERMISSIONS.REPORTS_VIEW), DashboardController.getClientStats)

/**
 * @swagger
 * /api/dashboard/employees:
 *   get:
 *     summary: Get employee statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee statistics retrieved successfully
 */
router.get("/employees", authenticate, authorize(PERMISSIONS.REPORTS_VIEW), DashboardController.getEmployeeStats)

export default router
