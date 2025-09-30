import type { Request, Response, NextFunction } from "express"
import winston from "winston"
import pool from "../database/connection"

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "loan-management-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
})

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  )
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on("finish", () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    })
  })

  next()
}

export const logSystemActivity = async (
  userId: number | undefined,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: any,
  req?: Request,
) => {
  try {
    await pool.query(
      `INSERT INTO system_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        action,
        entityType || null,
        entityId || null,
        details ? JSON.stringify(details) : null,
        req?.ip || null,
        req?.get("User-Agent") || null,
      ],
    )
  } catch (error) {
    logger.error("Failed to log system activity:", error)
  }
}

export default logger
