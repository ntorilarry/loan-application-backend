import express from "express";
import {
  createPrompt,
  getUserPrompts,
  updatePrompt,
  deletePrompt,
} from "../controllers/prompt.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(requireAuth);

router.post("/", createPrompt);
router.get("/", getUserPrompts);
router.put("/:id", updatePrompt);
router.delete("/:id", deletePrompt);

export default router;
