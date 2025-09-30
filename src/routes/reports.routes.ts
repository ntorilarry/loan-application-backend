import { Router } from "express"
import ReportController from "../controllers/report.controller"
import { authenticate, authorize } from "../middlewares"
import { PERMISSIONS } from "../common/constants"
import Joi from "joi"
import { validate } from "../middlewares/validation.middleware"

const router = Router()

// Validation schemas
const deleteLogsSchema = Joi.object({
  logIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
})

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get("/dashboard", authenticate, authorize(PERMISSIONS.REPORTS_VIEW), ReportController.getDashboardStats)

/**
 * @swagger
 * /api/reports/expected-repayments:
 *   get:
 *     summary: Get expected repayments for a specific date
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check repayments for (defaults to today)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Expected repayments retrieved successfully
 */
router.get(
  "/expected-repayments",
  authenticate,
  authorize(PERMISSIONS.REPORTS_VIEW),
  ReportController.getExpectedRepayments,
)

/**
 * @swagger
 * /api/reports/loan-defaulters:
 *   get:
 *     summary: Get loan defaulters report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Loan defaulters retrieved successfully
 */
router.get("/loan-defaulters", authenticate, authorize(PERMISSIONS.REPORTS_VIEW), ReportController.getLoanDefaulters)

/**
 * @swagger
 * /api/reports/repayments-received:
 *   get:
 *     summary: Get repayments received within date range
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (defaults to today)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (defaults to today)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Repayments received retrieved successfully
 */
router.get(
  "/repayments-received",
  authenticate,
  authorize(PERMISSIONS.REPORTS_VIEW),
  ReportController.getRepaymentsReceived,
)

/**
 * @swagger
 * /api/reports/loan-statement/{loanId}:
 *   get:
 *     summary: Generate loan statement for a specific loan
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan statement generated successfully
 *       404:
 *         description: Loan not found
 */
router.get(
  "/loan-statement/:loanId",
  authenticate,
  authorize(PERMISSIONS.REPORTS_VIEW),
  ReportController.generateLoanStatement,
)

/**
 * @swagger
 * /api/reports/export/{reportType}:
 *   get:
 *     summary: Export report data
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [expected_repayments, loan_defaulters, repayments_received, all_loans]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: For expected_repayments report
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: For repayments_received report
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: For repayments_received report
 *     responses:
 *       200:
 *         description: Report exported successfully
 */
router.get("/export/:reportType", authenticate, authorize(PERMISSIONS.REPORTS_EXPORT), ReportController.exportReport)

/**
 * @swagger
 * /api/reports/system-logs:
 *   get:
 *     summary: Get system logs
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entity_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: System logs retrieved successfully
 */
router.get("/system-logs", authenticate, authorize(PERMISSIONS.LOGS_VIEW), ReportController.getSystemLogs)

/**
 * @swagger
 * /api/reports/system-logs:
 *   delete:
 *     summary: Delete system logs
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - logIds
 *             properties:
 *               logIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: System logs deleted successfully
 */
router.delete(
  "/system-logs",
  authenticate,
  authorize(PERMISSIONS.LOGS_DELETE),
  validate(deleteLogsSchema),
  ReportController.deleteSystemLogs,
)

export default router
