// Cloudflare Function for /api/upload
import { d1Database } from '../../lib/d1-db';
import type { CloudflareEnv } from '../../types/cloudflare';

// R2 Upload functionality using Cloudflare API
async function uploadToR2(file: File, env: CloudflareEnv): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
  const key = `photos/${filename}`;

  // Convert file to ArrayBuffer
  const buffer = await file.arrayBuffer();

  // Upload to R2 using fetch API
  const uploadUrl = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`;
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: buffer,
    headers: {
      'Content-Type': file.type,
      'Authorization': `Bearer ${env.R2_ACCESS_KEY_ID}:${env.R2_SECRET_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.statusText}`);
  }

  // Return public URL
  return env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`;
}

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

    // Upload to R2
    const url = await uploadToR2(file, env);

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