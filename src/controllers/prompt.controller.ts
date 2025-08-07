import { Response } from "express"; // ✅ import custom type
import { supabase } from "../services/superbase";
import { AuthRequest } from "../models/auth.model";

export const createPrompt = async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;
  const user = req.user;

  if (!user || !user.id) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }

  const { data, error } = await supabase
    .from("prompts")
    .insert([{ title, content, user_id: user.id }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data[0]);
};

export const getUserPrompts = async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user || !user.id) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("user_id", user.id);

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
};

export const updatePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;

  const { data, error } = await supabase
    .from("prompts")
    .update({ title, content })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data[0]);
};

export const deletePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase.from("prompts").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(204).send();
};
