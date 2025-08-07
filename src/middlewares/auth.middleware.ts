import { Request, Response, NextFunction } from "express";
import { supabase } from "../services/superbase";
import { AuthRequest } from "../models/auth.model";

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user)
    return res.status(401).json({ error: "Invalid token" });

  req.user = data.user;
  next();
};
