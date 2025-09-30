import { Request, Response, NextFunction } from 'express';
import ImageService from '../services/image.service';

// Middleware for single image upload
export const uploadSingleImage = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`Upload middleware called for field: ${fieldName}`);
    const upload = ImageService.getMulterConfig().single(fieldName);
    
    upload(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      console.log('File processed:', {
        hasFile: !!req.file,
        fileInfo: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          hasBuffer: !!req.file.buffer
        } : null
      });
      next();
    });
  };
};

// Middleware for multiple image uploads
export const uploadMultipleImages = (fieldName: string, maxCount: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const upload = ImageService.getMulterConfig().array(fieldName, maxCount);
    
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

// Middleware for fields with multiple images
export const uploadImageFields = (fields: Array<{ name: string; maxCount: number }>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const upload = ImageService.getMulterConfig().fields(fields);
    
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};
