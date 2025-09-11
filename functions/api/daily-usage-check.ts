// Cloudflare Function for daily usage monitoring
// This endpoint can be called by external cron services or Cloudflare Workers
import { d1Database } from '../../lib/d1-db';
import { estimateUsage, generateUsageAlerts } from '../../lib/usage-monitor';
import { sendSlackNotification, sendSlackSummary } from '../../lib/slack-notifier';
import type { UsageData } from '../../lib/usage-monitor';

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    console.log('Daily usage check triggered');

    // 認証チェック（秘密キーまたはUser-Agentでの簡易認証）
    const authHeader = request.headers.get('Authorization');
    const userAgent = request.headers.get('User-Agent');
    const body = await request.json().catch(() => ({}));
    const { secret } = body;
    
    // 認証方法: 
    // 1. Authorization ヘッダー
    // 2. 環境変数で設定された秘密キー
    // 3. 特定のUser-Agentパターン（GitHub Actions, cron-job.org等）
    const isAuthorized = 
      (authHeader && authHeader === `Bearer ${env.DAILY_CHECK_SECRET}`) ||
      (secret && secret === env.DAILY_CHECK_SECRET) ||
      (env.DAILY_CHECK_SECRET && secret === env.DAILY_CHECK_SECRET) ||
      (userAgent && (
        userAgent.includes('github-actions') ||
        userAgent.includes('cron-job.org') ||
        userAgent.includes('UptimeRobot') ||
        userAgent.includes('EasyCron')
      ));

    if (!isAuthorized && env.DAILY_CHECK_SECRET) {
      console.log('Unauthorized daily check attempt');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Valid secret key or authorized user agent required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // D1データベースを初期化
    if (!env.DB) {
      throw new Error('D1 database binding not available');
    }
    d1Database.setDatabase(env.DB);

    // 使用量を推定
    const usageData: UsageData = await estimateUsage(d1Database);
    console.log('Daily usage data collected:', {
      r2Storage: usageData.r2.storageUsed,
      d1Reads: usageData.d1.readsToday,
      d1Writes: usageData.d1.writesToday,
      workerRequests: usageData.workers.requestsToday
    });

    // アラートを生成
    const alerts = generateUsageAlerts(usageData);
    console.log(`Generated ${alerts.length} usage alerts`);

    let slackNotificationSent = false;
    let notificationType = 'none';

    // Slack通知の送信
    if (env.SLACK_WEBHOOK_URL) {
      try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const { forceDaily = false, summaryOnly = false } = body;

        if (summaryOnly || dayOfWeek === 0) {
          // 日曜日または強制サマリーモード：週次サマリーを送信
          console.log('Sending weekly usage summary to Slack');
          await sendSlackSummary(env.SLACK_WEBHOOK_URL, usageData);
          slackNotificationSent = true;
          notificationType = 'weekly_summary';
        } else if (forceDaily || alerts.length > 0) {
          // 平日でアラートがある場合、または強制実行の場合
          if (forceDaily) {
            console.log('Sending forced daily summary to Slack');
            await sendSlackSummary(env.SLACK_WEBHOOK_URL, usageData);
            notificationType = 'daily_summary';
          } else {
            // 重要なアラートのみ送信（medium以上）
            const significantAlerts = alerts.filter(alert => 
              ['medium', 'high', 'critical', 'exceeded'].includes(alert.level)
            );
            
            if (significantAlerts.length > 0) {
              console.log(`Sending ${significantAlerts.length} significant alerts to Slack`);
              await sendSlackNotification(env.SLACK_WEBHOOK_URL, significantAlerts);
              notificationType = 'alerts';
            } else {
              console.log('No significant alerts to send');
            }
          }
          slackNotificationSent = true;
        } else {
          console.log('No alerts or special conditions, skipping Slack notification');
        }
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
        // Slackエラーでも処理は続行
      }
    } else {
      console.log('Slack webhook URL not configured');
    }

    // 使用量履歴をKVに保存（オプション）
    if (env.USAGE_HISTORY) {
      try {
        const historyKey = `daily_usage_${new Date().toISOString().split('T')[0]}`; // YYYY-MM-DD
        await env.USAGE_HISTORY.put(historyKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          usage: usageData,
          alerts: alerts.length,
          significantAlerts: alerts.filter(a => ['medium', 'high', 'critical', 'exceeded'].includes(a.level)).length,
          slackNotificationSent,
          notificationType
        }), {
          expirationTtl: 90 * 24 * 60 * 60 // 90日間保持
        });
        console.log('Daily usage history saved to KV');
      } catch (kvError) {
        console.error('Failed to save usage history to KV:', kvError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily usage check completed',
      timestamp: new Date().toISOString(),
      usage: usageData,
      alerts: alerts.length,
      significantAlerts: alerts.filter(a => ['medium', 'high', 'critical', 'exceeded'].includes(a.level)).length,
      slackNotificationSent,
      notificationType,
      nextCheck: 'Tomorrow at the same time'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Daily usage check failed:', error);
    
    // エラーをSlackに通知
    if (context.env.SLACK_WEBHOOK_URL) {
      try {
        const { sendSlackError } = await import('../../lib/slack-notifier');
        await sendSlackError(
          context.env.SLACK_WEBHOOK_URL,
          '日次使用量チェックでエラーが発生しました',
          `Error: ${error.message}\nStack: ${error.stack}`
        );
        console.log('Error notification sent to Slack');
      } catch (slackError) {
        console.error('Failed to send error notification to Slack:', slackError);
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Daily usage check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET endpoint for health check
export async function onRequestGet(context: any): Promise<Response> {
  return new Response(JSON.stringify({
    service: 'Daily Usage Check',
    status: 'active',
    description: 'Send POST request to trigger daily usage monitoring',
    authentication: 'Requires secret key or authorized User-Agent',
    schedule: 'Call this endpoint daily via external cron service',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}