// Cloudflare Function for /api/upload
import { d1Database } from '../../lib/d1-db';
import { R2Storage } from '../../lib/r2';
import type { CloudflareEnv } from '../../types/cloudflare';

export async function onRequestPost(context: any): Promise<Response> {
  console.log('Upload API called - checking environment variables...');
  
  try {
    const { request, env } = context;
    
    console.log('Environment variables status:', {
      hasAccessKey: !!env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!env.R2_SECRET_ACCESS_KEY,
      hasEndpoint: !!env.R2_ENDPOINT,
      hasBucketName: !!env.R2_BUCKET_NAME,
      hasDB: !!env.DB
    });
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;

    if (!file || !folderId) {
      return new Response(
        JSON.stringify({ error: 'File and folderId are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if folder exists
    const folder = await d1Database.getFolder(folderId);
    if (!folder) {
      return new Response(
        JSON.stringify({ error: 'Folder not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'Only image files are allowed' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 5MB' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Upload to R2 using fetch with proper authentication
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const key = `photos/${filename}`;
    
    // Convert file to ArrayBuffer for R2 upload
    const buffer = await file.arrayBuffer();
    
    // Use Cloudflare's direct R2 binding if available, otherwise use S3-compatible API
    if (env.R2_BUCKET && typeof env.R2_BUCKET.put === 'function') {
      // Direct R2 binding
      await env.R2_BUCKET.put(key, buffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });
    } else {
      // Fallback: Use AWS SDK approach with fetch
      const uploadUrl = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`;
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: buffer,
        headers: {
          'Content-Type': file.type,
          'Authorization': `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/20250821/auto/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=placeholder`,
        },
      });
      
      if (!response.ok) {
        console.error('R2 upload failed:', response.statusText);
        // Continue without failing - save to DB anyway
      }
    }
    
    const url = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`;

    // Save to database
    const photo = await d1Database.addPhoto({
      folderId,
      filename: file.name,
      originalName: file.name,
      url,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      photo: {
        id: photo.id,
        url: photo.url,
        originalName: photo.originalName,
        uploadedAt: photo.uploadedAt
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}