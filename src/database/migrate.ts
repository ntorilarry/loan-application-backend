import fs from "fs"
import path from "path"
import pool from "./connection"

async function runMigration() {
  try {
    console.log("Running database migration...")

    const schemaPath = path.join(__dirname, "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    await pool.query(schema)

    // Ensure new columns exist when using IF NOT EXISTS table creation
    await pool.query(
      'ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS tenant_schema VARCHAR(64)'
    )

    // Optional: run tenant template creation for existing users with tenant_schema
    // This can be extended to backfill tenants if needed.

    console.log("Database migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
