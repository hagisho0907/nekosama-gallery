// Temporary endpoint to test Discord webhook directly
export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { env } = context;
    
    if (!env.DISCORD_WEBHOOK_URL) {
      return new Response(JSON.stringify({
        error: 'DISCORD_WEBHOOK_URL not set',
        envKeys: Object.keys(env)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test Discord webhook
    const testMessage = {
      embeds: [{
        title: '🧪 Discord通知テスト',
        description: 'Nekosama Gallery監視システムのDiscord通知テストです',
        color: 0x00FF00, // Green
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Nekosama Gallery監視システム'
        }
      }]
    };

    console.log('Testing Discord webhook:', env.DISCORD_WEBHOOK_URL.substring(0, 50) + '...');
    
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    const responseText = await response.text();
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseText,
      webhookUrl: env.DISCORD_WEBHOOK_URL.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Discord test failed:', error);
    
    return new Response(JSON.stringify({
      error: 'Discord test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}