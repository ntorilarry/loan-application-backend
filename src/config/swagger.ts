import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import type { Express } from "express"

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Loan Management System API",
      version: "1.0.0",
      description:
        "A comprehensive loan management system with multi-phase workflow, role-based access control, and automated notifications.",
      contact: {
        name: "API Support",
        email: "lntori99@gmail.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://loan-application-backend-1-qz2o.onrender.com"
            : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === "production" ? "Production server" : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login endpoint",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            fullname: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            phone: { type: "string", example: "+1234567890" },
            company_name: { type: "string", example: "ABC Company" },
            company_address: { type: "string", example: "123 Main St, City" },
            is_email_verified: { type: "boolean", example: true },
            role_id: { type: "integer", example: 2 },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Role: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Admin" },
            description: { type: "string", example: "Administrator role with full access" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Client: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            fullname: { type: "string", example: "Jane Smith" },
            contact: { type: "string", example: "+1234567890" },
            email: { type: "string", format: "email", example: "jane@example.com" },
            location: { type: "string", example: "456 Oak St, City" },
            landmark: { type: "string", example: "Near the mall" },
            business: { type: "string", example: "Retail Store" },
            dob: { type: "string", format: "date", example: "1990-01-01" },
            marital_status: { type: "string", enum: ["single", "married", "divorced", "widowed"] },
            occupation: { type: "string", example: "Business Owner" },
            id_type: { type: "string", enum: ["Ghana Card", "Voters ID", "Passport"] },
            id_number: { type: "string", example: "GHA-123456789-0" },
            created_by: { type: "integer", example: 1 },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Loan: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            client_id: { type: "integer", example: 1 },
            requested_amount: { type: "number", format: "decimal", example: 10000.0 },
            approved_amount: { type: "number", format: "decimal", example: 8000.0 },
            loan_duration: { type: "integer", example: 12 },
            payment_mode: { type: "string", enum: ["weekly", "monthly"] },
            payment_schedule_start: { type: "string", format: "date" },
            status: {
              type: "string",
              enum: ["registration", "capturing", "approval", "disbursement", "active", "completed", "defaulted"],
            },
            phase: { type: "integer", enum: [1, 2, 3, 4] },
            registered_by: { type: "integer", example: 1 },
            captured_by: { type: "integer", example: 2 },
            approved_by: { type: "integer", example: 3 },
            disbursed_by: { type: "integer", example: 4 },
            registration_date: { type: "string", format: "date-time" },
            capturing_date: { type: "string", format: "date-time" },
            approval_date: { type: "string", format: "date-time" },
            disbursement_date: { type: "string", format: "date-time" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        LoanRepayment: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            loan_id: { type: "integer", example: 1 },
            amount: { type: "number", format: "decimal", example: 666.67 },
            payment_date: { type: "string", format: "date" },
            due_date: { type: "string", format: "date" },
            status: { type: "string", enum: ["pending", "paid", "overdue"] },
            received_by: { type: "integer", example: 1 },
            created_at: { type: "string", format: "date-time" },
          },
        },
        SystemLog: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            user_id: { type: "integer", example: 1 },
            action: { type: "string", example: "User logged in" },
            entity_type: { type: "string", example: "User" },
            entity_id: { type: "integer", example: 1 },
            details: { type: "object", example: { email: "user@example.com" } },
            ip_address: { type: "string", example: "192.168.1.1" },
            user_agent: { type: "string", example: "Mozilla/5.0..." },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation completed successfully" },
            data: { type: "object" },
            error: { type: "string" },
          },
        },
        PaginatedResponse: {
          type: "object",
          allOf: [
            { $ref: "#/components/schemas/ApiResponse" },
            {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                    total: { type: "integer", example: 100 },
                    totalPages: { type: "integer", example: 10 },
                  },
                },
              },
            },
          ],
        },
        ValidationError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation error" },
            error: { type: "string", example: "Email is required" },
          },
        },
        AuthError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Authentication required" },
          },
        },
        ForbiddenError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Insufficient permissions" },
          },
        },
        Permission: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            entity: { type: "string", example: "Users" },
            action: { type: "string", example: "CanCreate" },
            description: { type: "string", example: "Can create users" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
      responses: {
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" },
            },
          },
        },
        AuthError: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthError" },
            },
          },
        },
        ForbiddenError: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForbiddenError" },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Resource not found" },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Internal server error" },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and authorization endpoints",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      {
        name: "Roles & Permissions",
        description: "Role and permission management endpoints",
      },
      {
        name: "Loans",
        description: "Loan management and workflow endpoints",
      },
      {
        name: "Reports",
        description: "Reporting and analytics endpoints",
      },
      {
        name: "Dashboard",
        description: "Dashboard metrics and comprehensive statistics endpoints",
      },
      {
        name: "Settings",
        description: "System settings and configuration endpoints",
      },
      {
        name: "Notifications",
        description: "Email notifications and communication endpoints",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Path to the API files
}

const specs = swaggerJsdoc(options)

export const setupSwagger = (app: Express): void => {
  // Swagger UI setup
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #3b4151; font-size: 36px }
    `,
      customSiteTitle: "Loan Management System API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: "none",
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
      },
    }),
  )

  // JSON endpoint for the OpenAPI spec
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json")
    res.send(specs)
  })

  console.log(`📚 Swagger documentation available at http://localhost:${process.env.PORT || 3000}/api-docs`)
}

export default specs
