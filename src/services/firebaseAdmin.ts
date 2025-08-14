// services/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or from JSON key
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
