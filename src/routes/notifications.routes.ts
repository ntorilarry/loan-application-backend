import { Router } from "express"
import NotificationController from "../controllers/notification.controller"
import { authenticate, authorize } from "../middlewares"
import { validate } from "../middlewares/validation.middleware"
import { PERMISSIONS } from "../common/constants"
import Joi from "joi"

const router = Router()

// Validation schemas
const testNotificationSchema = Joi.object({
  email: Joi.string().email().required(),
})

/**
 * @swagger
 * /api/notifications/repayment-reminders:
 *   post:
 *     summary: Send repayment reminders
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repayment reminders sent successfully
 */
router.post(
  "/repayment-reminders",
  authenticate,
  authorize([PERMISSIONS.LOANS_UPDATE, PERMISSIONS.REPORTS_VIEW]),
  NotificationController.sendRepaymentReminders,
)

/**
 * @swagger
 * /api/notifications/overdue-notifications:
 *   post:
 *     summary: Send overdue notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue notifications sent successfully
 */
router.post(
  "/overdue-notifications",
  authenticate,
  authorize([PERMISSIONS.LOANS_UPDATE, PERMISSIONS.REPORTS_VIEW]),
  NotificationController.sendOverdueNotifications,
)

/**
 * @swagger
 * /api/notifications/test-email:
 *   get:
 *     summary: Test email configuration
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email configuration test result
 */
router.get(
  "/test-email",
  authenticate,
  authorize(PERMISSIONS.SETTINGS_UPDATE),
  NotificationController.testEmailConfiguration,
)

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 */
router.post(
  "/test",
  authenticate,
  authorize(PERMISSIONS.SETTINGS_UPDATE),
  validate(testNotificationSchema),
  NotificationController.sendTestNotification,
)

export default router
