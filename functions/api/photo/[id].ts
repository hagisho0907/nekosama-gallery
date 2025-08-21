// Cloudflare Function for /api/photo/[id]
import { d1Database } from '../../../lib/d1-db';

interface CloudflareEnv {
  DB: D1Database;
}

export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { params, env } = context;
    const id = params.id;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    // Find photo by ID in all folders
    const folders = await d1Database.getFolders();
    let photo = null;
    
    for (const folder of folders) {
      const photos = await d1Database.getPhotos(folder.id);
      photo = photos.find(p => p.id === id);
      if (photo) break;
    }
    
    if (!photo) {
      return new Response(
        JSON.stringify({ error: 'Photo not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // For now, return the photo URL as-is
    // In the future, we could proxy the image through this endpoint
    return new Response(JSON.stringify({
      id: photo.id,
      url: photo.url,
      originalName: photo.originalName,
      uploadedAt: photo.uploadedAt
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get photo error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}