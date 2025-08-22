// Development placeholder image API
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ width: string; height: string }> }
) {
  try {
    const { width, height } = await params;
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || 'Image';
    
    // Generate SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" opacity="0.8">
          ${text}
        </text>
        <circle cx="50%" cy="30%" r="20" fill="white" opacity="0.3"/>
        <circle cx="40%" cy="40%" r="15" fill="white" opacity="0.2"/>
        <circle cx="60%" cy="40%" r="12" fill="white" opacity="0.2"/>
        <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="white" opacity="0.6">
          ${width}x${height}
        </text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Placeholder image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}