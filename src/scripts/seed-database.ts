import pool from "../database/connection"
import bcrypt from "bcryptjs"

async function seedDatabase() {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    console.log("🌱 Seeding database...")

    // Check if owner user already exists
    const existingOwner = await client.query("SELECT id FROM users WHERE email = 'owner@loan.com'")

    if (existingOwner.rows.length === 0) {
      // Get Owner role ID
      const ownerRole = await client.query("SELECT id FROM roles WHERE name = 'Owner'")

      if (ownerRole.rows.length === 0) {
        throw new Error("Owner role not found. Please run database migration first.")
      }

      // Create owner user
      const passwordHash = await bcrypt.hash("Owner123!", 12)

      await client.query(
        `INSERT INTO users (fullname, email, phone, company_name, company_address, password_hash, role_id, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "System Owner",
          "owner@loan.com",
          "+1234567890",
          "Loan Management Company",
          "123 Business Street, City, Country",
          passwordHash,
          ownerRole.rows[0].id,
          true,
        ],
      )

      console.log("✅ Owner user created: owner@loan.com / Owner123!")
    } else {
      console.log("ℹ️  Owner user already exists")
    }

    // Create sample admin user
    const existingAdmin = await client.query("SELECT id FROM users WHERE email = 'admin@loan.com'")

    if (existingAdmin.rows.length === 0) {
      const adminRole = await client.query("SELECT id FROM roles WHERE name = 'Admin'")
      const passwordHash = await bcrypt.hash("Admin123!", 12)

      await client.query(
        `INSERT INTO users (fullname, email, phone, company_name, password_hash, role_id, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "System Administrator",
          "admin@loan.com",
          "+1234567891",
          "Loan Management Company",
          passwordHash,
          adminRole.rows[0].id,
          true,
        ],
      )

      console.log("✅ Admin user created: admin@loan.com / Admin123!")
    } else {
      console.log("ℹ️  Admin user already exists")
    }

    // Create sample users for different roles
    const sampleUsers = [
      {
        fullname: "Call Center Agent",
        email: "callcenter@loan.com",
        phone: "+1234567892",
        role: "Call Center",
        password: "CallCenter123!",
      },
      {
        fullname: "Sales Executive",
        email: "sales@loan.com",
        phone: "+1234567893",
        role: "Sales Executive",
        password: "Sales123!",
      },
      {
        fullname: "Credit Risk Analyst",
        email: "analyst@loan.com",
        phone: "+1234567894",
        role: "Credit Risk Analyst",
        password: "Analyst123!",
      },
      {
        fullname: "Loan Manager",
        email: "manager@loan.com",
        phone: "+1234567895",
        role: "Manager",
        password: "Manager123!",
      },
    ]

    for (const user of sampleUsers) {
      const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [user.email])

      if (existingUser.rows.length === 0) {
        const roleResult = await client.query("SELECT id FROM roles WHERE name = $1", [user.role])

        if (roleResult.rows.length > 0) {
          const passwordHash = await bcrypt.hash(user.password, 12)

          await client.query(
            `INSERT INTO users (fullname, email, phone, company_name, password_hash, role_id, is_email_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              user.fullname,
              user.email,
              user.phone,
              "Loan Management Company",
              passwordHash,
              roleResult.rows[0].id,
              true,
            ],
          )

          console.log(`✅ ${user.role} user created: ${user.email} / ${user.password}`)
        }
      }
    }

    // Insert default company settings
    const existingSettings = await client.query("SELECT id FROM company_settings LIMIT 1")

    if (existingSettings.rows.length === 0) {
      await client.query(
        `INSERT INTO company_settings (company_name, company_address, company_email, company_contact)
         VALUES ($1, $2, $3, $4)`,
        ["Loan Management Company", "123 Business Street, City, Country", "info@loan.com", "+1234567890"],
      )

      console.log("✅ Default company settings created")
    }

    await client.query("COMMIT")
    console.log("🎉 Database seeding completed successfully!")

    // Display login credentials
    console.log("\n📋 Default Login Credentials:")
    console.log("================================")
    console.log("Owner: owner@loan.com / Owner123!")
    console.log("Admin: admin@loan.com / Admin123!")
    console.log("Call Center: callcenter@loan.com / CallCenter123!")
    console.log("Sales Executive: sales@loan.com / Sales123!")
    console.log("Credit Risk Analyst: analyst@loan.com / Analyst123!")
    console.log("Manager: manager@loan.com / Manager123!")
    console.log("================================\n")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Database seeding failed:", error)
    throw error
  } finally {
    client.release()
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error)
      process.exit(1)
    })
}

export default seedDatabase
