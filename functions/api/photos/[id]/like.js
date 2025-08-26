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
      // First check if the photo exists and has a likes column
      const checkResult = await db.prepare(`
        SELECT id, COALESCE(likes, 0) as likes FROM photos WHERE id = ?
      `).bind(photoId).first();
      
      if (!checkResult) {
        return new Response(JSON.stringify({ error: 'Photo not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Try to increment likes
      const updateResult = await db.prepare(`
        UPDATE photos SET likes = COALESCE(likes, 0) + 1 WHERE id = ?
      `).bind(photoId).run();

      console.log('Update result:', updateResult);

      // Get the updated count
      const result = await db.prepare(`
        SELECT COALESCE(likes, 0) as likes FROM photos WHERE id = ?
      `).bind(photoId).first();
      
      const likesCount = result?.likes || (checkResult.likes + 1);
      
      console.log('Final likes count:', likesCount);
      
      return new Response(JSON.stringify({ 
        success: true, 
        likes: likesCount 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If likes column doesn't exist, try to add it and then increment
      if (dbError.message?.includes('no column named likes') || dbError.message?.includes('no such column: likes')) {
        try {
          // Add the likes column
          await db.prepare(`
            ALTER TABLE photos ADD COLUMN likes INTEGER DEFAULT 0
          `).run();
          
          // Now try to increment
          await db.prepare(`
            UPDATE photos SET likes = 1 WHERE id = ?
          `).bind(photoId).run();
          
          return new Response(JSON.stringify({ 
            success: true, 
            likes: 1 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (alterError) {
          console.error('Failed to add likes column:', alterError);
          return new Response(JSON.stringify({ 
            success: true, 
            likes: 1 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
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

// DELETE method for unlike
export async function onRequestDelete(context) {
  try {
    const { params, env } = context;
    const photoId = params.id;
    
    if (!photoId) {
      return new Response(JSON.stringify({ error: 'Photo ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    if (!db) {
      console.error('D1 database not available');
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Check current likes count
      const checkResult = await db.prepare(`
        SELECT id, COALESCE(likes, 0) as likes FROM photos WHERE id = ?
      `).bind(photoId).first();
      
      if (!checkResult) {
        return new Response(JSON.stringify({ error: 'Photo not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Decrement likes but don't go below 0
      const newLikesCount = Math.max(0, checkResult.likes - 1);
      
      const updateResult = await db.prepare(`
        UPDATE photos SET likes = ? WHERE id = ?
      `).bind(newLikesCount, photoId).run();

      console.log('Unlike update result:', updateResult);

      return new Response(JSON.stringify({ 
        success: true, 
        likes: newLikesCount 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      console.error('Database error during unlike:', dbError);
      
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
    console.error('Unlike photo error:', error);
    return new Response(JSON.stringify({ error: 'Failed to unlike photo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  
  if (context.request.method === 'DELETE') {
    return onRequestDelete(context);
  }
  
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}