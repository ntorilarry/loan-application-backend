import { Router } from "express"
import RoleController from "../controllers/role.controller"
import { authenticate, authorize } from "../middlewares"
import { PERMISSIONS } from "../common/constants"
import { validate } from "../middlewares/validation.middleware"
import Joi from "joi"

const router = Router()

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).optional(),
})

const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(255).optional(),
})

const assignPermissionSchema = Joi.object({
  permission_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
})

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 */
router.get("/", authenticate, RoleController.getAllRoles)

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID with permissions
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 */
router.get("/:id", authenticate, RoleController.getRoleById)

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Role already exists or validation error
 */
router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.USERS_CREATE),
  validate(createRoleSchema),
  RoleController.createRole,
)

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update role
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.USERS_UPDATE),
  validate(updateRoleSchema),
  RoleController.updateRole,
)

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete role
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       400:
 *         description: Cannot delete role with assigned users
 */
router.delete("/:id", authenticate, authorize(PERMISSIONS.USERS_DELETE), RoleController.deleteRole)

/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   get:
 *     summary: Get role permissions
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role permissions retrieved successfully
 */
router.get("/:id/permissions", authenticate, RoleController.getRolePermissions)

/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   post:
 *     summary: Assign permissions to role
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission_ids
 *             properties:
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
 */
router.post(
  "/:id/permissions",
  authenticate,
  authorize(PERMISSIONS.USERS_UPDATE),
  validate(assignPermissionSchema),
  RoleController.assignPermissions,
)

/**
 * @swagger
 * /api/roles/{id}/permissions/{permissionId}:
 *   delete:
 *     summary: Remove permission from role
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Permission removed successfully
 */
router.delete(
  "/:id/permissions/:permissionId",
  authenticate,
  authorize(PERMISSIONS.USERS_UPDATE),
  RoleController.removePermission,
)

export default router
