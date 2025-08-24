'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Rocket, Shield, ArrowLeft, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative flex items-center justify-center">
      {/* Space stars background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="twinkling"></div>
      </div>
      <style jsx>{`
        .stars, .twinkling {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
        .stars {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="10" r="0.5" fill="white" opacity="0.8"/><circle cx="30" cy="25" r="0.3" fill="white" opacity="0.6"/><circle cx="60" cy="15" r="0.4" fill="white" opacity="0.7"/><circle cx="80" cy="40" r="0.2" fill="white" opacity="0.5"/><circle cx="20" cy="60" r="0.3" fill="white" opacity="0.6"/><circle cx="70" cy="70" r="0.5" fill="white" opacity="0.8"/><circle cx="90" cy="80" r="0.2" fill="white" opacity="0.4"/></svg>') repeat;
          animation: move-stars 200s linear infinite;
        }
        .twinkling {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="25" cy="35" r="0.2" fill="cyan" opacity="0.9"/><circle cx="75" cy="55" r="0.1" fill="yellow" opacity="0.8"/><circle cx="15" cy="80" r="0.15" fill="white" opacity="0.7"/></svg>') repeat;
          animation: move-twinkling 100s linear infinite;
        }
        @keyframes move-stars {
          from { transform: translateX(0); }
          to { transform: translateX(-100px); }
        }
        @keyframes move-twinkling {
          from { transform: translateX(0); }
          to { transform: translateX(-200px); }
        }
      `}</style>

      <motion.div 
        className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-blue-500/30"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-blue-400/30"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            宇宙船制御センター
          </h1>
          <p className="text-blue-300 text-sm">
            管理者認証が必要です
          </p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-red-900/30 backdrop-blur border border-red-400/50 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        <motion.form 
          onSubmit={handleLogin} 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-blue-300 mb-2">
              アクセスコード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="セキュリティコードを入力..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300/50 backdrop-blur transition-all duration-200"
              disabled={loading}
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading || !password.trim()}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg
              ${loading || !password.trim()
                ? 'bg-slate-600 cursor-not-allowed text-slate-400'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
              }
            `}
            whileHover={loading || !password.trim() ? {} : { scale: 1.02 }}
            whileTap={loading || !password.trim() ? {} : { scale: 0.98 }}
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                  認証中...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  宇宙船にアクセス
                </>
              )}
            </span>
          </motion.button>
        </motion.form>

        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <motion.a 
            href="/"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-2 transition-colors duration-200"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-4 h-4" />
            宇宙ステーションに戻る
          </motion.a>
        </motion.div>
      </motion.div>
    </div>
  );
}