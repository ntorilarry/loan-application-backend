import { Request, Response } from "express";
import { supabase } from "../services/superbase";

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "/verify-email",
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({
    message: "Signup successful. Please check your email to verify your account.",
    user: data.user,
  });
};


export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ session: data.session, user: data.user });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://your-frontend.com/reset-password",
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ message: "Password reset email sent" });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { accessToken, newPassword } = req.body;

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ message: "Password updated" });
};
