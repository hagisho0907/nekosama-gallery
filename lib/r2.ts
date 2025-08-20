import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const CDN_URL = process.env.R2_PUBLIC_URL; // Optional CDN URL

export class R2Storage {
  async uploadPhoto(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
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

    await r2Client.send(command);
    
    // Return the public URL
    return CDN_URL ? `${CDN_URL}/${key}` : `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${key}`;
  }

  async deletePhoto(url: string): Promise<void> {
    // Extract key from URL
    const key = url.split('/').slice(-2).join('/'); // Get "photos/filename" part
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  }

  async getSignedUploadUrl(filename: string, contentType: string): Promise<string> {
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