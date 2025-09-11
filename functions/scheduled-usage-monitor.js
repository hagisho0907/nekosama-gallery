/**
 * Cloudflare Scheduled Function (Cron Triggers) for Usage Monitoring
 * 
 * To set up scheduled execution:
 * 1. In Cloudflare Dashboard, go to Workers & Pages > Overview
 * 2. Create a new Worker or use existing one
 * 3. Add Cron Triggers:
 *    - Every 6 hours: "0 */6 * * *"
 *    - Daily at 9 AM JST: "0 0 * * *" (UTC midnight = 9 AM JST)
 *    - Weekly summary: "0 0 * * 0" (Sunday at UTC midnight)
 */

import { d1Database } from '../lib/d1-db';
import { estimateUsage, generateUsageAlerts } from '../lib/usage-monitor';
import { SlackNotifier } from '../lib/slack-notifier';

export default {
  async scheduled(event, env, ctx) {
    console.log('Scheduled usage monitoring triggered:', event.cron);
    
    try {
      // D1データベースを初期化
      if (!env.DB) {
        throw new Error('D1 database binding not available');
      }
      d1Database.setDatabase(env.DB);

      // 使用量を推定
      const usageData = await estimateUsage(d1Database);
      console.log('Usage data collected:', {
        r2Storage: usageData.r2.storageUsed,
        d1Reads: usageData.d1.readsToday,
        d1Writes: usageData.d1.writesToday,
        workerRequests: usageData.workers.requestsToday
      });

      // アラートを生成
      const alerts = generateUsageAlerts(usageData);
      console.log(`Generated ${alerts.length} alerts`);

      // Slack通知の設定
      if (env.SLACK_WEBHOOK_URL) {
        const notifier = new SlackNotifier(env.SLACK_WEBHOOK_URL);
        
        // Cronの種類に応じて異なる動作
        if (event.cron === '0 0 * * 0') {
          // 週次サマリー（日曜日）
          console.log('Sending weekly usage summary');
          await notifier.sendUsageSummary(usageData);
        } else if (alerts.length > 0) {
          // 通常のアラート（警告レベルが medium 以上の場合のみ）
          const significantAlerts = alerts.filter(alert => 
            ['medium', 'high', 'critical', 'exceeded'].includes(alert.level)
          );
          
          if (significantAlerts.length > 0) {
            console.log(`Sending ${significantAlerts.length} significant alerts to Slack`);
            await notifier.sendUsageAlert(significantAlerts);
          } else {
            console.log('No significant alerts to send');
          }
        } else {
          console.log('No alerts generated, skipping Slack notification');
        }
      } else {
        console.log('Slack webhook URL not configured');
      }

      // 使用量履歴をKVに保存（オプション）
      if (env.USAGE_HISTORY) {
        const historyKey = `usage_${new Date().toISOString().split('T')[0]}`; // YYYY-MM-DD
        await env.USAGE_HISTORY.put(historyKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          usage: usageData,
          alerts: alerts.length,
          cronTrigger: event.cron
        }), {
          expirationTtl: 30 * 24 * 60 * 60 // 30日間保持
        });
        console.log('Usage history saved to KV');
      }

      console.log('Scheduled usage monitoring completed successfully');
      
    } catch (error) {
      console.error('Scheduled usage monitoring failed:', error);
      
      // エラーをSlackに通知
      if (env.SLACK_WEBHOOK_URL) {
        try {
          const notifier = new SlackNotifier(env.SLACK_WEBHOOK_URL);
          await notifier.sendError(
            '定期使用量監視でエラーが発生しました',
            `Cron: ${event.cron}\nError: ${error.message}\nStack: ${error.stack}`
          );
          console.log('Error notification sent to Slack');
        } catch (slackError) {
          console.error('Failed to send error notification to Slack:', slackError);
        }
      }

      // エラーを再スローしてCloudflareにも記録
      throw error;
    }
  },

  // Manual trigger endpoint (for testing)
  async fetch(request, env) {
    if (request.method === 'POST') {
      const url = new URL(request.url);
      
      if (url.pathname === '/manual-check') {
        console.log('Manual usage check triggered');
        
        // 手動実行（Cronイベントをシミュレート）
        const mockEvent = {
          cron: 'manual',
          scheduledTime: Date.now()
        };
        
        try {
          await this.scheduled(mockEvent, env, null);
          return new Response(JSON.stringify({
            success: true,
            message: 'Manual usage check completed',
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    return new Response(JSON.stringify({
      message: 'Scheduled Usage Monitor',
      endpoints: {
        'POST /manual-check': 'Trigger manual usage check'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};