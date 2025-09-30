import { execSync } from "child_process"
import fs from "fs"
import path from "path"

async function setupProject() {
  console.log("🚀 Setting up Loan Management System...\n")

  try {
    // Create logs directory
    const logsDir = path.join(process.cwd(), "logs")
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
      console.log("📁 Created logs directory")
    }

    // Check if .env file exists
    const envPath = path.join(process.cwd(), ".env")
    const envExamplePath = path.join(process.cwd(), ".env.example")

    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath)
      console.log("📄 Created .env file from .env.example")
      console.log("⚠️  Please update the .env file with your actual configuration values")
    }

    // Run database migration
    console.log("\n📊 Running database migration...")
    execSync("npm run migrate", { stdio: "inherit" })

    // Run database seeding
    console.log("\n🌱 Seeding database with default data...")
    execSync("ts-node src/scripts/seed-database.ts", { stdio: "inherit" })

    console.log("\n✅ Setup completed successfully!")
    console.log("\n🎯 Next steps:")
    console.log("1. Update your .env file with actual configuration values")
    console.log("2. Configure your AWS SES credentials for email functionality")
    console.log('3. Run "npm run dev" to start the development server')
    console.log("4. Visit http://localhost:3000/api-docs for API documentation")
  } catch (error) {
    console.error("❌ Setup failed:", error)
    process.exit(1)
  }
}

// Run setup if called directly
if (require.main === module) {
  setupProject()
}

export default setupProject
