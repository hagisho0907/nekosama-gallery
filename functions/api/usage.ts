// Cloudflare Function for /api/usage
import { d1Database } from '../../lib/d1-db';
import { checkAuth } from '../../lib/auth';
import { estimateUsage, generateUsageAlerts } from '../../lib/usage-monitor';
import { sendSlackNotification } from '../../lib/slack-notifier';
import type { UsageData } from '../../lib/usage-monitor';

export async function onRequestGet(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    // 認証チェック（管理者のみアクセス可能）
    if (!checkAuth(request)) {
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

    // 警告レベルが高いアラートがある場合、Slack通知を送信
    if (alerts.length > 0 && env.SLACK_WEBHOOK_URL) {
      const criticalAlerts = alerts.filter(alert => 
        ['high', 'critical', 'exceeded'].includes(alert.level)
      );
      
      if (criticalAlerts.length > 0) {
        try {
          await sendSlackNotification(env.SLACK_WEBHOOK_URL, criticalAlerts);
          console.log(`Sent Slack notification for ${criticalAlerts.length} critical alerts`);
        } catch (slackError) {
          console.error('Failed to send Slack notification:', slackError);
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
    
    // エラーをSlackに通知
    if (context.env.SLACK_WEBHOOK_URL) {
      try {
        const { sendSlackError } = await import('../../lib/slack-notifier');
        await sendSlackError(
          context.env.SLACK_WEBHOOK_URL,
          '使用量監視APIでエラーが発生しました',
          error.message
        );
      } catch (slackError) {
        console.error('Failed to send error notification to Slack:', slackError);
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
    if (!checkAuth(request)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json();
    const { forceSlackNotification = false } = body;

    console.log('Manual usage check requested, force Slack:', forceSlackNotification);

    // D1データベースを初期化
    d1Database.setDatabase(env.DB);

    // 使用量を推定
    const usageData: UsageData = await estimateUsage(d1Database);

    // アラートを生成
    const alerts = generateUsageAlerts(usageData);

    // Slack通知を送信（手動実行時は強制送信可能）
    if (env.SLACK_WEBHOOK_URL) {
      try {
        if (forceSlackNotification || alerts.length > 0) {
          if (forceSlackNotification) {
            const { sendSlackSummary } = await import('../../lib/slack-notifier');
            await sendSlackSummary(env.SLACK_WEBHOOK_URL, usageData);
            console.log('Sent Slack usage summary (manual)');
          } else {
            await sendSlackNotification(env.SLACK_WEBHOOK_URL, alerts);
            console.log(`Sent Slack notification for ${alerts.length} alerts`);
          }
        }
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to send Slack notification',
          details: slackError.message,
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
      message: forceSlackNotification ? 'Usage summary sent to Slack' : 'Usage check completed',
      usage: usageData,
      alerts: alerts,
      slackNotificationSent: !!(env.SLACK_WEBHOOK_URL && (forceSlackNotification || alerts.length > 0)),
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