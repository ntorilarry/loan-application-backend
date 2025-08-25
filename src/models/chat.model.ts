import mongoose, { Schema, Document } from "mongoose";

export interface ITag extends Document {
  name: string;
  createdAt: Date;
}

const TagSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const Tag = mongoose.model<ITag>("Tag", TagSchema);

export interface IChatHistory extends Document {
  userId: string;
  message: string;
  reply: string;
  prompts: string[];
  tagId?: string;
  createdAt: Date;
}

const ChatHistorySchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    message: { type: String, required: true },
    reply: { type: String, required: true },
    prompts: [{ type: String }],
    tagId: { type: Schema.Types.ObjectId, ref: "Tag" },
  },
  { timestamps: true }
);

export const ChatHistory = mongoose.model<IChatHistory>(
  "ChatHistory",
  ChatHistorySchema
);
