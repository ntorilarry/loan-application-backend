// controllers/chat.controller.ts
import { Response } from "express";
import Prompt from "../models/prompt.model";
import { AuthRequest } from "../models/auth.model";
import { ChatHistory, Tag } from "../models/chat.model";

export const chatWithPrompt = async (req: AuthRequest, res: Response) => {
  const { message, tagId } = req.body;
  const requester = req.user;

  if (!requester) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Search prompts by title
    const prompts = await Prompt.find({
      title: { $regex: message, $options: "i" },
    });

    let tag;

    if (tagId) {
      // If tagId passed, just find the tag
      tag = await Tag.findById(tagId);
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }
    } else {
      // If no tagId, create/find based on message
      tag = await Tag.findOne({ name: message });
      if (!tag) {
        tag = await Tag.create({ name: message });
      }
    }

    let reply = "Sorry, I don’t understand that yet.";
    let titles: string[] | null = null;

    if (prompts && prompts.length > 0) {
      reply = prompts[0].content;
      titles = prompts.map((p) => p.title);
    }

    // Save chat history linked to tag
    const history = await ChatHistory.create({
      userId: requester.id,
      message,
      reply,
      prompts: titles || [],
      tagId: tag._id,
    });

    res.json({
      message,
      reply,
      prompts: titles,
      tag: { id: tag._id, name: tag.name },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listTags = async (req: AuthRequest, res: Response) => {
  const tags = await Tag.find().sort({ createdAt: -1 });
  res.json(tags);
};

// Get chat history by tag
export const getChatHistoryByTag = async (req: AuthRequest, res: Response) => {
  const { tagId } = req.params;

  const history = await ChatHistory.find({ tagId });
  res.json(history);
};
