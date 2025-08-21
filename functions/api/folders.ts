// Cloudflare Function for /api/folders
import { d1Database, CatFolder } from '../../lib/d1-db';
import type { CloudflareEnv } from '../../types/cloudflare';

export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { env } = context;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    const folders = await d1Database.getFolders();
    
    // Get photo counts for each folder
    const foldersWithCounts = await Promise.all(folders.map(async (folder: CatFolder) => {
      const photos = await d1Database.getPhotos(folder.id);
      return {
        ...folder,
        photoCount: photos.length,
        photos: photos.slice(0, 3) // Get first 3 photos for thumbnails
      };
    }));

    return new Response(JSON.stringify({ folders: foldersWithCounts }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get folders error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Folder name is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const folder = await d1Database.createFolder(name.trim());
    
    return new Response(JSON.stringify({ 
      success: true, 
      folder: {
        ...folder,
        photoCount: 0,
        photos: []
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Create folder error:', error);
    
    // Handle unique constraint error
    if (error.message?.includes('UNIQUE constraint')) {
      return new Response(
        JSON.stringify({ error: 'Folder name already exists' }),
        { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}