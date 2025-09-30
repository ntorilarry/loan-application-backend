import type { Request, Response } from "express"
import pool from "../database/connection"
import type { AuthenticatedRequest } from "../common/types"
import { logSystemActivity } from "../middlewares/logger.middleware"

class PermissionController {
  async getAllPermissions(req: Request, res: Response) {
    try {
      const { entity } = req.query

      let query = `
        SELECT p.id, p.entity, p.action, p.description, p.created_at,
               COUNT(rp.role_id) as role_count
        FROM permissions p
        LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      `
      const queryParams: any[] = []

      if (entity) {
        query += " WHERE p.entity = $1"
        queryParams.push(entity)
      }

      query += " GROUP BY p.id, p.entity, p.action, p.description, p.created_at ORDER BY p.entity, p.action"

      const result = await pool.query(query, queryParams)

      res.json({
        success: true,
        message: "Permissions retrieved successfully",
        data: result.rows,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve permissions",
      })
    }
  }

  async getPermissionById(req: Request, res: Response) {
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        SELECT p.id, p.entity, p.action, p.description, p.created_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', r.id,
                     'name', r.name,
                     'description', r.description
                   )
                 ) FILTER (WHERE r.id IS NOT NULL), 
                 '[]'
               ) as roles
        FROM permissions p
        LEFT JOIN role_permissions rp ON p.id = rp.permission_id
        LEFT JOIN roles r ON rp.role_id = r.id
        WHERE p.id = $1
        GROUP BY p.id, p.entity, p.action, p.description, p.created_at
      `,
        [id],
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Permission not found",
        })
      }

      res.json({
        success: true,
        message: "Permission retrieved successfully",
        data: result.rows[0],
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve permission",
      })
    }
  }

  async createPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const { entity, action, description } = req.body

      // Check if permission already exists
      const existingPermission = await pool.query("SELECT id FROM permissions WHERE entity = $1 AND action = $2", [
        entity,
        action,
      ])
      if (existingPermission.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Permission with this entity and action already exists",
        })
      }

      const result = await pool.query(
        "INSERT INTO permissions (entity, action, description) VALUES ($1, $2, $3) RETURNING id, entity, action, description, created_at",
        [entity, action, description],
      )

      const permission = result.rows[0]

      await logSystemActivity(
        req.user?.id,
        "Permission created",
        "Permission",
        permission.id,
        { entity: permission.entity, action: permission.action, created_by: req.user?.email },
        req,
      )

      res.status(201).json({
        success: true,
        message: "Permission created successfully",
        data: permission,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create permission",
      })
    }
  }

  async updatePermission(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { entity, action, description } = req.body

      // Check if permission exists
      const existingPermission = await pool.query("SELECT entity, action FROM permissions WHERE id = $1", [id])
      if (existingPermission.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Permission not found",
        })
      }

      // Check if new entity/action conflicts with existing permission
      if (entity || action) {
        const newEntity = entity || existingPermission.rows[0].entity
        const newAction = action || existingPermission.rows[0].action

        const conflict = await pool.query("SELECT id FROM permissions WHERE entity = $1 AND action = $2 AND id != $3", [
          newEntity,
          newAction,
          id,
        ])
        if (conflict.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Permission with this entity and action already exists",
          })
        }
      }

      const result = await pool.query(
        "UPDATE permissions SET entity = COALESCE($1, entity), action = COALESCE($2, action), description = COALESCE($3, description) WHERE id = $4 RETURNING id, entity, action, description, created_at",
        [entity, action, description, id],
      )

      await logSystemActivity(
        req.user?.id,
        "Permission updated",
        "Permission",
        Number.parseInt(id),
        { entity: result.rows[0].entity, action: result.rows[0].action, updated_by: req.user?.email },
        req,
      )

      res.json({
        success: true,
        message: "Permission updated successfully",
        data: result.rows[0],
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update permission",
      })
    }
  }

  async deletePermission(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      // Check if permission is assigned to any roles
      const rolesWithPermission = await pool.query("SELECT COUNT(*) FROM role_permissions WHERE permission_id = $1", [
        id,
      ])
      if (Number.parseInt(rolesWithPermission.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete permission assigned to roles",
        })
      }

      const result = await pool.query("DELETE FROM permissions WHERE id = $1 RETURNING entity, action", [id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Permission not found",
        })
      }

      await logSystemActivity(
        req.user?.id,
        "Permission deleted",
        "Permission",
        Number.parseInt(id),
        { entity: result.rows[0].entity, action: result.rows[0].action, deleted_by: req.user?.email },
        req,
      )

      res.json({
        success: true,
        message: "Permission deleted successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete permission",
      })
    }
  }
}

export default new PermissionController()
