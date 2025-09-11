// Cloudflare無料枠の制限値
export const FREE_TIER_LIMITS = {
  pages: {
    buildsMonthly: 500, // 500ビルド/月
  },
  r2: {
    storage: 10 * 1024 * 1024 * 1024, // 10GB
    classAOperations: 1000000, // 100万操作/月
    classAOperationsDaily: 33333, // 約33k操作/日
    classBOperations: 10000000, // 1000万操作/月
    classBOperationsDaily: 333333, // 約333k操作/日
  },
  d1: {
    storage: 5 * 1024 * 1024 * 1024, // 5GB
    readsDaily: 5000000, // 500万読み取り/日
    writesDaily: 100000, // 10万書き込み/日
  },
  workers: {
    requestsDaily: 100000, // 10万リクエスト/日
    requestsMonthly: 3000000, // 300万リクエスト/月
  },
};

// 使用量の閾値（警告レベル）
export const WARNING_THRESHOLDS = {
  low: 0.5,    // 50%
  medium: 0.75, // 75%
  high: 0.9,    // 90%
  critical: 0.95, // 95%
};

// 使用量データの型定義
export interface UsageData {
  r2: {
    storage: number;
    storageUsed: string; // "1.2GB"形式
    classAOperations: number;
    classBOperations: number;
    lastUpdated: string;
  };
  d1: {
    storage: number;
    storageUsed: string;
    readsToday: number;
    writesToday: number;
    lastUpdated: string;
  };
  workers: {
    requestsToday: number;
    requestsThisMonth: number;
    lastUpdated: string;
  };
  pages: {
    buildsThisMonth: number;
    lastBuild: string;
    lastUpdated: string;
  };
}

export interface UsageAlert {
  service: string;
  metric: string;
  currentValue: number;
  limit: number;
  percentage: number;
  level: 'low' | 'medium' | 'high' | 'critical' | 'exceeded';
  message: string;
}

// 使用量の計算と警告レベルの判定
export function calculateUsagePercentage(current: number, limit: number): {
  percentage: number;
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'exceeded';
} {
  const percentage = (current / limit) * 100;
  
  let level: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'exceeded';
  if (percentage >= 100) {
    level = 'exceeded';
  } else if (percentage >= WARNING_THRESHOLDS.critical * 100) {
    level = 'critical';
  } else if (percentage >= WARNING_THRESHOLDS.high * 100) {
    level = 'high';
  } else if (percentage >= WARNING_THRESHOLDS.medium * 100) {
    level = 'medium';
  } else if (percentage >= WARNING_THRESHOLDS.low * 100) {
    level = 'low';
  } else {
    level = 'safe';
  }
  
  return { percentage, level };
}

