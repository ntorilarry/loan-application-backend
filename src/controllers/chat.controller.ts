import { Response } from "express";
import Prompt from "../models/prompt.model";
import { AuthRequest } from "../models/auth.model";
import { ChatHistory, Tag } from "../models/chat.model";
import { pipeline } from "@xenova/transformers";
import { getEmbedding } from "../utils/embeddings";

function cosineSim(a: number[], b: number[]) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

export const chatWithPrompt = async (req: AuthRequest, res: Response) => {
  const { message, tagId } = req.body;
  const requester = req.user;

  if (!requester) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Generate embedding for user message
    const queryVector = await getEmbedding(message);

    // Fetch all prompts (could optimize later w/ vector DB)
    const prompts = await Prompt.find();

    let bestPrompt = null;
    let bestScore = -1;

    for (const p of prompts) {
      if (!p.embedding || p.embedding.length === 0) continue;
      const score = cosineSim(queryVector, p.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestPrompt = p;
      }
    }

    // Handle tag creation or retrieval
    let tag;
    if (tagId) {
      tag = await Tag.findById(tagId);
      if (!tag) return res.status(404).json({ error: "Tag not found" });
    } else {
      tag = await Tag.findOne({ name: message });
      if (!tag) {
        tag = await Tag.create({ name: message });
      }
    }

    // Decide reply
    let reply = "Sorry, I don’t understand that yet.";
    let titles: string[] | null = null;

    if (bestPrompt) {
      reply = bestPrompt.content;
      titles = prompts.map((p) => p.title);
    }

    // Save chat history
    await ChatHistory.create({
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

export const getChatHistoryByTag = async (req: AuthRequest, res: Response) => {
  const { tagId } = req.params;

  const history = await ChatHistory.find({ tagId });
  res.json(history);
};

// Delete chat history by tag
export const deleteChatHistoryByTag = async (
  req: AuthRequest,
  res: Response
) => {
  const { tagId } = req.params;
  const requester = req.user;

  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // delete chat histories linked to this tag
    const chatResult = await ChatHistory.deleteMany({
      userId: requester.id,
      tagId,
    });

    // delete the tag itself
    const tagResult = await Tag.deleteOne({
      _id: tagId,
      createdBy: requester.id,
    });

    res.json({
      message: "Deleted successfully",
      deletedChats: chatResult.deletedCount,
      deletedTag: tagResult.deletedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
