import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables to avoid cryptic driver errors
const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_NAME",
] as const;

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  const message = `Missing required environment variables: ${missingEnvVars.join(", ")}. Please set them in your .env file.`;
  // Throwing early results in a clear startup error instead of SASL errors later
  throw new Error(message);
}

const dbPasswordEnv = process.env.DB_PASSWORD as string;

if (typeof dbPasswordEnv !== "string") {
  throw new Error("DB_PASSWORD must be a string");
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USERNAME,
  password: String(dbPasswordEnv),
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
