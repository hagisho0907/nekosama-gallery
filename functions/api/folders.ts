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
      const allPhotos = await d1Database.getPhotos(folder.id);
      const featuredPhotos = await d1Database.getFeaturedPhotos(folder.id);
      
      // Use featured photos first, then fill with regular photos if needed
      let displayPhotos = featuredPhotos.slice(0, 3);
      if (displayPhotos.length < 3) {
        const regularPhotos = allPhotos.filter(photo => !photo.isFeatured);
        const remainingSlots = 3 - displayPhotos.length;
        displayPhotos = displayPhotos.concat(regularPhotos.slice(0, remainingSlots));
      }
      
      return {
        ...folder,
        photoCount: allPhotos.length,
        photos: displayPhotos
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

export async function onRequestPUT(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Check if this is a featured photo operation
    const action = url.searchParams.get('action');
    const photoId = url.searchParams.get('photoId');
    
    if (action === 'set-featured' && photoId) {
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
      const success = await d1Database.updatePhotoFeatured(photoId, isFeatured);
      
      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Failed to update featured status' }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
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
    
    // Default response for unsupported operations
    return new Response(
      JSON.stringify({ error: 'Unsupported operation' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error: any) {
    console.error('Folders PUT error:', error);
    
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