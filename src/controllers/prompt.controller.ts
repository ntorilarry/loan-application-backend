// controllers/prompt.controller.ts
import { Response } from "express";
import Prompt from "../models/prompt.model";
import { AuthRequest } from "../models/auth.model";

// Create Prompt
export const createPrompt = async (req: AuthRequest, res: Response) => {
  const { title, content, userId } = req.body;
  const requester = req.user;

  if (!requester) return res.status(401).json({ error: "Unauthorized" });

  const targetUserId = userId || requester.id;

  if (userId && userId !== requester.id && requester.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: only admins can assign userId" });
  }

  try {
    const prompt = await Prompt.create({
      title,
      content,
      userId: targetUserId,
    });

    res.status(201).json(prompt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Get User Prompts
export const getUserPrompts = async (req: AuthRequest, res: Response) => {
  const { page = 1, size = 10, search = "" } = req.query as any;
  const requester = req.user;

  if (!requester) return res.status(401).json({ error: "Unauthorized" });

  try {
    let query: any = { userId: requester.id };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const total = await Prompt.countDocuments(query);
    const prompts = await Prompt.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(size))
      .limit(Number(size));

    res.json({
      data: prompts,
      meta: {
        total,
        page: Number(page),
        size: Number(size),
        totalPages: Math.ceil(total / Number(size)),
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Update Prompt
export const updatePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    await Prompt.findByIdAndUpdate(id, {
      title,
      content,
      updatedAt: new Date(),
    });
    res.json({ message: "Updated successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete Prompt
export const deletePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await Prompt.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
