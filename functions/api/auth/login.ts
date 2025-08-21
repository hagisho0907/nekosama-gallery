// Cloudflare Function for /api/auth/login
interface CloudflareEnv {
  DB: D1Database;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_PUBLIC_URL?: string;
  ADMIN_PASSWORD?: string;
}

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    const { password } = await request.json();

    // Check password against environment variable
    const adminPassword = env.ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPassword) {
      // Create response with auth cookie
      const response = new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Set HTTP-only cookie for server-side verification
      response.headers.append('Set-Cookie', `admin-auth=authenticated; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`);
      
      // Also set a client-readable cookie for JavaScript access
      response.headers.append('Set-Cookie', `admin-auth-client=authenticated; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`);
      
      return response;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}