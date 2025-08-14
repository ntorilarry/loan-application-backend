import express from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  createPrompt,
  deletePrompt,
  getUserPrompts,
  updatePrompt,
} from "../controllers/prompt.controller";
const router = express.Router();

router.use(requireAuth);

router.post("/", createPrompt);
router.get("/", getUserPrompts);
router.put("/:id", updatePrompt);
router.delete("/:id", deletePrompt);

export default router;
