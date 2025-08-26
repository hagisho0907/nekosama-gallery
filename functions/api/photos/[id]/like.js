// Cloudflare Pages Function for like API

export async function onRequestPost(context) {
  try {
    // Dynamic import for Cloudflare compatibility
    const { database } = await import('../../../../lib/db.ts');
    
    const { params } = context;
    const photoId = params.id;
    
    if (!photoId) {
      return new Response(JSON.stringify({ error: 'Photo ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newLikesCount = await database.incrementLikes(photoId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      likes: newLikesCount 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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