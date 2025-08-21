import express from "express";
import { requireAuth } from "../middlewares/auth.middleware";

import { chatWithPrompt } from "../controllers/chat.controller";
const router = express.Router();

router.use(requireAuth);

router.post("/", chatWithPrompt);

export default router;
