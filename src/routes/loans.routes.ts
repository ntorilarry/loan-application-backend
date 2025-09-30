import { Router } from "express"
import LoanController from "../controllers/loan.controller"
import { authenticate, authorize, requireRole } from "../middlewares"
import { validate } from "../middlewares/validation.middleware"
import { PERMISSIONS, ROLES } from "../common/constants"
import Joi from "joi"

const router = Router()

// Validation schemas
const registerLoanSchema = Joi.object({
  fullname: Joi.string().min(2).max(255).required(),
  contact: Joi.string().min(10).max(20).required(),
  email: Joi.string().email().optional(),
  location: Joi.string().required(),
  landmark: Joi.string().optional(),
  business: Joi.string().optional(),
  requested_amount: Joi.number().positive().required(),
})

const captureLoanSchema = Joi.object({
  dob: Joi.string().optional(),
  marital_status: Joi.string().valid("single", "married", "divorced", "widowed").optional(),
  profile_image: Joi.string().optional(),
  occupation: Joi.string().optional(),
  id_type: Joi.string().valid("Ghana Card", "Voters ID", "Passport").optional(),
  id_number: Joi.string().optional(),
  id_front_image: Joi.string().optional(),
  id_back_image: Joi.string().optional(),
  witnesses: Joi.array()
    .items(
      Joi.object({
        fullname: Joi.string().required(),
        contact: Joi.string().required(),
        marital_status: Joi.string().optional(),
        email: Joi.string().email().optional(),
        occupation: Joi.string().optional(),
        residence_address: Joi.string().optional(),
        residence_gps: Joi.string().optional(),
        id_type: Joi.string().valid("Ghana Card", "Voters ID", "Passport").optional(),
        id_number: Joi.string().optional(),
        id_front_image: Joi.string().optional(),
        id_back_image: Joi.string().optional(),
        profile_pic: Joi.string().optional(),
      }),
    )
    .optional(),
  business_locations: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        address: Joi.string().required(),
        gps_address: Joi.string().optional(),
        region: Joi.string().optional(),
      }),
    )
    .optional(),
  residences: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        address: Joi.string().required(),
        gps_address: Joi.string().optional(),
        region: Joi.string().optional(),
      }),
    )
    .optional(),
})

const approveLoanSchema = Joi.object({
  approved_amount: Joi.number().positive().required(),
  loan_duration: Joi.string().required(),
  payment_mode: Joi.string().valid("weekly", "monthly").required(),
  payment_start_date: Joi.string().required(),
  payment_end_date: Joi.string().required(),
  processing_fee: Joi.number().min(0).required(),
  interest_rate: Joi.number().min(0).max(100).required(),
})

const recordRepaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  payment_date: Joi.date().required(),
  notes: Joi.string().optional().allow(""),
})

const disburseLoanSchema = Joi.object({
  disbursement_method: Joi.string().valid("cash", "bank_transfer", "mobile_money", "cheque").required(),
  disbursement_notes: Joi.string().optional().allow(""),
})

const editLoanSchema = Joi.object({
  fullname: Joi.string().min(2).max(255).optional(),
  contact: Joi.string().min(10).max(20).optional(),
  email: Joi.string().email().optional().allow(null),
  location: Joi.string().optional(),
  landmark: Joi.string().optional().allow(null),
  business: Joi.string().optional().allow(null),
  requested_amount: Joi.number().positive().optional(),
})

/**
 * @swagger
 * /api/loans:
 *   get:
 *     summary: Get all loans with filters
 *     tags: [Loans]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [registered, captured, approved, disbursed, active, completed, defaulted]
 *       - in: query
 *         name: phase
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3, 4]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loans retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       client_id: { type: integer }
 *                       requested_amount: { type: number }
 *                       approved_amount: { type: number, nullable: true }
 *                       loan_duration: { type: string, nullable: true }
 *                       payment_mode: { type: string, enum: [weekly, monthly], nullable: true }
 *                       payment_start_date: { type: string, nullable: true }
 *                       payment_end_date: { type: string, nullable: true }
 *                       processing_fee: { type: number, nullable: true }
 *                       interest_rate: { type: number, nullable: true }
 *                       status: { type: string, enum: [registered, captured, approved, disbursed, active, completed, defaulted] }
 *                       phase: { type: integer, enum: [1,2,3,4] }
 *                       client_name: { type: string }
 *                       client_contact: { type: string }
 *                       client_email: { type: string, nullable: true }
 *                       client_location: { type: string }
 *                       client_landmark: { type: string, nullable: true }
 *                       client_business: { type: string, nullable: true }
 *                       registered_by_name: { type: string, nullable: true }
 *                       captured_by_name: { type: string, nullable: true }
 *                       approved_by_name: { type: string, nullable: true }
 *                       disbursed_by_name: { type: string, nullable: true }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_registrations: { type: integer }
 *                     registered: { type: integer }
 *                     captured: { type: integer }
 *                     total_requested: { type: number }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 */
