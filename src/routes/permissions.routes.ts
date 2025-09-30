import { Router } from "express"
import PermissionController from "../controllers/permission.controller"
import { authenticate, authorize } from "../middlewares"
import { PERMISSIONS } from "../common/constants"
import { validate } from "../middlewares/validation.middleware"
import Joi from "joi"

const router = Router()

// Validation schemas
const createPermissionSchema = Joi.object({
  entity: Joi.string().min(2).max(100).required(),
  action: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).optional(),
})

const updatePermissionSchema = Joi.object({
  entity: Joi.string().min(2).max(100).optional(),
  action: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(255).optional(),
})

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Roles & Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter by entity
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
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
 *                     $ref: '#/components/schemas/Permission'
 */
router.get("/", authenticate, PermissionController.getAllPermissions)

/**
 * @swagger
 * /api/permissions/{id}:
 *   get:
 *     summary: Get permission by ID
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
 *         description: Permission retrieved successfully
 *       404:
 *         description: Permission not found
 */
router.get("/:id", authenticate, PermissionController.getPermissionById)

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     summary: Create a new permission
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
 *               - entity
 *               - action
 *             properties:
 *               entity:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               action:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Permission already exists or validation error
 */
router.post(
  "/",
  authenticate,
  authorize(PERMISSIONS.USERS_CREATE),
  validate(createPermissionSchema),
  PermissionController.createPermission,
)

/**
 * @swagger
 * /api/permissions/{id}:
 *   put:
 *     summary: Update permission
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
 *               entity:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               action:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       404:
 *         description: Permission not found
 */
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.USERS_UPDATE),
  validate(updatePermissionSchema),
  PermissionController.updatePermission,
)

/**
 * @swagger
 * /api/permissions/{id}:
 *   delete:
 *     summary: Delete permission
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
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 *       400:
 *         description: Cannot delete permission assigned to roles
 */
router.delete("/:id", authenticate, authorize(PERMISSIONS.USERS_DELETE), PermissionController.deletePermission)

export default router
