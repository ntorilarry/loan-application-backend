import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { AuthRequest } from "../models/auth.model";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
