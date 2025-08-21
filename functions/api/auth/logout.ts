// Cloudflare Function for /api/auth/logout
export async function onRequestPost(): Promise<Response> {
  const response = new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Clear both auth cookies
  response.headers.append('Set-Cookie', 'admin-auth=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  response.headers.append('Set-Cookie', 'admin-auth-client=; Secure; SameSite=Lax; Max-Age=0; Path=/');
  
  return response;
}