import mongoose, { Schema, Document } from "mongoose";

export interface IPrompt extends Document {
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date | null;
  embedding?: number[];
}

const PromptSchema = new Schema<IPrompt>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  embedding: { type: [Number], default: [] },
});

export default mongoose.model<IPrompt>("Prompt", PromptSchema);
