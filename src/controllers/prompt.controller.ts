import { Response } from "express";
import { supabase } from "../services/superbase";
import { AuthRequest } from "../models/auth.model";
import { validate as isUuid } from "uuid";

export const createPrompt = async (req: AuthRequest, res: Response) => {
  const { title, content, userId } = req.body;
  const requester = req.user;

  if (!requester || !requester.id) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }
  const targetUserId = userId || requester.id;

  if (userId && userId !== requester.id && requester.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: only admins can assign userId" });
  }

  const { data, error } = await supabase
    .from("prompts")
    .insert([{ title, content, userId: targetUserId }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data[0]);
};

export const getUserPrompts = async (req: AuthRequest, res: Response) => {
  const {
    page = 1,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
    userId,
  } = req.query as {
    page?: string;
    size?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    userId?: string;
  };

  const limit = parseInt(String(size));
  const offset = (parseInt(String(page)) - 1) * limit;

  const requestingUser = req.user;
  const filterUserId = userId || requestingUser?.id;

  if (!filterUserId) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }

  const query = supabase
    .from("prompts")
    .select("*", { count: "exact" })
    .ilike("title", `%${search}%`)
    .eq("userId", filterUserId)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) return res.status(400).json({ error: error.message });

  return res.json({
    data,
    meta: {
      total: count,
      page: parseInt(String(page)),
      size: limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
};

export const updatePrompt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!isUuid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const { data, error } = await supabase
      .from("prompts")
      .update({ title, content })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    return res.json(data[0]);
  } catch (err) {
    console.error("Internal server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase.from("prompts").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(204).send();
};
