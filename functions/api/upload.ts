// Cloudflare Function for /api/upload
import { d1Database } from '../../lib/d1-db';
import { R2Storage } from '../../lib/r2';
import type { CloudflareEnv } from '../../types/cloudflare';

// Rate limiting configuration
const UPLOAD_RATE_LIMIT = 20; // 20 uploads per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

// Rate limiting using KV store or in-memory for simple implementation
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting helper function
function checkRateLimit(clientId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // New window or expired window - reset counter
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true };
  }
  
  if (clientData.count >= UPLOAD_RATE_LIMIT) {
    // Rate limit exceeded
    return { 
      allowed: false, 
      resetTime: clientData.resetTime 
    };
  }
  
  // Increment counter
  rateLimitStore.set(clientId, {
    ...clientData,
    count: clientData.count + 1
  });
  
  return { allowed: true };
}

export async function onRequestPost(context: any): Promise<Response> {
  console.log('Upload API called - checking environment variables...');
  
  try {
    const { request, env } = context;
    
    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || '';
    const clientId = `${clientIP}:${userAgent.substring(0, 50)}`; // Combine IP and partial user agent for identification
    
    const rateLimitCheck = checkRateLimit(clientId);
    
    if (!rateLimitCheck.allowed) {
      const resetTimeSeconds = rateLimitCheck.resetTime ? Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000) : 60;
      console.log(`Rate limit exceeded for client: ${clientId}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `Too many upload requests. Please wait ${resetTimeSeconds} seconds before trying again.`,
          rateLimitExceeded: true,
          resetIn: resetTimeSeconds
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': resetTimeSeconds.toString(),
            'X-RateLimit-Limit': UPLOAD_RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
          }
        }
      );
    }
    
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
    
    // Upload to R2 using direct binding
    if (env.BUCKET) {
      try {
        console.log('Uploading to R2 using binding:', key);
        await env.BUCKET.put(key, buffer, {
          httpMetadata: {
            contentType: file.type,
          },
        });
        console.log('R2 upload successful:', key);
      } catch (error) {
        console.error('R2 upload failed:', error);
        throw new Error(`Failed to upload to R2: ${error}`);
      }
    } else {
      throw new Error('R2 bucket binding not available');
    }
    
    const url = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`;

    // Check current photo count for this folder
    // 在籍生: 100枚制限, 卒業生: 10枚制限
    const MAX_PHOTOS_ENROLLED = 100;
    const MAX_PHOTOS_GRADUATED = 10;
    const maxPhotos = folder.status === 'graduated' ? MAX_PHOTOS_GRADUATED : MAX_PHOTOS_ENROLLED;
    const currentPhotos = await d1Database.getPhotos(folderId);
    
    console.log(`Folder ${folderId} (${folder.status}) currently has ${currentPhotos.length} photos, max: ${maxPhotos}`);
    
    // Auto-delete oldest photos if needed (both enrolled and graduated folders)
    if ((folder.status === 'enrolled' && currentPhotos.length >= MAX_PHOTOS_ENROLLED) ||
        (folder.status === 'graduated' && currentPhotos.length >= MAX_PHOTOS_GRADUATED)) {
      const photosToDelete = currentPhotos.length - maxPhotos + 1; // +1 for the new photo we're adding
      const oldestPhotos = currentPhotos
        .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
        .slice(0, photosToDelete);
      
      console.log(`Deleting ${photosToDelete} oldest photos:`, oldestPhotos.map(p => p.id));
      
      // Delete from R2 and database
      for (const oldPhoto of oldestPhotos) {
        try {
          // Delete from R2
          if (env.BUCKET && oldPhoto.url) {
            const urlParts = oldPhoto.url.split('/');
            const oldKey = urlParts.slice(-2).join('/'); // Get "photos/filename" part
            console.log('Deleting old photo from R2:', oldKey);
            await env.BUCKET.delete(oldKey);
          }
          
          // Delete from database
          await d1Database.deletePhoto(oldPhoto.id);
          console.log('Deleted old photo:', oldPhoto.id);
        } catch (deleteError) {
          console.error('Failed to delete old photo:', oldPhoto.id, deleteError);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Save new photo to database
    const photo = await d1Database.addPhoto({
      folderId,
      filename: file.name,
      originalName: file.name,
      url,
    });

    const responseMessage = currentPhotos.length >= maxPhotos 
      ? `写真をアップロードしました。古い写真を自動削除して最大${maxPhotos}枚を維持しています。`
      : '写真をアップロードしました。';

    // Calculate remaining rate limit
    const currentRateData = rateLimitStore.get(clientId);
    const remainingRequests = currentRateData ? Math.max(0, UPLOAD_RATE_LIMIT - currentRateData.count) : UPLOAD_RATE_LIMIT - 1;

    return new Response(JSON.stringify({ 
      success: true, 
      message: responseMessage,
      photo: {
        id: photo.id,
        url: photo.url,
        originalName: photo.originalName,
        uploadedAt: photo.uploadedAt
      },
      totalPhotos: Math.min(currentPhotos.length + 1, maxPhotos)
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': UPLOAD_RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': currentRateData?.resetTime?.toString() || ''
      }
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