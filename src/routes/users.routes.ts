import { Router } from "express"
import UserController from "../controllers/user.controller"
import { authenticate, authorize } from "../middlewares"
import { validate, registerSchema } from "../middlewares/validation.middleware"
import { PERMISSIONS } from "../common/constants"
import Joi from "joi"

const router = Router()

// Validation schemas
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
    }),
})

const updateUserSchema = Joi.object({
  fullname: Joi.string().min(2).max(255).optional(),
  phone: Joi.string().min(10).max(20).optional(),
  company_name: Joi.string().max(255).optional(),
  company_address: Joi.string().optional(),
  role_id: Joi.number().integer().positive().optional(),
})

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get("/", authenticate, authorize(PERMISSIONS.USERS_LIST), UserController.getAllUsers)

/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 */
router.get("/roles", authenticate, UserController.getRoles)

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 */
router.post("/change-password", authenticate, validate(changePasswordSchema), UserController.changePassword)

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               company_name:
 *                 type: string
 *               company_address:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists or validation error
 *       403:
 *         description: Insufficient permissions
 */
router.post("/", authenticate, authorize(PERMISSIONS.USERS_CREATE), validate(registerSchema), UserController.createUser)

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Insufficient permissions
 */
router.get("/:id", authenticate, authorize(PERMISSIONS.USERS_VIEW), UserController.getUserById)

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
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
 *               fullname:
 *                 type: string
 *               phone:
 *                 type: string
 *               company_name:
 *                 type: string
 *               company_address:
 *                 type: string
 *               role_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  "/:id",
  authenticate,
  authorize(PERMISSIONS.USERS_UPDATE),
  validate(updateUserSchema),
  UserController.updateUser,
)

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
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
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Insufficient permissions
 */
router.delete("/:id", authenticate, authorize(PERMISSIONS.USERS_DELETE), UserController.deleteUser)

export default router
