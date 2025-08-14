import { Request, Response } from "express";
import { adminAuth, adminDb } from "../services/firebaseAdmin";
import { signInWithEmailAndPassword, confirmPasswordReset } from "firebase/auth";
import { auth } from "../services/firebase";

/**
 * Signup a new user
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    // Create user in Firebase Auth (Admin SDK)
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Save user in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role: "user",
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    res.status(201).json({
      message: "Signup successful. Please verify your email.",
      user: {
        uid: userRecord.uid,
        email,
        name,
        role: "user",
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Login a user
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const token = await user.getIdToken();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

/**
 * Send a password reset link to user's email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const link = await adminAuth.generatePasswordResetLink(email);
    // In production: Send `link` via email with Nodemailer, SendGrid, etc.

    res.status(200).json({
      message: "Password reset link generated",
      link, // Only include for testing — remove in production
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Reset password (only if you want custom in-app reset)
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { oobCode, newPassword } = req.body;

  if (!oobCode || !newPassword) {
    return res.status(400).json({ error: "Reset code and new password are required" });
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    res.status(200).json({ message: "Password reset successful" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
