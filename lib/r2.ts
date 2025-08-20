import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Check if R2 credentials are available
const hasR2Credentials = () => {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ENDPOINT &&
    process.env.R2_BUCKET_NAME
  );
};

let r2Client: S3Client | null = null;

if (hasR2Credentials()) {
  r2Client = new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const CDN_URL = process.env.R2_PUBLIC_URL; // Optional CDN URL

export class R2Storage {
  async uploadPhoto(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    if (!r2Client || !BUCKET_NAME) {
      console.error('R2 client not initialized or bucket name missing');
      console.error('Environment check:', {
        hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
        hasEndpoint: !!process.env.R2_ENDPOINT,
        hasBucketName: !!process.env.R2_BUCKET_NAME,
        endpoint: process.env.R2_ENDPOINT,
        bucketName: BUCKET_NAME
      });
      throw new Error('Cloudflare R2 is not properly configured. Please check your environment variables.');
    }

    try {
      const key = `photos/${Date.now()}-${filename}`;
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          'uploaded-at': new Date().toISOString(),
        },
      });

      console.log('Attempting R2 upload:', { bucket: BUCKET_NAME, key, contentType });
      
      await r2Client.send(command);
      
      console.log('R2 upload successful');
      
      // Return the public URL
      return CDN_URL ? `${CDN_URL}/${key}` : `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;
      
    } catch (error: any) {
      console.error('R2 upload failed:', error);
      console.error('R2 error details:', {
        message: error.message,
        code: error.Code,
        name: error.name,
        stack: error.stack
      });
      throw new Error(`Failed to upload to Cloudflare R2: ${error.message}`);
    }
  }

  async deletePhoto(url: string): Promise<void> {
    if (!r2Client || !BUCKET_NAME) {
      console.warn('R2 client not available, skipping photo deletion');
      return;
    }

    try {
      // Extract key from URL
      const key = url.split('/').slice(-2).join('/'); // Get "photos/filename" part
      
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await r2Client.send(command);
      console.log('R2 deletion successful:', key);
    } catch (error: any) {
      console.error('R2 deletion failed:', error);
      // Don't throw error for deletion failures
    }
  }

  async getSignedUploadUrl(filename: string, contentType: string): Promise<string> {
    if (!r2Client || !BUCKET_NAME) {
      throw new Error('Cloudflare R2 is not properly configured');
    }

    const key = `photos/${Date.now()}-${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  }

  getPublicUrl(key: string): string {
    return CDN_URL ? `${CDN_URL}/${key}` : `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;
  }
}

export const r2Storage = new R2Storage();