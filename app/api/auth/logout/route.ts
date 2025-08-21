import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear both auth cookies
  response.cookies.set('admin-auth', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  
  response.cookies.set('admin-auth-client', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  
  return response;
}