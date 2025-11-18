import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

class ImageService {
  // Configure multer for file uploads
  getMulterConfig() {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed'));
        }
      },
    });
  }

  // Upload image locally
  async uploadImage(file: Express.Multer.File, folder: string = 'images'): Promise<string> {
    if (!file.buffer) {
      throw new Error('File buffer is undefined');
    }

    const uploadDir = `uploads/${folder}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, file.buffer);
    
    // Return the URL path for accessing the uploaded file
    return `/uploads/${folder}/${fileName}`;
  }

  // Delete image (for cleanup)
  async deleteImage(imageUrl: string): Promise<void> {
    // Delete local file
    const filePath = imageUrl.replace('/uploads/', 'uploads/');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export default new ImageService();
