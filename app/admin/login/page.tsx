'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to admin page
    if (isAuthenticated()) {
      router.push('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, cookies:', document.cookie);
        // Force page refresh after login to ensure cookies are recognized
        window.location.href = '/admin';
      } else {
        console.log('Login failed:', data);
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center">
      <div className="bg-white dark:bg-amber-800 rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">
            管理者ログイン
          </h1>
          <p className="text-amber-700 dark:text-amber-300">
            管理者ページにアクセスするためのパスワードを入力してください
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力..."
              className="w-full px-4 py-3 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-amber-700 dark:text-white"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-amber-800 hover:bg-amber-900 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a 
            href="/"
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-sm"
          >
            ← ギャラリーに戻る
          </a>
        </div>
      </div>
    </div>
  );
}