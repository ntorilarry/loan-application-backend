import { Router } from 'express';
import ImageController from '../controllers/image.controller';
import { authenticate, authorize } from '../middlewares';
import { PERMISSIONS } from '../common/constants';
import { uploadSingleImage, uploadMultipleImages, uploadImageFields } from '../middlewares/image.middleware';

const router = Router();

/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     summary: Upload a single image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
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
 *                     imageUrl: { type: string }
 *                     uploadMode: { type: string }
 */
router.post(
  '/upload',
  authenticate,
  authorize(PERMISSIONS.LOANS_UPDATE),
  uploadSingleImage('image'),
  ImageController.uploadSingleImage,
);

/**
 * @swagger
 * /api/images/upload-multiple:
 *   post:
 *     summary: Upload multiple images
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
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
 *                     imageUrls: { type: array, items: { type: string } }
 *                     uploadMode: { type: string }
 */
router.post(
  '/upload-multiple',
  authenticate,
  authorize(PERMISSIONS.LOANS_UPDATE),
  uploadMultipleImages('images', 10),
  ImageController.uploadMultipleImages,
);

/**
 * @swagger
 * /api/images/upload-loan-images:
 *   post:
 *     summary: Upload loan-related images (ID front/back, profile pics)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id_front_image:
 *                 type: string
 *                 format: binary
 *               id_back_image:
 *                 type: string
 *                 format: binary
 *               profile_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Loan images uploaded successfully
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
 *                     images:
 *                       type: object
 *                       properties:
 *                         id_front_image: { type: string }
 *                         id_back_image: { type: string }
 *                         profile_image: { type: string }
 *                     uploadMode: { type: string }
 */
router.post(
  '/upload-loan-images',
  authenticate,
  authorize(PERMISSIONS.LOANS_UPDATE),
  uploadImageFields([
    { name: 'id_front_image', maxCount: 1 },
    { name: 'id_back_image', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
  ]),
  ImageController.uploadLoanImages,
);

export default router;

