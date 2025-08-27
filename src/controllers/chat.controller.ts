import { Response } from "express";
import Prompt from "../models/prompt.model";
import { AuthRequest } from "../models/auth.model";
import { ChatHistory, Tag } from "../models/chat.model";
import { getEmbedding } from "../utils/embeddings";

function calculateSimilarity(
  a: number[],
  b: number[]
): { cosine: number; euclidean: number; manhattan: number } {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let euclideanDistance = 0;
  let manhattanDistance = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
    euclideanDistance += Math.pow(a[i] - b[i], 2);
    manhattanDistance += Math.abs(a[i] - b[i]);
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  euclideanDistance = Math.sqrt(euclideanDistance);

  const maxPossibleDistance = Math.sqrt(a.length * 4);
  const euclideanSimilarity = 1 - euclideanDistance / maxPossibleDistance;

  return {
    cosine: dotProduct / (normA * normB),
    euclidean: euclideanSimilarity,
    manhattan: 1 - manhattanDistance / (a.length * 2),
  };
}

function analyzeKeywords(
  query: string,
  title: string,
  content: string
): {
  titleMatch: number;
  contentMatch: number;
  exactMatches: number;
  partialMatches: number;
} {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const titleWords = title.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);

  let titleMatch = 0;
  let contentMatch = 0;
  let exactMatches = 0;
  let partialMatches = 0;

  queryWords.forEach((queryWord) => {
    if (titleWords.includes(queryWord)) {
      titleMatch += 2;
      exactMatches++;
    }
    if (contentWords.includes(queryWord)) {
      contentMatch += 1;
      exactMatches++;
    }

    const titlePartial = titleWords.some(
      (word) => word.includes(queryWord) || queryWord.includes(word)
    );
    const contentPartial = contentWords.some(
      (word) => word.includes(queryWord) || queryWord.includes(word)
    );

    if (titlePartial) {
      titleMatch += 1;
      partialMatches++;
    }
    if (contentPartial) {
      contentMatch += 0.5;
      partialMatches++;
    }
  });

  return {
    titleMatch: titleMatch / (queryWords.length * 2),
    contentMatch: contentMatch / (queryWords.length * 1.5),
    exactMatches,
    partialMatches,
  };
}

