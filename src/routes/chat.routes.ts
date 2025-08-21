
import express from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { chatWithPrompt, getChatHistoryByTag, listTags } from "../controllers/chat.controller";


const router = express.Router();

router.use(requireAuth);

// Chat interaction
router.post("/", chatWithPrompt);
router.get("/tags", listTags);
router.get("/tags/:tagId/history", getChatHistoryByTag);

export default router;
