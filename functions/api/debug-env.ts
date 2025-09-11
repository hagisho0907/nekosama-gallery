// Temporary debug endpoint to check environment variables
export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { env } = context;
    
    // Check if SLACK_WEBHOOK_URL exists and show partial info for security
    const slackUrl = env.SLACK_WEBHOOK_URL;
    const hasSlackUrl = !!slackUrl;
    const slackUrlPreview = slackUrl ? 
      `${slackUrl.substring(0, 50)}...${slackUrl.substring(slackUrl.length - 10)}` : 
      'NOT_SET';
    
    return new Response(JSON.stringify({
      hasSlackWebhookUrl: hasSlackUrl,
      slackUrlPreview,
      envKeys: Object.keys(env).filter(key => !key.includes('SECRET') && !key.includes('PASSWORD')),
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Failed to check environment',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}