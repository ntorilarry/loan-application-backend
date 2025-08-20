import express from "express";
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  resetPassword,
  signup,
  verifyEmail,
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

export default router;