router.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.LOANS_LIST),
  LoanController.getAllLoans.bind(LoanController),
)

/**
 * @swagger
 * /api/loans/register:
 *   post:
 *     summary: Register a new loan (Phase 1)
 *     tags: [Loans]
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
 *               - contact
 *               - location
 *               - requested_amount
 *             properties:
 *               fullname:
 *                 type: string
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               location:
 *                 type: string
 *               landmark:
 *                 type: string
 *               business:
 *                 type: string
 *               requested_amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Loan registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     client:
 *                       type: object
 *                     loan:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         registered_by_name: { type: string, nullable: true }
 *                         status: { type: string }
 */
router.post(
  "/register",
  authenticate,
  requireRole([ROLES.CALL_CENTER, ROLES.ADMIN, ROLES.OWNER]),
  validate(registerLoanSchema),
  LoanController.registerLoan,
)

/**
 * @swagger
 * /api/loans/{loanId}/capture:
 *   put:
 *     summary: Capture detailed loan information (Phase 2)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
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
 *               dob:
 *                 type: string
 *               marital_status:
 *                 type: string
 *                 enum: [single, married, divorced, widowed]
 *               profile_image:
 *                 type: string
 *               occupation:
 *                 type: string
 *               id_type:
 *                 type: string
 *                 enum: [Ghana Card, Voters ID, Passport]
 *               id_number:
 *                 type: string
 *               id_front_image:
 *                 type: string
 *               id_back_image:
 *                 type: string
 *               witnesses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [fullname, contact]
 *                   properties:
 *                     fullname: { type: string }
 *                     contact: { type: string }
 *                     marital_status: { type: string }
 *                     email: { type: string }
 *                     occupation: { type: string }
 *                     residence_address: { type: string }
 *                     residence_gps: { type: string }
 *                     id_type: { type: string, enum: [Ghana Card, Voters ID, Passport] }
 *                     id_number: { type: string }
 *                     id_front_image: { type: string }
 *                     id_back_image: { type: string }
 *                     profile_pic: { type: string }
 *               business_locations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, address]
 *                   properties:
 *                     name: { type: string }
 *                     address: { type: string }
 *                     gps_address: { type: string }
 *                     region: { type: string }
 *               residences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, address]
 *                   properties:
 *                     name: { type: string }
 *                     address: { type: string }
 *                     gps_address: { type: string }
 *                     region: { type: string }
 *     responses:
 *       200:
 *         description: Loan details captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     witnesses: { type: array, items: { type: object } }
 *                     business_locations: { type: array, items: { type: object } }
 *                     residences: { type: array, items: { type: object } }
 *                     captured_by_name: { type: string, nullable: true }
 */
router.put(
  "/:loanId/capture",
  authenticate,
  requireRole([ROLES.SALES_EXECUTIVE, ROLES.LOAN_OFFICER, ROLES.ADMIN, ROLES.OWNER]),
  validate(captureLoanSchema),
  LoanController.captureLoanDetails,
)

/**
 * @swagger
 * /api/loans/{loanId}/approve:
 *   put:
 *     summary: Approve loan (Phase 3)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
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
 *               - approved_amount
 *               - loan_duration
 *               - payment_mode
 *               - payment_start_date
 *               - payment_end_date
 *               - processing_fee
 *               - interest_rate
 *             properties:
 *               approved_amount:
 *                 type: number
 *               loan_duration:
 *                 type: string
 *               payment_mode:
 *                 type: string
 *                 enum: [weekly, monthly]
 *               payment_start_date:
 *                 type: string
 *               payment_end_date:
 *                 type: string
 *               processing_fee:
 *                 type: number
 *                 minimum: 0
 *               interest_rate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Loan approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     approved_by_name: { type: string, nullable: true }
 *                     payment_schedule_start: { type: string, format: date }
 */
