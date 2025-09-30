import type { Request, Response } from "express";
import AuthService from "../services/auth.service";
import pool from "../database/connection";
import type {
  CreateUserRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../models/user.model";
import type { AuthenticatedRequest } from "../common/types";
import { logSystemActivity } from "../middlewares/logger.middleware";

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const userData: CreateUserRequest = req.body;
      const result = await AuthService.register(userData);

      await logSystemActivity(
        result.user.id,
        "User registered",
        "User",
        result.user.id,
        { email: result.user.email },
        req
      );

      res.status(201).json({
        success: true,
        message:
          "User registered successfully. Please check your email for verification.",
        data: {
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          refresh_token_expires: result.refresh_token_expires,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const loginData: LoginRequest = req.body;
      const result = await AuthService.login(loginData);

      await logSystemActivity(
        result.user.id,
        "User logged in",
        "User",
        result.user.id,
        { email: result.user.email },
        req
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          refresh_token_expires: result.refresh_token_expires,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const forgotPasswordData: ForgotPasswordRequest = req.body;
      await AuthService.forgotPassword(forgotPasswordData);

      await logSystemActivity(
        undefined,
        "Password reset requested",
        "User",
        undefined,
        { email: forgotPasswordData.email },
        req
      );

      res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request",
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const resetData: ResetPasswordRequest = req.body;
      await AuthService.resetPassword(resetData);

      await logSystemActivity(
        undefined,
        "Password reset completed",
        "User",
        undefined,
        { token: resetData.token },
        req
      );

      res.json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Password reset failed",
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message: "Verification token is required",
        });
      }

      await AuthService.verifyEmail(token);

      await logSystemActivity(
        undefined,
        "Email verified",
        "User",
        undefined,
        { token },
        req
      );

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Email verification failed",
      });
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const userWithPermissions = await AuthService.getUserWithPermissions(
        req.user.id
      );

      res.json({
        success: true,
        message: "Profile retrieved successfully",
        data: {
          user: req.user,
          role: userWithPermissions,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve profile",
      });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user) {
        await logSystemActivity(
          req.user.id,
          "User logged out",
          "User",
          req.user.id,
          { email: req.user.email },
          req
        );
      }

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Verify the refresh token and get user
      const result = await pool.query(
        `SELECT id, fullname, email, phone, company_name, company_address,
                is_email_verified, email_verification_token, reset_password_token,
                reset_password_expires, tenant_schema, role_id, created_at, updated_at
         FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()`,
        [refresh_token]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
        });
      }

      const user = result.rows[0];

      // Generate new JWT token
      const newAccessToken = AuthService.generateToken(
        user.id,
        user.email,
        user.role_id
      );

      await logSystemActivity(
        user.id,
        "Token refreshed using refresh token",
        "User",
        user.id,
        { email: user.email },
        req
      );

      // Remove password hash from response (not included in query)
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          user: userWithoutPassword,
          access_token: newAccessToken,
          refresh_token: user.reset_password_token,
          refresh_token_expires: user.reset_password_expires,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Token refresh failed",
      });
    }
  }
}

export default new AuthController();
