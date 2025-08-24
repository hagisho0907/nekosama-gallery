// Cloudflare Function for /api/photos/[id]
import { d1Database } from '../../../lib/d1-db';
import type { CloudflareEnv } from '../../../types/cloudflare';

export async function onRequestPUT(context: any): Promise<Response> {
  try {
    const { request, env, params } = context;
    const photoId = params.id;
    const url = new URL(request.url);
    
    // Check if this is a featured photo update request
    if (url.searchParams.get('action') === 'featured') {
      // Initialize D1 database
      d1Database.setDatabase(env.DB);
      
      const { isFeatured } = await request.json();
      
      if (typeof isFeatured !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'isFeatured must be a boolean' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Get photo info to find the folder
      const photo = await d1Database.getPhotoById(photoId);
      if (!photo) {
        return new Response(
          JSON.stringify({ error: 'Photo not found' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // If setting as featured, check if folder already has 3 featured photos
      if (isFeatured) {
        const folderPhotos = await d1Database.getPhotos(photo.folderId);
        const currentFeatured = folderPhotos.filter(p => p.isFeatured && p.id !== photoId).length;
        
        if (currentFeatured >= 3) {
          return new Response(
            JSON.stringify({ error: 'Maximum 3 photos can be featured per folder' }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      
      // Update the photo's featured status
      await d1Database.updatePhotoFeatured(photoId, isFeatured);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isFeatured ? 'Photo set as featured' : 'Photo removed from featured',
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Handle other PUT operations here if needed
    return new Response(
      JSON.stringify({ error: 'Unknown PUT operation' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error: any) {
    console.error('PUT photo error:', error);
    
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

export async function onRequestDelete(context: any): Promise<Response> {
  try {
    const { params, env } = context;
    const id = params.id;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    // Get photo info before deleting (to get R2 key for deletion)
    const folders = await d1Database.getFolders();
    let photo = null;
    
    for (const folder of folders) {
      const photos = await d1Database.getPhotos(folder.id);
      photo = photos.find(p => p.id === id);
      if (photo) break;
    }
    
    if (!photo) {
      return new Response(
        JSON.stringify({ error: 'Photo not found in database' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete from R2 first (extract key from URL)
    if (env.R2_BUCKET && photo.url) {
      try {
        // Extract R2 key from URL (e.g., "photos/filename.jpg")
        const urlParts = photo.url.split('/');
        const key = urlParts.slice(-2).join('/'); // Get "photos/filename" part
        
        console.log('Deleting from R2:', key);
        await env.R2_BUCKET.delete(key);
        console.log('R2 deletion successful:', key);
      } catch (r2Error) {
        console.error('R2 deletion failed:', r2Error);
        // Continue with database deletion even if R2 fails
      }
    }
    
    // Delete from database
    const success = await d1Database.deletePhoto(id);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete from database' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Photo deleted from both database and R2 storage'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}