import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../database/connection";
import type {
  User,
  CreateUserRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthResponse,
} from "../models/user.model";
import type { RoleWithPermissions } from "../models/role.model";
import EmailService from "./email.service";

class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "fallback-secret";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
  }

  async register(
    userData: CreateUserRequest
  ): Promise<AuthResponse> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if user already exists
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      
      // Generate refresh token
      const refreshToken = crypto.randomBytes(32).toString("hex");
      const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      let roleId = userData.role_id;
      if (!roleId) {
        const userCount = await client.query("SELECT COUNT(*) FROM users");
        const isFirstUser = Number.parseInt(userCount.rows[0].count) === 0;

        if (isFirstUser) {
          // Use role name "Owner" instead of hardcoded ID
          const ownerRole = await client.query(
            "SELECT id FROM roles WHERE name = $1",
            ["Owner"]
          );
          roleId = ownerRole.rows[0].id;
        } else {
          // Default to "Owner" role by name for all new registrations
          const ownerRole = await client.query(
            "SELECT id FROM roles WHERE name = $1",
            ["Owner"]
          );
          roleId = ownerRole.rows[0].id;
        }
      }

      // Generate unique tenant schema name (e.g., tenant_{timestamp}_{rand})
      const normalizedCompany = (userData.company_name || "tenant")
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const tenantSchema = `${normalizedCompany || "tenant"}_${Date.now().toString(36)}`.slice(0, 63);

      // Create tenant schema and all tables from template
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`);

      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.join(__dirname, "../database/tenant_template.sql");
      const templateSql = fs.readFileSync(templatePath, "utf8").replace(/__SCHEMA__/g, tenantSchema);
      await client.query(templateSql);

      // Seed tenant roles and permissions with defaults similar to public
      await client.query(
        `INSERT INTO "${tenantSchema}".roles (name, description) VALUES 
         ('Owner', 'The person who owns the app. Can do anything in the system'),
         ('Admin', 'Can do anything as owner but cannot delete logs'),
         ('Viewer', 'Can view everything but cannot add or modify'),
         ('Manager', 'Disbursement Only'),
         ('Call Center', 'Registration Process'),
         ('Sales Executive', 'Registration Capturing'),
         ('Loan Officer', 'Registration Capturing'),
         ('Credit Risk Analyst', 'Approve Loans')
         ON CONFLICT (name) DO NOTHING;`
      );

      await client.query(
        `INSERT INTO "${tenantSchema}".permissions (entity, action, description) VALUES 
         ('Users', 'CanCreate', 'Can create users'),
         ('Users', 'CanDelete', 'Can delete users'),
         ('Users', 'CanUpdate', 'Can update users'),
         ('Users', 'CanView', 'Can view users'),
         ('Users', 'CanList', 'Can list users'),
         ('Clients', 'CanCreate', 'Can create clients'),
         ('Clients', 'CanDelete', 'Can delete clients'),
         ('Clients', 'CanUpdate', 'Can update clients'),
         ('Clients', 'CanView', 'Can view clients'),
         ('Clients', 'CanList', 'Can list clients'),
         ('Loans', 'CanCreate', 'Can create loans'),
         ('Loans', 'CanDelete', 'Can delete loans'),
         ('Loans', 'CanUpdate', 'Can update loans'),
         ('Loans', 'CanView', 'Can view loans'),
         ('Loans', 'CanList', 'Can list loans'),
         ('Loans', 'CanApprove', 'Can approve loans'),
         ('Loans', 'CanDisburse', 'Can disburse loans'),
         ('Reports', 'CanView', 'Can view reports'),
         ('Reports', 'CanExport', 'Can export reports'),
         ('Logs', 'CanView', 'Can view logs'),
         ('Logs', 'CanDelete', 'Can delete logs'),
         ('Settings', 'CanUpdate', 'Can update company settings')
         ON CONFLICT (entity, action) DO NOTHING;`
      );

      // Create user
      const result = await client.query(
        `INSERT INTO users (fullname, email, phone, company_name, company_address, password_hash, 
         email_verification_token, reset_password_token, reset_password_expires, tenant_schema, role_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
         RETURNING id, fullname, email, phone, company_name, company_address, is_email_verified, role_id, tenant_schema, reset_password_token, reset_password_expires, created_at`,
        [
          userData.fullname,
          userData.email,
          userData.phone,
          userData.company_name,
          userData.company_address,
          passwordHash,
          emailVerificationToken,
          refreshToken,
          refreshTokenExpires,
          tenantSchema,
          roleId,
        ]
      );

      const user = result.rows[0];

      // Send verification email
      await EmailService.sendVerificationEmail(
        user.email,
        user.fullname,
        emailVerificationToken
      );

      await client.query("COMMIT");

      // Generate JWT token
      const access_token = this.generateToken(user.id, user.email, user.role_id);

      return { 
        user, 
        access_token,
        refresh_token: user.reset_password_token,
        refresh_token_expires: user.reset_password_expires
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async login(
    loginData: LoginRequest
  ): Promise<AuthResponse> {
    const result = await pool.query(
      `SELECT id, fullname, email, phone, company_name, company_address,
              is_email_verified, email_verification_token, reset_password_token,
              reset_password_expires, tenant_schema, role_id, created_at, updated_at
       FROM users WHERE email = $1`,
      [loginData.email]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = result.rows[0];

    // Get password hash for verification
    const passwordResult = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [loginData.email]
    );
    
    if (passwordResult.rows.length === 0) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      passwordResult.rows[0].password_hash
    );
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate new refresh token if none exists or expired
    let refreshToken = user.reset_password_token;
    let refreshTokenExpires = user.reset_password_expires;
    
    if (!refreshToken || !refreshTokenExpires || new Date(refreshTokenExpires) <= new Date()) {
      refreshToken = crypto.randomBytes(32).toString("hex");
      refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Update user with new refresh token
      await pool.query(
        "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
        [refreshToken, refreshTokenExpires, user.id]
      );
    }

    // Generate JWT token
    const access_token = this.generateToken(user.id, user.email, user.role_id);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return { 
      user: userWithoutPassword, 
      access_token,
      refresh_token: refreshToken,
      refresh_token_expires: refreshTokenExpires
    };
  }

  async forgotPassword(
    forgotPasswordData: ForgotPasswordRequest
  ): Promise<void> {
    const result = await pool.query(
      "SELECT id, fullname, email FROM users WHERE email = $1",
      [forgotPasswordData.email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not
      return;
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token
    await pool.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
      [resetToken, resetExpires, user.id]
    );

    // Send reset email
    await EmailService.sendPasswordResetEmail(
      user.email,
      user.fullname,
      resetToken
    );
  }

  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    const result = await pool.query(
      "SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
      [resetData.token]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid or expired reset token");
    }

    const user = result.rows[0];

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(resetData.password, saltRounds);

    // Update password and clear reset token
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
      [passwordHash, user.id]
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const result = await pool.query(
      "SELECT id FROM users WHERE email_verification_token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid verification token");
    }

    const user = result.rows[0];

    await pool.query(
      "UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL WHERE id = $1",
      [user.id]
    );
  }

  async getUserWithPermissions(
    userId: number
  ): Promise<RoleWithPermissions | null> {
    const result = await pool.query(
      `
      SELECT u.id, u.fullname, u.email, u.role_id, r.name as role_name, r.description as role_description,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', p.id,
                   'entity', p.entity,
                   'action', p.action,
                   'description', p.description
                 )
               ) FILTER (WHERE p.id IS NOT NULL), 
               '[]'
             ) as permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id, u.fullname, u.email, u.role_id, r.name, r.description
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.role_id,
      name: row.role_name,
      description: row.role_description,
      created_at: new Date(),
      permissions: row.permissions,
    };
  }

  generateToken(userId: number, email: string, roleId: number): string {
    const payload = { userId, email, roleId };
    const options: any = { expiresIn: this.jwtExpiresIn };
    return jwt.sign(payload, this.jwtSecret, options);
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}

export default new AuthService();
