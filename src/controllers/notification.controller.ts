import type { Response } from "express";
import NotificationService from "../services/notification.service";
import EmailService from "../services/email.service";
import type { AuthenticatedRequest } from "../common/types";
import { logSystemActivity } from "../middlewares/logger.middleware";

class NotificationController {
  async sendRepaymentReminders(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationService.sendRepaymentReminders();

      await logSystemActivity(
        req.user?.id,
        "Repayment reminders sent",
        "Notification",
        undefined,
        { type: "repayment_reminders" },
        req
      );

      res.json({
        success: true,
        message: "Repayment reminders sent successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to send repayment reminders",
      });
    }
  }

  async sendOverdueNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      await NotificationService.sendOverdueNotifications();

      await logSystemActivity(
        req.user?.id,
        "Overdue notifications sent",
        "Notification",
        undefined,
        { type: "overdue_notifications" },
        req
      );

      res.json({
        success: true,
        message: "Overdue notifications sent successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to send overdue notifications",
      });
    }
  }

  async testEmailConfiguration(req: AuthenticatedRequest, res: Response) {
    try {
      const isConfigured = await EmailService.testEmailConfiguration();

      res.json({
        success: isConfigured,
        message: isConfigured
          ? "Email configuration is working"
          : "Email configuration failed",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to test email configuration",
      });
    }
  }

  async sendTestNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required",
        });
      }

      await NotificationService.testNotifications(email);

      await logSystemActivity(
        req.user?.id,
        "Test notification sent",
        "Notification",
        undefined,
        { test_email: email },
        req
      );

      res.json({
        success: true,
        message: "Test notification sent successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to send test notification",
      });
    }
  }
}

export default new NotificationController();
