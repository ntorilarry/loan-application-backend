import type { Request, Response } from "express";
import pool from "../database/connection";
import type { AuthenticatedRequest } from "../common/types";
import { logSystemActivity } from "../middlewares/logger.middleware";

interface CompanySettings {
  id: number;
  company_name: string;
  company_address?: string;
  company_email?: string;
  company_contact?: string;
  company_logo?: string;
  created_at: Date;
  updated_at: Date;
}

class SettingsController {
  async getCompanySettings(req: Request, res: Response) {
    try {
      const result = await pool.query(
        "SELECT * FROM company_settings ORDER BY id DESC LIMIT 1"
      );

      if (result.rows.length === 0) {
        // Return default settings if none exist
        return res.json({
          success: true,
          message: "Company settings retrieved successfully",
          data: {
            company_name: "Loan Management System",
            company_address: "",
            company_email: "",
            company_contact: "",
            company_logo: "",
          },
        });
      }

      res.json({
        success: true,
        message: "Company settings retrieved successfully",
        data: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve company settings",
      });
    }
  }

  async updateCompanySettings(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        company_name,
        company_address,
        company_email,
        company_contact,
        company_logo,
      } = req.body;

      // Check if settings exist
      const existingResult = await pool.query(
        "SELECT id FROM company_settings ORDER BY id DESC LIMIT 1"
      );

      let result;
      if (existingResult.rows.length === 0) {
        // Create new settings
        result = await pool.query(
          `INSERT INTO company_settings (company_name, company_address, company_email, company_contact, company_logo)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            company_name,
            company_address,
            company_email,
            company_contact,
            company_logo,
          ]
        );
      } else {
        // Update existing settings
        const settingsId = existingResult.rows[0].id;
        result = await pool.query(
          `UPDATE company_settings 
           SET company_name = $1, company_address = $2, company_email = $3, 
               company_contact = $4, company_logo = $5, updated_at = CURRENT_TIMESTAMP
           WHERE id = $6
           RETURNING *`,
          [
            company_name,
            company_address,
            company_email,
            company_contact,
            company_logo,
            settingsId,
          ]
        );
      }

      await logSystemActivity(
        req.user?.id,
        "Company settings updated",
        "Settings",
        result.rows[0].id,
        { company_name },
        req
      );

      res.json({
        success: true,
        message: "Company settings updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update company settings",
      });
    }
  }
}

export default new SettingsController();
