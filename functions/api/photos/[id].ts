// Cloudflare Function for /api/photos/[id]
import { d1Database } from '../../../lib/d1-db';

interface CloudflareEnv {
  DB: D1Database;
}

export async function onRequestDelete(context: any): Promise<Response> {
  try {
    const { params, env } = context;
    const id = params.id;
    
    // Initialize D1 database
    d1Database.setDatabase(env.DB);
    
    // Delete from database first to get photo info
    const success = await d1Database.deletePhoto(id);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Photo not found in database' }),
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