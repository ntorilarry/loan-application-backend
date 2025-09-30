import { Router } from "express"
import SettingsController from "../controllers/settings.controller"
import { authenticate, authorize } from "../middlewares"
import { validate } from "../middlewares/validation.middleware"
import { PERMISSIONS } from "../common/constants"
import Joi from "joi"

const router = Router()

// Validation schema
const updateSettingsSchema = Joi.object({
  company_name: Joi.string().min(1).max(255).required(),
  company_address: Joi.string().max(500).optional().allow(""),
  company_email: Joi.string().email().optional().allow(""),
  company_contact: Joi.string().max(20).optional().allow(""),
  company_logo: Joi.string().max(500).optional().allow(""),
})

/**
 * @swagger
 * /api/settings/company:
 *   get:
 *     summary: Get company settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Company settings retrieved successfully
 */
router.get("/company", SettingsController.getCompanySettings)

/**
 * @swagger
 * /api/settings/company:
 *   put:
 *     summary: Update company settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_name
 *             properties:
 *               company_name:
 *                 type: string
 *               company_address:
 *                 type: string
 *               company_email:
 *                 type: string
 *                 format: email
 *               company_contact:
 *                 type: string
 *               company_logo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company settings updated successfully
 */
router.put(
  "/company",
  authenticate,
  authorize(PERMISSIONS.SETTINGS_UPDATE),
  validate(updateSettingsSchema),
  SettingsController.updateCompanySettings,
)

export default router
