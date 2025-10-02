import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Function to create database configuration
function createDatabaseConfig() {
  // Check if DATABASE_URL is provided (production environment)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  // Use individual environment variables (local development)
  const requiredEnvVars = [
    "DB_HOST",
    "DB_PORT", 
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_NAME",
  ] as const;

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    const message = `Missing required environment variables: ${missingEnvVars.join(", ")}. Please set them in your .env file or provide DATABASE_URL for production.`;
    throw new Error(message);
  }

  const dbPasswordEnv = process.env.DB_PASSWORD as string;

  if (typeof dbPasswordEnv !== "string") {
    throw new Error("DB_PASSWORD must be a string");
  }

  return {
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USERNAME,
    password: String(dbPasswordEnv),
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(createDatabaseConfig());

export default pool;
