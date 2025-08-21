// controllers/chat.controller.ts
import { Request, Response } from "express";
import Prompt from "../models/prompt.model";

export const chatWithPrompt = async (req: Request, res: Response) => {
  const { message } = req.body;

  try {
    // Find all prompts that match the message
    const prompts = await Prompt.find({
      title: { $regex: message, $options: "i" },
    });

    if (!prompts || prompts.length === 0) {
      return res.json({
        reply: "Sorry, I don’t understand that yet.",
        prompts: null,
      });
    }

    // Collect only prompt titles
    const titles = prompts.map((p) => p.title);

    res.json({
      reply: prompts[0].content, // first match is the reply
      prompts: titles, // just the titles
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
