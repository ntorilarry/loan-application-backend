import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Function to create database configuration
function createDatabaseConfig() {
  // Production environment: use DATABASE_URL
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when NODE_ENV=production');
    }
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  // Local development: use individual environment variables
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
