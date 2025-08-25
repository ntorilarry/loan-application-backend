// server.ts (or app.ts)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import promptRoutes from "./routes/prompt.routes";
import chatRoutes from "./routes/chat.routes";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./data/swagger.json";
import { connectDB } from "./services/mongo";
import cookieParser from "cookie-parser";
import { loadEmbedder } from "./utils/embeddings";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  await connectDB();
  await loadEmbedder();

  app.use("/api/auth", authRoutes);
  app.use("/api/prompts", promptRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Start app
startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
