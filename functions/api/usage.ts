// Cloudflare Function for /api/usage
import { d1Database } from '../../lib/d1-db';
import { estimateUsage, generateUsageAlerts } from '../../lib/usage-monitor';
import { sendDiscordNotification, sendDiscordSummary, sendDiscordError } from '../../lib/discord-notifier';
import type { UsageData } from '../../lib/usage-monitor';

// Pages Functions用のクッキー認証チェック
function checkPagesAuth(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return false;
  
  return cookieHeader.includes('admin-auth=authenticated') || 
         cookieHeader.includes('admin-auth-client=authenticated');
}

export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    // 認証チェック（管理者のみアクセス可能）
    if (!checkPagesAuth(request)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Usage monitoring API called');

    // D1データベースを初期化
    d1Database.setDatabase(env.DB);

    // 使用量を推定
    const usageData: UsageData = await estimateUsage(d1Database);

    // アラートを生成
    const alerts = generateUsageAlerts(usageData);

    // 警告レベルが高いアラートがある場合、通知を送信
    if (alerts.length > 0) {
      const criticalAlerts = alerts.filter(alert => 
        ['high', 'critical', 'exceeded'].includes(alert.level)
      );
      
      if (criticalAlerts.length > 0) {
        // Discord通知を送信
        if (env.DISCORD_WEBHOOK_URL) {
          try {
            await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, criticalAlerts);
            console.log(`Sent Discord notification for ${criticalAlerts.length} critical alerts`);
          } catch (discordError) {
            console.error('Failed to send Discord notification:', discordError);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      usage: usageData,
      alerts: alerts,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Usage monitoring error:', error);
    
    // エラーをDiscordに通知
    if (context.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendDiscordError(
          context.env.DISCORD_WEBHOOK_URL,
          '使用量監視APIでエラーが発生しました',
          error.message
        );
      } catch (discordError) {
        console.error('Failed to send error notification to Discord:', discordError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST endpoint for manual usage check with optional Slack notification
export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    // 認証チェック（管理者のみアクセス可能）
    if (!checkPagesAuth(request)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json();
    const { forceNotification = false } = body;

    console.log('Manual usage check requested, force notification:', forceNotification);

    // D1データベースを初期化
    d1Database.setDatabase(env.DB);

    // 使用量を推定
    const usageData: UsageData = await estimateUsage(d1Database);

    // アラートを生成
    const alerts = generateUsageAlerts(usageData);

    // Discord通知を送信（手動実行時は強制送信可能）
    const shouldSendNotification = forceNotification || alerts.length > 0;
    let notificationSent = false;
    let notificationError: string | null = null;

    if (shouldSendNotification && env.DISCORD_WEBHOOK_URL) {
      try {
        if (forceNotification) {
          await sendDiscordSummary(env.DISCORD_WEBHOOK_URL, usageData);
          console.log('Sent Discord usage summary (manual)');
        } else {
          await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, alerts);
          console.log(`Sent Discord notification for ${alerts.length} alerts`);
        }
        notificationSent = true;
      } catch (discordError) {
        console.error('Failed to send Discord notification:', discordError);
        notificationError = discordError instanceof Error ? discordError.message : String(discordError);
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to send Discord notification',
          details: notificationError,
          usage: usageData,
          alerts: alerts
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: forceNotification ? 'Usage summary sent to Discord' : 'Usage check completed',
      usage: usageData,
      alerts: alerts,
      notificationSent,
      notificationChannel: env.DISCORD_WEBHOOK_URL ? 'Discord' : 'None',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Manual usage check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}