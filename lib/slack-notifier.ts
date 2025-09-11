import type { UsageData, UsageAlert } from './usage-monitor';

interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: any[];
  fields?: SlackField[];
}

interface SlackField {
  type: string;
  text: string;
  emoji?: boolean;
}

interface SlackAttachment {
  color: string;
  blocks: SlackBlock[];
}

export class SlackNotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  // アラートレベルに基づく色を取得
  private getAlertColor(level: string): string {
    switch (level) {
      case 'critical':
      case 'exceeded':
        return '#FF0000'; // 赤
      case 'high':
        return '#FF9800'; // オレンジ  
      case 'medium':
        return '#FFEB3B'; // 黄色
      case 'low':
        return '#2196F3'; // 青
      default:
        return '#4CAF50'; // 緑
    }
  }

  // アラートレベルに基づく絵文字を取得
  private getAlertEmoji(level: string): string {
    switch (level) {
      case 'critical':
      case 'exceeded':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '📊';
      case 'low':
        return 'ℹ️';
      default:
        return '✅';
    }
  }

  // 使用量アラートをSlackに送信
  async sendUsageAlert(alerts: UsageAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    // 最も重要なアラートレベルを決定
    const maxLevel = this.getMaxAlertLevel(alerts);
    const emoji = this.getAlertEmoji(maxLevel);
    const color = this.getAlertColor(maxLevel);

    const message: SlackMessage = {
      text: `${emoji} ねこ様ギャラリー - Cloudflare使用量アラート`,
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} Cloudflare使用量アラート`,
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${alerts.length}件*のサービスで使用量の閾値を超えています`
              }
            },
            {
              type: 'divider'
            },
            ...this.createAlertBlocks(alerts),
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `📅 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
                }
              ]
            }
          ]
        }
      ]
    };

    await this.sendMessage(message);
  }

  // 使用量サマリーをSlackに送信
  async sendUsageSummary(usage: UsageData): Promise<void> {
    const message: SlackMessage = {
      text: '📊 ねこ様ギャラリー - 使用量レポート',
      attachments: [
        {
          color: '#4CAF50',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '📊 Cloudflare使用量レポート',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*R2 ストレージ*\n${usage.r2.storageUsed} / 10GB`
                },
                {
                  type: 'mrkdwn',
                  text: `*D1 ストレージ*\n${usage.d1.storageUsed} / 5GB`
                },
                {
                  type: 'mrkdwn',
                  text: `*D1 読み取り（今日）*\n${usage.d1.readsToday.toLocaleString()} / 5,000,000`
                },
                {
                  type: 'mrkdwn',
                  text: `*D1 書き込み（今日）*\n${usage.d1.writesToday.toLocaleString()} / 100,000`
                },
                {
                  type: 'mrkdwn',
                  text: `*Workers リクエスト（今日）*\n${usage.workers.requestsToday.toLocaleString()} / 100,000`
                },
                {
                  type: 'mrkdwn',
                  text: `*Pages ビルド（今月）*\n${usage.pages.buildsThisMonth} / 500`
                }
              ]
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `📅 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} | <https://dash.cloudflare.com|Cloudflareダッシュボード>`
                }
              ]
            }
          ]
        }
      ]
    };

    await this.sendMessage(message);
  }

  // エラー通知をSlackに送信
  async sendError(error: string, details?: string): Promise<void> {
    const message: SlackMessage = {
      text: '❌ ねこ様ギャラリー - エラー通知',
      attachments: [
        {
          color: '#FF0000',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '❌ システムエラーが発生しました',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*エラー内容:*\n${error}`
              }
            },
            ...(details ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*詳細:*\n\`\`\`${details}\`\`\``
                }
              }
            ] : []),
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `📅 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
                }
              ]
            }
          ]
        }
      ]
    };

    await this.sendMessage(message);
  }

  // アラートブロックを作成
  private createAlertBlocks(alerts: UsageAlert[]): SlackBlock[] {
    const blocks: SlackBlock[] = [];

    for (const alert of alerts) {
      const emoji = this.getAlertEmoji(alert.level);
      const progressBar = this.createProgressBar(alert.percentage);
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${alert.service} - ${alert.metric}*\n` +
                `${progressBar} ${alert.percentage.toFixed(1)}%\n` +
                `${alert.currentValue.toLocaleString()} / ${alert.limit.toLocaleString()}`
        }
      });
    }

    return blocks;
  }

  // プログレスバーを作成
  private createProgressBar(percentage: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    let bar = '';
    for (let i = 0; i < filledBlocks; i++) {
      if (percentage >= 95) bar += '🟥';
      else if (percentage >= 90) bar += '🟨';
      else if (percentage >= 75) bar += '🟨';
      else bar += '🟩';
    }
    for (let i = 0; i < emptyBlocks; i++) {
      bar += '⬜';
    }
    
    return bar;
  }

  // 最も重要なアラートレベルを取得
  private getMaxAlertLevel(alerts: UsageAlert[]): string {
    const levelPriority = {
      'exceeded': 5,
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
      'safe': 0
    };

    let maxLevel = 'safe';
    let maxPriority = 0;

    for (const alert of alerts) {
      const priority = levelPriority[alert.level as keyof typeof levelPriority];
      if (priority > maxPriority) {
        maxPriority = priority;
        maxLevel = alert.level;
      }
    }

    return maxLevel;
  }

  // Slackメッセージを送信
  private async sendMessage(message: SlackMessage): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      console.log('Slack notification sent successfully');
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      throw error;
    }
  }
}

// 環境変数からSlack通知を送信するヘルパー関数
export async function sendSlackNotification(
  webhookUrl: string,
  alerts: UsageAlert[]
): Promise<void> {
  const notifier = new SlackNotifier(webhookUrl);
  await notifier.sendUsageAlert(alerts);
}

export async function sendSlackSummary(
  webhookUrl: string,
  usage: UsageData
): Promise<void> {
  const notifier = new SlackNotifier(webhookUrl);
  await notifier.sendUsageSummary(usage);
}

export async function sendSlackError(
  webhookUrl: string,
  error: string,
  details?: string
): Promise<void> {
  const notifier = new SlackNotifier(webhookUrl);
  await notifier.sendError(error, details);
}