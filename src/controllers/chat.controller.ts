// controllers/chat.controller.ts
import { Request, Response } from "express";
import Prompt from "../models/prompt.model";

export const chatWithPrompt = async (req: Request, res: Response) => {
  const { message } = req.body;

  try {
    const prompt = await Prompt.findOne({
      title: { $regex: message, $options: "i" },
    });

    if (!prompt) {
      return res.json({ reply: "Sorry, I don’t understand that yet." });
    }

    res.json({ reply: prompt.content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
