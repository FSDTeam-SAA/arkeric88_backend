/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { memoryStorage } from 'multer';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
import { HttpException } from '@nestjs/common';
import config from '../config';

cloudinary.config({
  cloud_name: config.cloudinary.name,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const uploadConfig = {
  storage: memoryStorage(),
  // limits: {
  //   fileSize: 10 * 1024 * 1024, // 10 MB
  // },
};

type CloudinaryUploadResult = {
  url: string;
  public_id: string;
};

type ImageUploadOptions = {
  folder?: string;
  resourceType?: 'image' | 'video';
  transformation?: Record<string, unknown>;
  publicId?: string;
};

const uploadBufferToCloudinary = async (
  buffer: Buffer,
  options: ImageUploadOptions = {},
): Promise<CloudinaryUploadResult> => {
  if (!buffer?.length) {
    throw new HttpException('No valid file provided', 400);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType ?? 'image',
        transformation: options.transformation,
        public_id: options.publicId,
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result) {
          return reject(new Error('Upload failed - no result returned'));
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const uploadToCloudinary = async (
  file: Express.Multer.File,
): Promise<{ url: string; public_id: string }> => {
  if (!file || !file.buffer?.length) {
    throw new HttpException('No valid file provided', 400);
  }

  if (file.mimetype && !file.mimetype.startsWith('image/')) {
    throw new HttpException('Only image files are allowed', 400);
  }

  return uploadBufferToCloudinary(file.buffer, {
    folder: 'healthcare_app',
    resourceType: 'image',
    transformation: {
      width: 500,
      height: 500,
      crop: 'limit',
    },
  });
};

const uploadVideoToCloudinary = async (
  file: Express.Multer.File,
): Promise<{ url: string; public_id: string }> => {
  if (!file || !file.buffer?.length) {
    throw new HttpException('No valid file provided', 400);
  }

  if (file.mimetype && !file.mimetype.startsWith('video/')) {
    throw new HttpException('Only video files are allowed', 400);
  }

  return uploadBufferToCloudinary(file.buffer, {
    folder: 'healthcare_app/reviews',
    resourceType: 'video',
  });
};

const uploadImageSourceToCloudinary = async (source: string) => {
  const normalizedSource = source?.trim();

  if (!normalizedSource) {
    return normalizedSource;
  }

  if (/res\.cloudinary\.com/i.test(normalizedSource)) {
    return normalizedSource;
  }

  const dataImageMatch = normalizedSource.match(
    /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i,
  );

  if (dataImageMatch) {
    const base64Data = dataImageMatch[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (!buffer.length) {
      return normalizedSource;
    }

    const uploaded = await uploadBufferToCloudinary(buffer, {
      folder: 'healthcare_app/email-templates',
      resourceType: 'image',
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
      },
    });

    return uploaded.url;
  }

  if (!/^https?:\/\//i.test(normalizedSource)) {
    return normalizedSource;
  }

  try {
    const response = await fetch(normalizedSource);

    if (!response.ok) {
      return normalizedSource;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return normalizedSource;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return normalizedSource;
    }

    const uploaded = await uploadBufferToCloudinary(buffer, {
      folder: 'healthcare_app/email-templates',
      resourceType: 'image',
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
      },
    });

    return uploaded.url;
  } catch (error) {
    console.error('Email template image upload failed:', error);
    return normalizedSource;
  }
};

const deleteFromCloudinary = async (public_id: string): Promise<void> => {
  if (!public_id) return;
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error('Cloudinary delete failed:', error);
  }
};

const deleteVideoFromCloudinary = async (public_id: string): Promise<void> => {
  if (!public_id) return;
  try {
    await cloudinary.uploader.destroy(public_id, { resource_type: 'video' });
  } catch (error) {
    console.error('Cloudinary video delete failed:', error);
  }
};

export const fileUpload = {
  uploadToCloudinary,
  uploadVideoToCloudinary,
  uploadImageSourceToCloudinary,
  deleteFromCloudinary,
  deleteVideoFromCloudinary,
  uploadConfig,
};
