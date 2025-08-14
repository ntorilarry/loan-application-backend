import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../models/auth.model";
import { adminDb } from "../services/firebaseAdmin";

// Create Prompt
export const createPrompt = async (req: AuthRequest, res: Response) => {
  const { title, content, userId } = req.body;
  const requester = req.user;

  if (!requester?.uid) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }

  const targetUserId = userId || requester.uid;

  if (userId && userId !== requester.uid && requester.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: only admins can assign userId" });
  }

  const newId = uuidv4();

  try {
    await adminDb.collection("prompts").doc(newId).set({
      id: newId,
      title,
      content,
      userId: targetUserId,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    res.status(201).json({ id: newId, title, content, userId: targetUserId });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Get User Prompts
export const getUserPrompts = async (req: AuthRequest, res: Response) => {
  const {
    page = 1,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
    userId,
  } = req.query as any;

  const requestingUser = req.user;
  const filterUserId = userId || requestingUser?.uid;

  if (!filterUserId) {
    return res.status(401).json({ error: "Unauthorized: user not found" });
  }

  try {
    let queryRef = adminDb
      .collection("prompts")
      .where("userId", "==", filterUserId);

    if (search) {
      // Firestore doesn't have ILIKE; you'd store lowercase titles for search
      queryRef = queryRef
        .where("title", ">=", search)
        .where("title", "<=", search + "\uf8ff");
    }

    const snapshot = await queryRef.get();

    const allData = snapshot.docs.map((doc) => doc.data());
    // Manual sorting + pagination
    const sorted = allData.sort((a: any, b: any) =>
      sortOrder === "asc"
        ? a[sortBy]?.localeCompare(b[sortBy])
        : b[sortBy]?.localeCompare(a[sortBy])
    );

    const start = (Number(page) - 1) * Number(size);
    const paginated = sorted.slice(start, start + Number(size));

    res.json({
      data: paginated,
      meta: {
        total: allData.length,
        page: Number(page),
        size: Number(size),
        totalPages: Math.ceil(allData.length / Number(size)),
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Update Prompt
export const updatePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    await adminDb.collection("prompts").doc(id).update({
      title,
      content,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: "Updated successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete Prompt
export const deletePrompt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await adminDb.collection("prompts").doc(id).delete();
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
