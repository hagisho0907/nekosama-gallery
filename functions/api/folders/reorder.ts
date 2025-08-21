// Cloudflare Function for /api/folders/reorder
import { d1Database } from '../../../lib/d1-db';
import type { CloudflareEnv } from '../../../types/cloudflare';

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    const { folderIds } = await request.json();
    
    if (!Array.isArray(folderIds)) {
      return new Response(
        JSON.stringify({ error: 'folderIds must be an array' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Updating folder order:', folderIds);
    
    const success = await d1Database.updateFolderOrder(folderIds);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to update folder order' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Folder order updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Reorder folders error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}