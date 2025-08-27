import express from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  chatWithPrompt,
  deleteChatHistoryByTag,
  getChatHistoryByTag,
  listTags,
} from "../controllers/chat.controller";

const router = express.Router();

router.use(requireAuth);

// Chat interaction
router.post("/:userId", chatWithPrompt);
router.get("/tags/:userId", listTags);
router.get("/chat-history/:userId/:tagId", getChatHistoryByTag);
router.delete("/chat-history/:userId/:tagId", deleteChatHistoryByTag);

export default router;
