'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Send } from 'lucide-react';
import { calculateUsagePercentage } from '@/lib/usage-monitor';
import type { UsageData, UsageAlert } from '@/lib/usage-monitor';

interface UsageResponse {
  success: boolean;
  usage: UsageData;
  alerts: UsageAlert[];
  timestamp: string;
  error?: string;
}

export default function UsageMonitor() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingSlack, setSendingSlack] = useState(false);

  useEffect(() => {
    fetchUsageData();
    // 5分ごとに自動更新
    const interval = setInterval(fetchUsageData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsageData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/usage');
      const data: UsageResponse = await response.json();
      
      if (response.ok && data.success) {
        setUsage(data.usage);
        setAlerts(data.alerts);
        setLastUpdated(data.timestamp);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch usage data');
      }
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
      setError('Failed to fetch usage data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendSlackSummary = async () => {
    try {
      setSendingSlack(true);
      const response = await fetch('/api/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceSlackNotification: true }),
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        alert('Slackに使用量サマリーを送信しました！');
      } else {
        alert(`エラー: ${data.error || 'Slack通知の送信に失敗しました'}`);
      }
    } catch (err) {
      console.error('Failed to send Slack notification:', err);
      alert('Slack通知の送信に失敗しました');
    } finally {
      setSendingSlack(false);
    }
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'exceeded': return 'text-red-500';
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-400';
      default: return 'text-green-500';
    }
  };

  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'exceeded':
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      case 'high':
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getBgColor = (level: string) => {
    switch (level) {
      case 'exceeded':
      case 'critical':
        return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-400';
      default: return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-slate-700 rounded w-3/4"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            <div className="h-3 bg-slate-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-red-400">{error || 'Failed to load usage data'}</p>
          <button
            onClick={fetchUsageData}
            disabled={refreshing}
            className="text-red-300 hover:text-red-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-lg p-6 space-y-6"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          📊 使用量モニター
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={sendSlackSummary}
            disabled={sendingSlack}
            className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            title="Slackに送信"
          >
            <Send className={`w-5 h-5 ${sendingSlack ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={fetchUsageData}
            disabled={refreshing}
            className="text-gray-400 hover:text-gray-300 disabled:opacity-50 transition-colors"
            title="更新"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* アラート */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-orange-400">⚠️ 警告</h4>
          {alerts.slice(0, 3).map((alert, index) => (
            <div key={index} className="bg-orange-900/20 border border-orange-500/30 rounded p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className={getWarningColor(alert.level)}>
                  {getWarningIcon(alert.level)}
                </span>
                <span className="text-orange-200">{alert.message}</span>
              </div>
            </div>
          ))}
          {alerts.length > 3 && (
            <p className="text-xs text-gray-500">他 {alerts.length - 3} 件の警告があります</p>
          )}
        </div>
      )}

      {/* 使用量グラフ */}
      <div className="space-y-4">
        <UsageItem
          label="R2 ストレージ"
          current={usage.r2.storageUsed}
          limit="10GB"
          value={usage.r2.storage}
          maxValue={10 * 1024 * 1024 * 1024}
        />
        
        <UsageItem
          label="R2 Class A操作（今日）"
          current={usage.r2.classAOperations.toLocaleString()}
          limit="33,333"
          value={usage.r2.classAOperations}
          maxValue={33333}
        />
        
        <UsageItem
          label="D1 読み取り（今日）"
          current={usage.d1.readsToday.toLocaleString()}
          limit="5,000,000"
          value={usage.d1.readsToday}
          maxValue={5000000}
        />
        
        <UsageItem
          label="D1 書き込み（今日）"
          current={usage.d1.writesToday.toLocaleString()}
          limit="100,000"
          value={usage.d1.writesToday}
          maxValue={100000}
        />
        
        <UsageItem
          label="Workers リクエスト（今日）"
          current={usage.workers.requestsToday.toLocaleString()}
          limit="100,000"
          value={usage.workers.requestsToday}
          maxValue={100000}
        />
        
        <UsageItem
          label="Pages ビルド（今月）"
          current={usage.pages.buildsThisMonth.toString()}
          limit="500"
          value={usage.pages.buildsThisMonth}
          maxValue={500}
        />
      </div>
      
      {/* フッター */}
      <div className="pt-4 border-t border-slate-700 space-y-2">
        <p className="text-xs text-gray-500">
          最終更新: {lastUpdated ? new Date(lastUpdated).toLocaleString('ja-JP') : '不明'}
        </p>
        <p className="text-xs text-gray-500">
          ※ 推定値です。実際の使用量は
          <a 
            href="https://dash.cloudflare.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 underline ml-1"
          >
            Cloudflareダッシュボード
          </a>
          で確認してください
        </p>
      </div>
    </motion.div>
  );
}

function UsageItem({ 
  label, 
  current, 
  limit, 
  value,
  maxValue
}: { 
  label: string;
  current: string;
  limit: string;
  value: number;
  maxValue: number;
}) {
  const { percentage, level } = calculateUsagePercentage(value, maxValue);
  
  const color = level === 'exceeded' || level === 'critical' ? 'text-red-500' : 
                level === 'high' ? 'text-orange-500' : 
                level === 'medium' ? 'text-yellow-500' : 
                level === 'low' ? 'text-blue-400' : 
                'text-green-500';
  
  const bgColor = level === 'exceeded' || level === 'critical' ? 'bg-red-500' : 
                  level === 'high' ? 'bg-orange-500' : 
                  level === 'medium' ? 'bg-yellow-500' : 
                  level === 'low' ? 'bg-blue-400' : 
                  'bg-green-500';
  
  const icon = level === 'exceeded' || level === 'critical' ? <XCircle className="w-4 h-4" /> :
               level === 'high' || level === 'medium' ? <AlertTriangle className="w-4 h-4" /> :
               <CheckCircle className="w-4 h-4" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={color}>{icon}</span>
          <span className="text-gray-300">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-white font-medium">{current}</span>
          <span className="text-gray-500"> / {limit}</span>
        </div>
      </div>
      <div className="relative w-full bg-slate-700 rounded-full h-2">
        <motion.div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${bgColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className={`text-xs text-right ${color}`}>
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
}