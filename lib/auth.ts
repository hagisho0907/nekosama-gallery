import { NextRequest } from 'next/server';

export function checkAuth(request: NextRequest): boolean {
  const authCookie = request.cookies.get('admin-auth');
  return authCookie?.value === 'authenticated';
}

export function getAuthCookie(): string | null {
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    // Check for client-readable cookie
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('admin-auth-client='));
    return authCookie ? authCookie.split('=')[1].trim() : null;
  }
  return null;
}

export function isAuthenticated(): boolean;
export function isAuthenticated(request: NextRequest): boolean;
export function isAuthenticated(request?: NextRequest): boolean {
  if (request) {
    return checkAuth(request);
  }
  const authValue = getAuthCookie();
  return authValue === 'authenticated';
}