// Cloudflare Function for /api/debug
interface CloudflareEnv {
  DB: D1Database;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_PUBLIC_URL?: string;
  ADMIN_PASSWORD?: string;
}

export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  
  return new Response(JSON.stringify({
    environment: 'production', // Cloudflare Functions environment
    authConfig: {
      hasAdminPassword: !!env.ADMIN_PASSWORD,
      adminPasswordLength: env.ADMIN_PASSWORD?.length || 0,
    },
    r2Config: {
      hasAccessKey: !!env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!env.R2_SECRET_ACCESS_KEY,
      hasEndpoint: !!env.R2_ENDPOINT,
      hasBucketName: !!env.R2_BUCKET_NAME,
      hasPublicUrl: !!env.R2_PUBLIC_URL,
      endpoint: env.R2_ENDPOINT?.substring(0, 30) + '...' || 'not set',
      bucketName: env.R2_BUCKET_NAME || 'not set',
    },
    d1Config: {
      hasDatabase: !!env.DB,
    },
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}