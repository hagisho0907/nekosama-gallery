import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { CloudflareEnv } from '../types/cloudflare';

// R2 Client that works with Cloudflare Functions environment
export function createR2Client(env: CloudflareEnv): S3Client | null {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ENDPOINT || !env.R2_BUCKET_NAME) {
    return null;
  }

  return new S3Client({
    region: env.R2_REGION || 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Required for R2 compatibility
  });
}

export class R2Storage {
  private r2Client: S3Client;
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
    const client = createR2Client(env);
    if (!client) {
      throw new Error('R2 credentials not available');
    }
    this.r2Client = client;
  }

  async uploadPhoto(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    if (!this.r2Client || !this.env.R2_BUCKET_NAME) {
      console.error('R2 client not initialized or bucket name missing');
      console.error('Environment check:', {
        hasAccessKey: !!this.env.R2_ACCESS_KEY_ID,
        hasSecretKey: !!this.env.R2_SECRET_ACCESS_KEY,
        hasEndpoint: !!this.env.R2_ENDPOINT,
        hasBucketName: !!this.env.R2_BUCKET_NAME,
        endpoint: this.env.R2_ENDPOINT,
        bucketName: this.env.R2_BUCKET_NAME
      });
      throw new Error('Cloudflare R2 is not properly configured. Please check your environment variables.');
    }

    try {
      const key = `photos/${Date.now()}-${filename}`;
      
      const command = new PutObjectCommand({
        Bucket: this.env.R2_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          'uploaded-at': new Date().toISOString(),
        },
      });

      console.log('Attempting R2 upload:', { bucket: this.env.R2_BUCKET_NAME, key, contentType });
      
      await this.r2Client.send(command);
      
      console.log('R2 upload successful');
      
      // Return the public URL
      const publicUrl = this.env.R2_PUBLIC_URL 
        ? `${this.env.R2_PUBLIC_URL}/${key}`
        : `${this.env.R2_ENDPOINT}/${this.env.R2_BUCKET_NAME}/${key}`;
      
      console.log('Generated image URL:', publicUrl);
      console.log('Using R2 public URL:', !!this.env.R2_PUBLIC_URL);
      console.log('R2_PUBLIC_URL:', this.env.R2_PUBLIC_URL);
      
      return publicUrl;
      
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
    if (!this.r2Client || !this.env.R2_BUCKET_NAME) {
      console.warn('R2 client not available, skipping photo deletion');
      return;
    }

    try {
      // Extract key from URL
      const key = url.split('/').slice(-2).join('/'); // Get "photos/filename" part
      
      const command = new DeleteObjectCommand({
        Bucket: this.env.R2_BUCKET_NAME,
        Key: key,
      });

      await this.r2Client.send(command);
      console.log('R2 deletion successful:', key);
    } catch (error: any) {
      console.error('R2 deletion failed:', error);
      // Don't throw error for deletion failures
    }
  }

  async getSignedUploadUrl(filename: string, contentType: string): Promise<string> {
    if (!this.r2Client || !this.env.R2_BUCKET_NAME) {
      throw new Error('Cloudflare R2 is not properly configured');
    }

    const key = `photos/${Date.now()}-${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: this.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.r2Client, command, { expiresIn: 3600 });
  }

  getPublicUrl(key: string): string {
    return this.env.R2_PUBLIC_URL 
      ? `${this.env.R2_PUBLIC_URL}/${key}` 
      : `${this.env.R2_ENDPOINT}/${this.env.R2_BUCKET_NAME}/${key}`;
  }
}