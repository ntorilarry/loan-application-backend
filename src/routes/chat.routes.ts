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
router.post("/", chatWithPrompt);
router.get("/tags", listTags);
router.get("/chat-history/:tagId", getChatHistoryByTag);
router.delete("/chat-history/:tagId", deleteChatHistoryByTag);

export default router;
