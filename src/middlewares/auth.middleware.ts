import { Response, NextFunction } from "express";
import { AuthRequest } from "../models/auth.model";
import { adminAuth } from "../services/firebaseAdmin";

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = {
      id: decoded.uid,
      email: decoded.email,
      app_metadata: {},
      user_metadata: {},
      created_at: decoded.auth_time
        ? new Date(decoded.auth_time * 1000).toISOString()
        : new Date().toISOString(),
      ...decoded,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