// 使用量からアラートを生成
export function generateUsageAlerts(usage: UsageData): UsageAlert[] {
  const alerts: UsageAlert[] = [];

  // R2ストレージ
  const r2Storage = calculateUsagePercentage(usage.r2.storage, FREE_TIER_LIMITS.r2.storage);
  if (r2Storage.level !== 'safe') {
    alerts.push({
      service: 'R2',
      metric: 'ストレージ使用量',
      currentValue: usage.r2.storage,
      limit: FREE_TIER_LIMITS.r2.storage,
      percentage: r2Storage.percentage,
      level: r2Storage.level,
      message: `R2ストレージ使用量が${r2Storage.percentage.toFixed(1)}%に達しています (${usage.r2.storageUsed}/10GB)`
    });
  }

  // R2 Class A操作
  const r2ClassA = calculateUsagePercentage(usage.r2.classAOperations, FREE_TIER_LIMITS.r2.classAOperationsDaily);
  if (r2ClassA.level !== 'safe') {
    alerts.push({
      service: 'R2',
      metric: 'Class A操作数（今日）',
      currentValue: usage.r2.classAOperations,
      limit: FREE_TIER_LIMITS.r2.classAOperationsDaily,
      percentage: r2ClassA.percentage,
      level: r2ClassA.level,
      message: `R2 Class A操作数が${r2ClassA.percentage.toFixed(1)}%に達しています (${usage.r2.classAOperations.toLocaleString()}/日)`
    });
  }

  // D1読み取り
  const d1Reads = calculateUsagePercentage(usage.d1.readsToday, FREE_TIER_LIMITS.d1.readsDaily);
  if (d1Reads.level !== 'safe') {
    alerts.push({
      service: 'D1',
      metric: '読み取り回数（今日）',
      currentValue: usage.d1.readsToday,
      limit: FREE_TIER_LIMITS.d1.readsDaily,
      percentage: d1Reads.percentage,
      level: d1Reads.level,
      message: `D1読み取り回数が${d1Reads.percentage.toFixed(1)}%に達しています (${usage.d1.readsToday.toLocaleString()}/日)`
    });
  }

  // D1書き込み
  const d1Writes = calculateUsagePercentage(usage.d1.writesToday, FREE_TIER_LIMITS.d1.writesDaily);
  if (d1Writes.level !== 'safe') {
    alerts.push({
      service: 'D1',
      metric: '書き込み回数（今日）',
      currentValue: usage.d1.writesToday,
      limit: FREE_TIER_LIMITS.d1.writesDaily,
      percentage: d1Writes.percentage,
      level: d1Writes.level,
      message: `D1書き込み回数が${d1Writes.percentage.toFixed(1)}%に達しています (${usage.d1.writesToday.toLocaleString()}/日)`
    });
  }

  // Workers リクエスト
  const workerReqs = calculateUsagePercentage(usage.workers.requestsToday, FREE_TIER_LIMITS.workers.requestsDaily);
  if (workerReqs.level !== 'safe') {
    alerts.push({
      service: 'Workers',
      metric: 'リクエスト数（今日）',
      currentValue: usage.workers.requestsToday,
      limit: FREE_TIER_LIMITS.workers.requestsDaily,
      percentage: workerReqs.percentage,
      level: workerReqs.level,
      message: `Workersリクエスト数が${workerReqs.percentage.toFixed(1)}%に達しています (${usage.workers.requestsToday.toLocaleString()}/日)`
    });
  }

  // Pages ビルド
  const pagesBuilds = calculateUsagePercentage(usage.pages.buildsThisMonth, FREE_TIER_LIMITS.pages.buildsMonthly);
  if (pagesBuilds.level !== 'safe') {
    alerts.push({
      service: 'Pages',
      metric: 'ビルド回数（今月）',
      currentValue: usage.pages.buildsThisMonth,
      limit: FREE_TIER_LIMITS.pages.buildsMonthly,
      percentage: pagesBuilds.percentage,
      level: pagesBuilds.level,
      message: `Pagesビルド回数が${pagesBuilds.percentage.toFixed(1)}%に達しています (${usage.pages.buildsThisMonth}/月)`
    });
  }

  return alerts;
}

// バイト数を人間が読みやすい形式に変換
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)}${sizes[i]}`;
}

// 使用量の推定値を計算
export async function estimateUsage(db: any): Promise<UsageData> {
  try {
    // フォルダと写真の情報を取得
    const folders = await db.getFolders();
    let totalPhotos = 0;
    let estimatedStorageSize = 0;
    
    for (const folder of folders) {
      const photos = await db.getPhotos(folder.id);
      totalPhotos += photos.length;
      // 各写真の平均サイズを2MBと推定
      estimatedStorageSize += photos.length * 2 * 1024 * 1024;
    }

    const now = new Date().toISOString();
    
    return {
      r2: {
        storage: estimatedStorageSize,
        storageUsed: formatBytes(estimatedStorageSize),
        classAOperations: totalPhotos * 15, // 各写真が1日15回アクセスされると推定
        classBOperations: totalPhotos * 100, // 各写真が1日100回読み取られると推定
        lastUpdated: now,
      },
      d1: {
        storage: 20 * 1024 * 1024, // 20MB（データベース自体は軽量）
        storageUsed: formatBytes(20 * 1024 * 1024),
        readsToday: totalPhotos * 20 + folders.length * 50, // 推定読み取り回数
        writesToday: 10, // 1日平均10回の書き込み
        lastUpdated: now,
      },
      workers: {
        requestsToday: totalPhotos * 25, // API呼び出し推定
        requestsThisMonth: totalPhotos * 750, // 月間推定
        lastUpdated: now,
      },
      pages: {
        buildsThisMonth: 15, // 月15回程度のデプロイと推定
        lastBuild: now,
        lastUpdated: now,
      },
    };
  } catch (error) {
    console.error('Failed to estimate usage:', error);
    throw error;
  }
}