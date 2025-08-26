import { Response } from "express";
import Prompt from "../models/prompt.model";
import { AuthRequest } from "../models/auth.model";
import { ChatHistory, Tag } from "../models/chat.model";
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
    // Step 1: Embed user query
    const queryVector = await getEmbedding(message);

    // Step 2: Fetch prompts (in future: replace with vector DB query)
    const prompts = await Prompt.find();

    // Step 3: Score prompts
    let scoredPrompts = [];
    for (const p of prompts) {
      if (!p.embedding || p.embedding.length === 0) continue;

      const semanticScore = cosineSim(queryVector, p.embedding);

      // Keyword overlap bonus (simple TF check)
      const keywordOverlap = p.title
        .split(" ")
        .filter((word: string) =>
          message.toLowerCase().includes(word.toLowerCase())
        ).length;

      // Weighted scoring (70% semantic, 30% keyword overlap)
      const totalScore = semanticScore * 0.7 + keywordOverlap * 0.3;

      scoredPrompts.push({ prompt: p, score: totalScore });
    }

    // Step 4: Sort by score
    scoredPrompts.sort((a, b) => b.score - a.score);

    // Step 5: Confidence threshold
    const bestMatch = scoredPrompts[0];
    let reply = "Sorry, I don’t understand that yet.";
    let candidateTitles: string[] | null = null;

    if (bestMatch && bestMatch.score > 0.65) {
      reply = bestMatch.prompt.content;
      candidateTitles = scoredPrompts.slice(0, 3).map((p) => p.prompt.title); // top-3 suggestions
    }

    // Step 6: Contextual memory — use last N chats in this tag
    let historyContext: string[] = [];
    if (tagId) {
      const pastChats = await ChatHistory.find({ tagId })
        .sort({ createdAt: -1 })
        .limit(3);

      historyContext = pastChats.map((c) => `${c.message} → ${c.reply}`);
    }

    // If reply is still generic, enhance with context
    if (reply.startsWith("Sorry") && historyContext.length > 0) {
      reply = `I'm not fully sure, but based on our past conversation: ${historyContext.join(
        " | "
      )}`;
    }

    // Step 7: Tag handling
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

    // Step 8: Save chat history
    await ChatHistory.create({
      userId: requester.id,
      message,
      reply,
      prompts: candidateTitles || [],
      tagId: tag._id,
    });

    // Final response
    res.json({
      message,
      reply,
      prompts: candidateTitles,
      tag: { id: tag._id, name: tag.name },
      confidence: bestMatch?.score || 0,
      historyUsed: historyContext.length > 0,
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

// Delete tag and its associated chat history
export const deleteChatHistoryByTag = async (
  req: AuthRequest,
  res: Response
) => {
  const { tagId } = req.params;
  const requester = req.user;

  if (!requester) return res.status(401).json({ error: "Unauthorized" });

  try {
    // First check if tag exists
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    // Delete all chat history associated with this tag
    await ChatHistory.deleteMany({ tagId });

    // Delete the tag itself
    await Tag.findByIdAndDelete(tagId);

    res.json({
      message: "Tag and associated chat history deleted successfully",
      deletedTag: { id: tag._id, name: tag.name },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
