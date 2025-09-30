import type { Request, Response } from "express"
import pool from "../database/connection"
import type { AuthenticatedRequest } from "../common/types"
import { logSystemActivity } from "../middlewares/logger.middleware"

class RoleController {
  async getAllRoles(req: Request, res: Response) {
    try {
      const result = await pool.query(`
        SELECT r.id, r.name, r.description, r.created_at,
               COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id
        GROUP BY r.id, r.name, r.description, r.created_at
        ORDER BY r.name
      `)

      res.json({
        success: true,
        message: "Roles retrieved successfully",
        data: result.rows,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve roles",
      })
    }
  }

  async getRoleById(req: Request, res: Response) {
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        SELECT r.id, r.name, r.description, r.created_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', p.id,
                     'entity', p.entity,
                     'action', p.action,
                     'description', p.description
                   )
                 ) FILTER (WHERE p.id IS NOT NULL), 
                 '[]'
               ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.id = $1
        GROUP BY r.id, r.name, r.description, r.created_at
      `,
        [id],
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        })
      }

      res.json({
        success: true,
        message: "Role retrieved successfully",
        data: result.rows[0],
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve role",
      })
    }
  }

  async createRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description } = req.body

      // Check if role already exists
      const existingRole = await pool.query("SELECT id FROM roles WHERE name = $1", [name])
      if (existingRole.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Role with this name already exists",
        })
      }

      const result = await pool.query(
        "INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at",
        [name, description],
      )

      const role = result.rows[0]

      await logSystemActivity(
        req.user?.id,
        "Role created",
        "Role",
        role.id,
        { name: role.name, created_by: req.user?.email },
        req,
      )

      res.status(201).json({
        success: true,
        message: "Role created successfully",
        data: role,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create role",
      })
    }
  }

  async updateRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { name, description } = req.body

      // Check if role exists
      const existingRole = await pool.query("SELECT name FROM roles WHERE id = $1", [id])
      if (existingRole.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        })
      }

      // Check if new name conflicts with existing role
      if (name) {
        const nameConflict = await pool.query("SELECT id FROM roles WHERE name = $1 AND id != $2", [name, id])
        if (nameConflict.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Role with this name already exists",
          })
        }
      }

      const result = await pool.query(
        "UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING id, name, description, created_at",
        [name, description, id],
      )

      await logSystemActivity(
        req.user?.id,
        "Role updated",
        "Role",
        Number.parseInt(id),
        { name: result.rows[0].name, updated_by: req.user?.email },
        req,
      )

      res.json({
        success: true,
        message: "Role updated successfully",
        data: result.rows[0],
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update role",
      })
    }
  }

  async deleteRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params

      // Check if role has assigned users
      const usersWithRole = await pool.query("SELECT COUNT(*) FROM users WHERE role_id = $1", [id])
      if (Number.parseInt(usersWithRole.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete role with assigned users",
        })
      }

      const result = await pool.query("DELETE FROM roles WHERE id = $1 RETURNING name", [id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        })
      }

      await logSystemActivity(
        req.user?.id,
        "Role deleted",
        "Role",
        Number.parseInt(id),
        { name: result.rows[0].name, deleted_by: req.user?.email },
        req,
      )

      res.json({
        success: true,
        message: "Role deleted successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete role",
      })
    }
  }

  async getRolePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        SELECT p.id, p.entity, p.action, p.description
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.entity, p.action
      `,
        [id],
      )

      res.json({
        success: true,
        message: "Role permissions retrieved successfully",
        data: result.rows,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve role permissions",
      })
    }
  }

  async assignPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { permission_ids } = req.body

      const client = await pool.connect()
      try {
        await client.query("BEGIN")

        // Check if role exists
        const roleExists = await client.query("SELECT name FROM roles WHERE id = $1", [id])
        if (roleExists.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Role not found",
          })
        }

        // Remove existing permissions for this role
        await client.query("DELETE FROM role_permissions WHERE role_id = $1", [id])

        // Add new permissions
        for (const permissionId of permission_ids) {
          await client.query(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [id, permissionId],
          )
        }

        await client.query("COMMIT")

        await logSystemActivity(
          req.user?.id,
          "Role permissions updated",
          "Role",
          Number.parseInt(id),
          { role_name: roleExists.rows[0].name, permission_count: permission_ids.length, updated_by: req.user?.email },
          req,
        )

        res.json({
          success: true,
          message: "Permissions assigned successfully",
        })
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to assign permissions",
      })
    }
  }

  async removePermission(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, permissionId } = req.params

      const result = await pool.query(
        "DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING *",
        [id, permissionId],
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Role permission assignment not found",
        })
      }

      await logSystemActivity(
        req.user?.id,
        "Permission removed from role",
        "Role",
        Number.parseInt(id),
        { permission_id: Number.parseInt(permissionId), removed_by: req.user?.email },
        req,
      )

      res.json({
        success: true,
        message: "Permission removed successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to remove permission",
      })
    }
  }
}

export default new RoleController()
