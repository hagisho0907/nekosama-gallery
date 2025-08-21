// Cloudflare Function for /api/folders/[id]
import { d1Database } from '../../../lib/d1-db';
import { R2Storage } from '../../../lib/r2';
import type { CloudflareEnv } from '../../../types/cloudflare';

export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { params, env } = context;
    const id = params.id;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    const folder = await d1Database.getFolder(id);
    if (!folder) {
      return new Response(
        JSON.stringify({ error: 'Folder not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const photos = await d1Database.getPhotos(id);
    
    return new Response(JSON.stringify({ 
      folder: {
        ...folder,
        photos
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get folder error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function onRequestPut(context: any): Promise<Response> {
  try {
    const { request, params, env } = context;
    const id = params.id;
    
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

    const success = await d1Database.updateFolder(id, name.trim());
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Folder not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const updatedFolder = await d1Database.getFolder(id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      folder: updatedFolder
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Update folder error:', error);
    
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

export async function onRequestDelete(context: any): Promise<Response> {
  try {
    const { params, env } = context;
    const id = params.id;
    
    // Initialize D1 database  
    d1Database.setDatabase(env.DB);
    
    // Initialize R2 storage
    const r2Storage = new R2Storage();
    
    // Get all photos in the folder before deleting
    const photos = await d1Database.getPhotos(id);
    
    // Delete photos from R2 storage
    await Promise.all(
      photos.map(photo => r2Storage.deletePhoto(photo.url))
    );

    // Delete folder from database (photos will be deleted due to CASCADE)
    const success = await d1Database.deleteFolder(id);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Folder not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete folder error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}