router.put(
  "/:loanId/approve",
  authenticate,
  requireRole([ROLES.CREDIT_RISK_ANALYST, ROLES.ADMIN, ROLES.OWNER]),
  validate(approveLoanSchema),
  LoanController.approveLoan,
)

/**
 * @swagger
 * /api/loans/{loanId}/disburse:
 *   put:
 *     summary: Disburse loan (Phase 4)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
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
 *               - disbursement_method
 *             properties:
 *               disbursement_method:
 *                 type: string
 *                 enum: [cash, bank_transfer, mobile_money, cheque]
 *                 description: Method used to disburse the loan
 *               disbursement_notes:
 *                 type: string
 *                 description: Additional notes about the disbursement
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Loan disbursed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     disbursement_date: { type: string, format: date-time }
 *                     disbursed_by_name: { type: string, nullable: true }
 *                     disbursement_method: { type: string, nullable: true }
 *                     disbursement_notes: { type: string, nullable: true }
 */
router.put(
  "/:loanId/disburse",
  authenticate,
  requireRole([ROLES.MANAGER, ROLES.ADMIN, ROLES.OWNER]),
  validate(disburseLoanSchema),
  LoanController.disburseLoan,
)

/**
 * @swagger
 * /api/loans/{loanId}:
 *   get:
 *     summary: Get loan by ID
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan retrieved successfully
 *       404:
 *         description: Loan not found
 */
router.get("/:loanId", authenticate, authorize(PERMISSIONS.LOANS_VIEW), LoanController.getLoanById)

/**
 * @swagger
 * /api/loans/{loanId}:
 *   put:
 *     summary: Edit loan (registration and capturing phases only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
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
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               location:
 *                 type: string
 *               landmark:
 *                 type: string
 *                 nullable: true
 *               business:
 *                 type: string
 *                 nullable: true
 *               requested_amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Loan updated successfully
 *       400:
 *         description: Loan not found or not in editable phase
 */
router.put(
  "/:loanId",
  authenticate,
  requireRole([ROLES.CALL_CENTER, ROLES.SALES_EXECUTIVE, ROLES.LOAN_OFFICER, ROLES.ADMIN, ROLES.OWNER]),
  validate(editLoanSchema),
  LoanController.editLoan,
)

/**
 * @swagger
 * /api/loans/{loanId}:
 *   delete:
 *     summary: Delete loan (registration and capturing phases only)
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan deleted successfully
 *       400:
 *         description: Loan not found or not in deletable phase
 */
router.delete(
  "/:loanId",
  authenticate,
  requireRole([ROLES.CALL_CENTER, ROLES.SALES_EXECUTIVE, ROLES.LOAN_OFFICER, ROLES.ADMIN, ROLES.OWNER]),
  LoanController.deleteLoan,
)

/**
 * @swagger
 * /api/loans/{loanId}/repayments:
 *   get:
 *     summary: Get loan repayments
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan repayments retrieved successfully
 */
router.get("/:loanId/repayments", authenticate, authorize(PERMISSIONS.LOANS_VIEW), LoanController.getLoanRepayments)

/**
 * @swagger
 * /api/loans/{loanId}/payments:
 *   get:
 *     summary: Get loan payments
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan payments retrieved successfully
 */
router.get("/:loanId/payments", authenticate, authorize(PERMISSIONS.LOANS_VIEW), LoanController.getLoanPayments)

/**
 * @swagger
 * /api/loans/{loanId}/balance:
 *   get:
 *     summary: Get loan balance information
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Loan balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAmount: { type: number }
 *                     totalPaid: { type: number }
 *                     remainingBalance: { type: number }
 *                     nextDueAmount: { type: number }
 */
router.get("/:loanId/balance", authenticate, authorize(PERMISSIONS.LOANS_VIEW), LoanController.getLoanBalance)

/**
 * @swagger
 * /api/loans/{loanId}/repayments:
 *   post:
 *     summary: Record loan repayment
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
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
 *               - amount
 *               - payment_date
 *             properties:
 *               amount:
 *                 type: number
 *               payment_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *                 description: Optional notes about the payment
 *     responses:
 *       200:
 *         description: Repayment recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount: { type: number }
 *                     payment_date: { type: string, format: date }
 *                     remainingBalance: { type: number }
 *                     totalPaid: { type: number }
 *                     nextDueAmount: { type: number }
 */
router.post(
  "/:loanId/repayments",
  authenticate,
  authorize(PERMISSIONS.LOANS_UPDATE),
  validate(recordRepaymentSchema),
  LoanController.recordRepayment,
)

export default router