function cleanReplyText(reply: string): string {
  return reply
    .replace(/^Based on our conversation:/i, "")
    .replace(/^I'm not fully sure.*?:/i, "")
    .trim();
}

async function generateContextAwareResponse(
  baseReply: string,
  historyContext: string[],
  currentTag: any,
  userMessage: string
): Promise<string> {
  if (!baseReply.startsWith("I'm not sure")) {
    return baseReply;
  }

  if (historyContext.length === 0) {
    return baseReply;
  }

  const recentReplies = historyContext
    .slice(0, 2)
    .map((ctx) => {
      const parts = ctx.split(" → ");
      return parts.length > 1 ? cleanReplyText(parts[1]) : "";
    })
    .filter(Boolean);

  const lastReply = recentReplies[0];
  const isFollowUp = /what about|and what|also|more about|tell me more/i.test(
    userMessage
  );

  if (isFollowUp && lastReply) {
    return `Building on our last discussion: ${lastReply}. Could you clarify a bit more so I can help?`;
  }

  if (recentReplies.length > 0) {
    return `We’ve been discussing ${recentReplies.join(
      " and "
    )}. Could you rephrase your question so I can give a clearer answer?`;
  }

  return baseReply;
}

// Confidence scoring with multiple factors
function calculateConfidenceScore(
  semanticScore: number,
  keywordScore: number,
  historyRelevance: number,
  queryLength: number
): number {
  const isComplexQuery = queryLength > 5;

  const weights = isComplexQuery
    ? { semantic: 0.6, keyword: 0.3, history: 0.1 }
    : { semantic: 0.5, keyword: 0.4, history: 0.1 };

  return (
    semanticScore * weights.semantic +
    keywordScore * weights.keyword +
    historyRelevance * weights.history
  );
}

export const chatWithPrompt = async (req: AuthRequest, res: Response) => {
  const { message, tagId } = req.body;
  const { userId } = req.params;

  if (!userId) return res.status(401).json({ error: "User ID required" });

  try {
    const queryVector = await getEmbedding(message);

    const prompts = await Prompt.find({
      embedding: { $exists: true, $ne: [] },
    });

    if (prompts.length === 0) {
      return res.status(404).json({ error: "No prompts available" });
    }

    let scoredPrompts = [];
    for (const p of prompts) {
      if (!p.embedding || p.embedding.length === 0) continue;

      const similarities = calculateSimilarity(queryVector, p.embedding);
      const keywordAnalysis = analyzeKeywords(message, p.title, p.content);

      const semanticScore =
        similarities.cosine * 0.6 +
        similarities.euclidean * 0.3 +
        similarities.manhattan * 0.1;
      const keywordScore =
        keywordAnalysis.titleMatch * 0.7 + keywordAnalysis.contentMatch * 0.3;

      const totalScore = calculateConfidenceScore(
        semanticScore,
        keywordScore,
        0,
        message.split(" ").length
      );

      scoredPrompts.push({
        prompt: p,
        score: totalScore,
        metrics: {
          semantic: semanticScore,
          keyword: keywordScore,
          exactKeywords: keywordAnalysis.exactMatches,
          partialKeywords: keywordAnalysis.partialMatches,
        },
      });
    }

    scoredPrompts.sort((a, b) => b.score - a.score);
    const topCandidates = scoredPrompts.slice(0, 5);

    let historyContext: string[] = [];
    let historyRelevance = 0;

    if (tagId) {
      const pastChats = await ChatHistory.find({ tagId, userId: userId })
        .sort({ createdAt: -1 })
        .limit(5);

      historyContext = pastChats.map((c) => `${c.message} → ${c.reply}`);

      if (pastChats.length > 0) {
        const recentMessages = pastChats.map((c) => c.message).join(" ");
        const historyVector = await getEmbedding(recentMessages);
        const historySimilarity = calculateSimilarity(
          queryVector,
          historyVector
        );
        historyRelevance = historySimilarity.cosine;
      }
    }

    const bestMatch = topCandidates[0];
    const confidenceThreshold = historyRelevance > 0.7 ? 0.55 : 0.65;

    let reply =
      "I'm not sure how to respond to that. Could you provide more context or rephrase your question?";
    let candidateTitles: string[] = [];
    let usedHistory = false;

    if (bestMatch && bestMatch.score > confidenceThreshold) {
      reply = bestMatch.prompt.content;
      candidateTitles = topCandidates.slice(0, 3).map((p) => p.prompt.title);
    }

    let tag;
    if (tagId) {
      tag = await Tag.findOne({ _id: tagId, userId: userId });
      if (!tag) {
        tag = await Tag.create({
          name: message.substring(0, 50),
          userId: userId,
        });
      }
    } else {
      const potentialTagName =
        bestMatch?.score > 0.5
          ? bestMatch.prompt.title
          : message.split(" ").slice(0, 3).join(" ");

      tag = await Tag.findOne({
        name: { $regex: potentialTagName, $options: "i" },
        userId: userId,
      });
      if (!tag) {
        tag = await Tag.create({
          name: potentialTagName,
          userId: userId,
        });
      }
    }

    const enhancedReply = await generateContextAwareResponse(
      reply,
      historyContext,
      tag,
      message
    );

    if (enhancedReply !== reply) {
      usedHistory = true;
      reply = enhancedReply;
    }

    let finalConfidence = bestMatch?.score || 0;
    if (usedHistory && historyRelevance > 0) {
      finalConfidence = calculateConfidenceScore(
        bestMatch?.metrics.semantic || 0,
        bestMatch?.metrics.keyword || 0,
        historyRelevance,
        message.split(" ").length
      );
    }

    await ChatHistory.create({
      userId: userId,
      message,
      reply: enhancedReply,
      prompts: candidateTitles,
      tagId: tag._id,
      metadata: {
        confidence: finalConfidence,
        semanticScore: bestMatch?.metrics.semantic,
        keywordScore: bestMatch?.metrics.keyword,
        historyUsed: usedHistory,
        historyRelevance,
      },
    });

    res.json({
      message,
      reply: enhancedReply,
      prompts: candidateTitles,
      tag: { id: tag._id, name: tag.name },
      confidence: finalConfidence,
      metrics: {
        semantic: bestMatch?.metrics.semantic,
        keyword: bestMatch?.metrics.keyword,
        exactKeywords: bestMatch?.metrics.exactKeywords,
        partialKeywords: bestMatch?.metrics.partialKeywords,
        historyRelevance,
      },
      historyUsed: usedHistory,
      context: historyContext.length > 0 ? historyContext.slice(0, 2) : [],
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({
      error: "I encountered an error processing your request",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const listTags = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  if (!userId) return res.status(401).json({ error: "User ID required" });

  const tags = await Tag.find({ userId: userId }).sort({ createdAt: -1 });
  res.json(tags);
};

export const getChatHistoryByTag = async (req: AuthRequest, res: Response) => {
  const { tagId, userId } = req.params;

  if (!userId) return res.status(401).json({ error: "User ID required" });

  const history = await ChatHistory.find({ tagId, userId: userId });
  res.json(history);
};

export const deleteChatHistoryByTag = async (
  req: AuthRequest,
  res: Response
) => {
  const { tagId, userId } = req.params;

  if (!userId) return res.status(401).json({ error: "User ID required" });

  try {
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }
    await ChatHistory.deleteMany({ tagId });
    await Tag.findByIdAndDelete(tagId);
    res.json({
      message: "Tag and associated chat history deleted successfully",
      deletedTag: { id: tag._id, name: tag.name },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
