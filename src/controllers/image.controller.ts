import { Response } from 'express';
import ImageService from '../services/image.service';
import type { AuthenticatedRequest } from '../common/types';

class ImageController {
  async uploadSingleImage(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('Upload request received:', {
        hasFile: !!req.file,
        fileInfo: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          hasBuffer: !!req.file.buffer
        } : null
      });

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      if (!req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'File buffer is undefined',
        });
      }

      const imageUrl = await ImageService.uploadImage(req.file, 'loans');
      
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl,
          uploadMode: ImageService.getUploadMode(),
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload image',
      });
    }
  }

  async uploadMultipleImages(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided',
        });
      }

      const files = req.files as Express.Multer.File[];
      const uploadPromises = files.map(file => ImageService.uploadImage(file, 'loans'));
      const imageUrls = await Promise.all(uploadPromises);
      
      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          imageUrls,
          uploadMode: ImageService.getUploadMode(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload images',
      });
    }
  }

  async uploadLoanImages(req: AuthenticatedRequest, res: Response) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const uploadedImages: { [key: string]: string } = {};

      // Upload each image field
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0]; // Take the first file if multiple
          uploadedImages[fieldName] = await ImageService.uploadImage(file, 'loans');
        }
      }

      res.json({
        success: true,
        message: 'Loan images uploaded successfully',
        data: {
          images: uploadedImages,
          uploadMode: ImageService.getUploadMode(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload loan images',
      });
    }
  }
}

export default new ImageController();
