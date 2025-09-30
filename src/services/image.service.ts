import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

class ImageService {
  private s3Client: S3Client | null = null;
  private uploadMode: string;

  constructor() {
    this.uploadMode = process.env.IMG_UPLOAD || 'local';
    
    if (this.uploadMode === 'production') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

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

  // Upload image to S3
  async uploadToS3(file: Express.Multer.File, folder: string = 'images'): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    const key = `${folder}/${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }

  // Upload image locally
  async uploadLocally(file: Express.Multer.File, folder: string = 'images'): Promise<string> {
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
    
    // Return the URL path (you might need to adjust this based on your server setup)
    return `/uploads/${folder}/${fileName}`;
  }

  // Main upload method that handles both S3 and local uploads
  async uploadImage(file: Express.Multer.File, folder: string = 'images'): Promise<string> {
    if (this.uploadMode === 'production') {
      return await this.uploadToS3(file, folder);
    } else {
      return await this.uploadLocally(file, folder);
    }
  }

  // Delete image (for cleanup)
  async deleteImage(imageUrl: string): Promise<void> {
    if (this.uploadMode === 'production') {
      // Implement S3 delete if needed
      console.log('S3 delete not implemented yet');
    } else {
      // Delete local file
      const filePath = imageUrl.replace('/uploads/', 'uploads/');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  // Get upload mode
  getUploadMode(): string {
    return this.uploadMode;
  }
}

export default new ImageService();
