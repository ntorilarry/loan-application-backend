import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import promptRoutes from "./routes/prompt.routes";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./data/swagger.json";
import { connectDB } from "./services/mongo";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
