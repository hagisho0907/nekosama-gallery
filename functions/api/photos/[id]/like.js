// Cloudflare Pages Function for like API

export async function onRequestPost(context) {
  try {
    const { params, env } = context;
    const photoId = params.id;
    
    if (!photoId) {
      return new Response(JSON.stringify({ error: 'Photo ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use D1 directly in Cloudflare environment
    const db = env.DB;
    if (!db) {
      console.error('D1 database not available');
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Try to increment likes
      await db.prepare(`
        UPDATE photos SET likes = likes + 1 WHERE id = ?
      `).bind(photoId).run();

      // Get the updated count
      const result = await db.prepare(`
        SELECT COALESCE(likes, 0) as likes FROM photos WHERE id = ?
      `).bind(photoId).first();
      
      const likesCount = result?.likes || 0;
      
      return new Response(JSON.stringify({ 
        success: true, 
        likes: likesCount 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      // If likes column doesn't exist, return 0
      if (dbError.message?.includes('no column named likes') || dbError.message?.includes('no such column: likes')) {
        return new Response(JSON.stringify({ 
          success: true, 
          likes: 0 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    console.error('Like photo error:', error);
    return new Response(JSON.stringify({ error: 'Failed to like photo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}