import type { UsageData, UsageAlert } from './usage-monitor';

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export class DiscordNotifier {
  constructor(private webhookUrl: string) {}

  async sendUsageAlert(alerts: UsageAlert[]): Promise<void> {
    if (!alerts.length) return;

    const embed: DiscordEmbed = {
      title: '⚠️ Cloudflare使用量アラート',
      description: `${alerts.length}件のアラートが発生しています`,
      color: this.getAlertColor(alerts),
      fields: alerts.map(alert => ({
        name: `${this.getAlertEmoji(alert.level)} ${alert.service}`,
        value: `${Math.round(alert.percentage)}% 使用中\n${alert.message}`,
        inline: true
      })),
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Nekosama Gallery監視システム'
      }
    };

    await this.sendMessage({ embeds: [embed] });
  }

  async sendUsageSummary(usage: UsageData): Promise<void> {
    const embed: DiscordEmbed = {
      title: '📊 Cloudflare使用量サマリー',
      description: '現在の使用状況をお知らせします',
      color: 0x5865F2, // Discord blue
      fields: [
        {
          name: '📄 Pages',
          value: `月間ビルド: ${usage.pages.buildsMonthly}/500`,
          inline: true
        },
        {
          name: '💾 R2 Storage',
          value: `ストレージ: ${(usage.r2.storage / (1024**3)).toFixed(1)}GB/10GB\n操作: ${usage.r2.classAOperations.toLocaleString()}/1M`,
          inline: true
        },
        {
          name: '🗄️ D1 Database',
          value: `読取: ${usage.d1.readsDaily.toLocaleString()}/5M\n書込: ${usage.d1.writesDaily.toLocaleString()}/100K`,
          inline: true
        },
        {
          name: '⚡ Workers',
          value: `日次リクエスト: ${usage.workers.requestsDaily.toLocaleString()}/100K`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Nekosama Gallery監視システム'
      }
    };

    await this.sendMessage({ embeds: [embed] });
  }

  async sendError(title: string, error: string): Promise<void> {
    const embed: DiscordEmbed = {
      title: `🚨 ${title}`,
      description: error,
      color: 0xFF0000, // Red
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Nekosama Gallery監視システム'
      }
    };

    await this.sendMessage({ embeds: [embed] });
  }

  private async sendMessage(message: DiscordMessage): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  private getAlertColor(alerts: UsageAlert[]): number {
    const maxLevel = Math.max(...alerts.map(alert => {
      switch (alert.level) {
        case 'low': return 1;
        case 'medium': return 2;
        case 'high': return 3;
        case 'critical': return 4;
        case 'exceeded': return 5;
        default: return 0;
      }
    }));

    switch (maxLevel) {
      case 1: return 0x3498DB; // Blue
      case 2: return 0xF39C12; // Orange
      case 3: return 0xE67E22; // Dark orange
      case 4: return 0xE74C3C; // Red
      case 5: return 0x992D22; // Dark red
      default: return 0x95A5A6; // Gray
    }
  }

  private getAlertEmoji(level: string): string {
    switch (level) {
      case 'low': return '🔵';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      case 'exceeded': return '🚨';
      default: return '⚪';
    }
  }
}

// Convenience functions for backward compatibility
export async function sendDiscordNotification(webhookUrl: string, alerts: UsageAlert[]): Promise<void> {
  const notifier = new DiscordNotifier(webhookUrl);
  await notifier.sendUsageAlert(alerts);
}

export async function sendDiscordSummary(webhookUrl: string, usage: UsageData): Promise<void> {
  const notifier = new DiscordNotifier(webhookUrl);
  await notifier.sendUsageSummary(usage);
}

export async function sendDiscordError(webhookUrl: string, title: string, error: string): Promise<void> {
  const notifier = new DiscordNotifier(webhookUrl);
  await notifier.sendError(title, error);
}