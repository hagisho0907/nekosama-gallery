import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPassword) {
      // Create response with auth cookie
      const response = NextResponse.json({ success: true });
      
      // Set HTTP-only cookie for server-side verification
      response.cookies.set('admin-auth', 'authenticated', {
        httpOnly: true,
        secure: false, // Allow HTTP for localhost
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      
      // Also set a client-readable cookie for JavaScript access
      response.cookies.set('admin-auth-client', 'authenticated', {
        httpOnly: false, // Allow JavaScript access
        secure: false, // Allow HTTP for localhost
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      
      return response;
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}