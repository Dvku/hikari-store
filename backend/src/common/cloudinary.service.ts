import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

// Definimos esto para que el linter no llore con el .buffer
interface MulterFile {
  buffer: Buffer;
}

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(file: any): Promise<string> {
    return new Promise((resolve, reject) => {
      // Usamos una pequeña "mentira piadosa" de tipos para el linter
      const fileBuffer = (file as MulterFile).buffer;

      if (!fileBuffer) {
        return reject(
          new Error('No se encontró el contenido del archivo (buffer missing)'),
        );
      }

      const upload = cloudinary.uploader.upload_stream(
        { folder: 'hikari-store' },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) return reject(new Error(error.message));
          resolve(result.secure_url);
        },
      );

      upload.end(fileBuffer);
    });
  }
}
