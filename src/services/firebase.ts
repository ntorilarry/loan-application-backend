// services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config (use your real values from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBmbB24nU2P5_-tySDRWAxquyDxSyBk8w4",
  authDomain: "ai-prompt-23894.firebaseapp.com",
  projectId: "ai-prompt-23894",
  storageBucket: "ai-prompt-23894.firebasestorage.app",
  messagingSenderId: "980476418048",
  appId: "1:980476418048:web:51ec1ec20b1478b8a820e5"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
