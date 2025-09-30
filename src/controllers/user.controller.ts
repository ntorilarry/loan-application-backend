import type { Request, Response } from "express";
import pool from "../database/connection";
import bcrypt from "bcryptjs";
import type { AuthenticatedRequest, PaginatedResponse } from "../common/types";
import type { User, CreateUserRequest } from "../models/user.model";
import { logSystemActivity } from "../middlewares/logger.middleware";

class UserController {
  async getAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;

      const offset = (page - 1) * limit;

      let query = `
        SELECT u.id, u.fullname, u.email, u.phone, u.company_name, u.company_address, 
               u.is_email_verified, u.role_id, u.created_at, u.updated_at,
               r.name as role_name, r.description as role_description
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      let countQuery =
        "SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE 1=1";
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (u.fullname ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        countQuery += ` AND (u.fullname ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        query += ` AND r.name = $${paramIndex}`;
        countQuery += ` AND r.name = $${paramIndex}`;
        queryParams.push(role);
        paramIndex++;
      }

      query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${
        paramIndex + 1
      }`;
      queryParams.push(limit, offset);

      const [usersResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
      ]);

      const total = Number.parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<User> = {
        success: true,
        message: "Users retrieved successfully",
        data: usersResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve users",
      });
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT u.id, u.fullname, u.email, u.phone, u.company_name, u.company_address, 
               u.is_email_verified, u.role_id, u.created_at, u.updated_at,
               r.name as role_name, r.description as role_description
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User retrieved successfully",
        data: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user",
      });
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userData: CreateUserRequest = req.body;
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Check if user already exists
        const existingUser = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [userData.email]
        );

        if (existingUser.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "User with this email already exists",
          });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

        // Create user
        const result = await client.query(
          `INSERT INTO users (fullname, email, phone, company_name, company_address, password_hash, role_id, is_email_verified) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING id, fullname, email, phone, company_name, company_address, is_email_verified, role_id, created_at`,
          [
            userData.fullname,
            userData.email,
            userData.phone,
            userData.company_name,
            userData.company_address,
            passwordHash,
            userData.role_id || 3, // Default to Viewer role
            true, // Admin-created users are pre-verified
          ]
        );

        const user = result.rows[0];

        await client.query("COMMIT");

        await logSystemActivity(
          req.user?.id,
          "User created",
          "User",
          user.id,
          { email: user.email, created_by: req.user?.email },
          req
        );

        res.status(201).json({
          success: true,
          message: "User created successfully",
          data: user,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create user",
      });
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.password;
      delete updateData.password_hash;
      delete updateData.email_verification_token;
      delete updateData.reset_password_token;

      const fields = Object.keys(updateData);
      const values = Object.values(updateData);

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update",
        });
      }

      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(", ");
      const query = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, fullname, email, phone, company_name, company_address, is_email_verified, role_id, updated_at`;

      const result = await pool.query(query, [id, ...values]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await logSystemActivity(
        req.user?.id,
        "User updated",
        "User",
        Number.parseInt(id),
        { updated_fields: fields, updated_by: req.user?.email },
        req
      );

      res.json({
        success: true,
        message: "User updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user",
      });
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Prevent users from deleting themselves
      if (req.user?.id === Number.parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING email",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await logSystemActivity(
        req.user?.id,
        "User deleted",
        "User",
        Number.parseInt(id),
        { deleted_email: result.rows[0].email, deleted_by: req.user?.email },
        req
      );

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
      });
    }
  }

  async getRoles(req: Request, res: Response) {
    try {
      const result = await pool.query(
        "SELECT id, name, description FROM roles ORDER BY name"
      );

      res.json({
        success: true,
        message: "Roles retrieved successfully",
        data: result.rows,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve roles",
      });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      // Get current user with password
      const userResult = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newPasswordHash, req.user.id]
      );

      await logSystemActivity(
        req.user.id,
        "Password changed",
        "User",
        req.user.id,
        { email: req.user.email },
        req
      );

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to change password",
      });
    }
  }
}

export default new UserController();
