import { NextResponse } from 'next/server';

export async function GET() {
  // Only show debug info in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoint only available in development' }, { status: 404 });
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    r2Config: {
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasEndpoint: !!process.env.R2_ENDPOINT,
      hasBucketName: !!process.env.R2_BUCKET_NAME,
      hasRegion: !!process.env.R2_REGION,
      endpoint: process.env.R2_ENDPOINT?.substring(0, 30) + '...' || 'not set',
      bucketName: process.env.R2_BUCKET_NAME || 'not set',
      region: process.env.R2_REGION || 'not set'
    },
    timestamp: new Date().toISOString()
  });
}