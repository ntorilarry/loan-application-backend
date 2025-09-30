import type { Response, NextFunction } from "express";
import AuthService from "../services/auth.service";
import type { AuthenticatedRequest } from "../common/types";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"] || req.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    // Get user permissions
    const userWithPermissions = await AuthService.getUserWithPermissions(
      decoded.userId
    );

    if (!userWithPermissions) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role_id: decoded.roleId,
      permissions: userWithPermissions.permissions.map(
        (p) => `${p.entity}.${p.action}`
      ),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const authorize = (requiredPermissions: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];
    const userPermissions = req.user.permissions || [];

    // Owner role has all permissions
    const hasOwnerRole = req.user.role_id === 1; // Assuming Owner role has ID 1

    const hasPermission =
      hasOwnerRole ||
      permissions.some((permission) => userPermissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const userWithRole = await AuthService.getUserWithPermissions(
        req.user.id
      );

      if (!userWithRole || !allowedRoles.includes(userWithRole.name)) {
        return res.status(403).json({
          success: false,
          message: "Access denied for your role",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error checking user role",
      });
    }
  };
};
