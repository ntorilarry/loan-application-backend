import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  userId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
