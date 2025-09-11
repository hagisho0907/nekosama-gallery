// Temporary debug endpoint to check environment variables
export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { env } = context;
    
    // Check if DISCORD_WEBHOOK_URL exists and show partial info for security
    const discordUrl = env.DISCORD_WEBHOOK_URL;
    const hasDiscordUrl = !!discordUrl;
    const discordUrlPreview = discordUrl ? 
      `${discordUrl.substring(0, 50)}...${discordUrl.substring(discordUrl.length - 10)}` : 
      'NOT_SET';
    
    return new Response(JSON.stringify({
      hasDiscordWebhookUrl: hasDiscordUrl,
      discordUrlPreview,
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