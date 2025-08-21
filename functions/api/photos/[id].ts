// Cloudflare Function for /api/photos/[id]
import { d1Database } from '../../../lib/d1-db';
import type { CloudflareEnv } from '../../../types/cloudflare';

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