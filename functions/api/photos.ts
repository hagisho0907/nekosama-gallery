// Cloudflare Function for /api/photos
import { d1Database } from '../../lib/d1-db';

export async function onRequestPUT(context: any): Promise<Response> {
  console.log('Photos PUT request received');
  
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    console.log('Request URL:', request.url);
    console.log('Query params:', url.searchParams.toString());
    
    // Check if this is a featured photo operation
    const action = url.searchParams.get('action');
    const photoId = url.searchParams.get('photoId');
    
    console.log('Action:', action);
    console.log('Photo ID:', photoId);
    
    if (action === 'featured' && photoId) {
      // Initialize D1 database
      d1Database.setDatabase(env.DB);
      
      const { isFeatured } = await request.json();
      console.log('isFeatured:', isFeatured);
      
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
    console.error('Photos PUT error:', error);
    
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