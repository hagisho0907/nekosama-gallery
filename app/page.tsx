'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Sparkles, 
  Stars, 
  Zap, 
  Camera, 
  FolderOpen, 
  Upload, 
  ArrowLeft, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Twitter,
  Instagram,
  Globe
} from 'lucide-react';
import { compressImage, COMPRESSION_PRESETS } from '@/lib/image-compression';

type CatPhoto = {
  id: string;
  url: string;
  originalName: string;
  uploadedAt: string;
};

type CatFolder = {
  id: string;
  name: string;
  displayOrder: number;
  status: 'enrolled' | 'graduated'; // enrolled: 在籍生, graduated: 卒業生
  photos: CatPhoto[];
  photoCount: number;
  createdAt: string;
  updatedAt: string;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Home() {
  const [folders, setFolders] = useState<CatFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFolderData, setSelectedFolderData] = useState<CatFolder | null>(null);
  const [uploadingFolder, setUploadingFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'graduated'>('enrolled');
  const detailUploadRef = useRef<HTMLInputElement>(null);

  const triggerFileUpload = (folderId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const syntheticEvent = {
          target: target,
          currentTarget: target
        } as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(folderId, syntheticEvent);
      }
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  // Refresh data when returning from admin or other pages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if data was updated in admin
        const lastUpdate = localStorage.getItem('nekosama_data_updated');
        
        if (lastUpdate && parseInt(lastUpdate) > (Date.now() - 60000)) { // Updated within last minute
          localStorage.removeItem('nekosama_data_updated');
          fetchFolders();
        } else {
          fetchFolders();
        }
      }
    };

    const handleFocus = () => {
      // Check for data updates when window gains focus
      const lastUpdate = localStorage.getItem('nekosama_data_updated');
      if (lastUpdate) {
        localStorage.removeItem('nekosama_data_updated');
        fetchFolders();
      } else {
        fetchFolders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/folders');
      const data = await response.json();
      
      if (response.ok) {
        setFolders(data.folders);
      } else {
        setError(data.error || 'Failed to load folders');
      }
    } catch (err) {
      setError('Failed to load folders');
      console.error('Error fetching folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderDetails = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedFolderData(data.folder);
      } else {
        setError(data.error || 'Failed to load folder details');
      }
    } catch (err) {
      setError('Failed to load folder details');
      console.error('Error fetching folder details:', err);
    }
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
    fetchFolderDetails(folderId);
  };

  const handleFileUpload = async (folderId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploadingFolder(folderId);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`);
        }

        console.log(`Original file: ${file.name} (${formatFileSize(file.size)})`);
        
        // Compress image before upload (default: low quality)
        let processedFile = file;
        try {
          processedFile = await compressImage(file, COMPRESSION_PRESETS.low);
          console.log(`Compressed file: ${processedFile.name} (${formatFileSize(processedFile.size)})`);
        } catch (compressionError) {
          console.warn('Image compression failed, using original file:', compressionError);
          // Continue with original file if compression fails
        }

        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('folderId', folderId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }
        
        return data;
      });

      const results = await Promise.all(uploadPromises);
      
      // Show success message if any uploads included auto-deletion
      const hasAutoDeletion = results.some(result => result.message?.includes('古い写真を自動削除'));
      if (hasAutoDeletion) {
        setSuccessMessage('写真をアップロードしました。古い写真を自動削除して最大100枚を維持しています。');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
      
      // Refresh folders list
      await fetchFolders();
      
      // If we're viewing a specific folder, refresh its details
      if (selectedFolder === folderId) {
        await fetchFolderDetails(folderId);
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploadingFolder(null);
      // Clear the file input
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="stars"></div>
          <div className="twinkling"></div>
        </div>
        <motion.div 
          className="text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative mx-auto mb-6"
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity }
            }}
          >
            <Rocket className="w-16 h-16 text-blue-400 mx-auto" />
            <motion.div
              className="absolute -inset-4 rounded-full border-2 border-blue-400/30"
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          <motion.p 
            className="text-blue-300 text-lg font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            宇宙船システム起動中...
          </motion.p>
        </motion.div>
        <style jsx>{`
          .stars, .twinkling {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
          .stars {
            background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="15" cy="8" r="0.4" fill="white" opacity="0.7"/><circle cx="45" cy="22" r="0.2" fill="white" opacity="0.5"/><circle cx="75" cy="12" r="0.5" fill="white" opacity="0.8"/><circle cx="25" cy="45" r="0.3" fill="white" opacity="0.6"/><circle cx="85" cy="35" r="0.2" fill="white" opacity="0.4"/><circle cx="55" cy="65" r="0.4" fill="white" opacity="0.7"/><circle cx="8" cy="78" r="0.3" fill="white" opacity="0.6"/><circle cx="92" cy="88" r="0.2" fill="white" opacity="0.5"/><circle cx="38" cy="85" r="0.2" fill="white" opacity="0.4"/></svg>') repeat;
            animation: move-stars 200s linear infinite;
          }
          .twinkling {
            background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="32" cy="18" r="0.15" fill="cyan" opacity="0.9"/><circle cx="68" cy="42" r="0.2" fill="yellow" opacity="0.8"/><circle cx="12" cy="65" r="0.1" fill="white" opacity="0.7"/><circle cx="88" cy="75" r="0.15" fill="cyan" opacity="0.6"/></svg>') repeat;
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
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
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="15" cy="8" r="0.4" fill="white" opacity="0.7"/><circle cx="45" cy="22" r="0.2" fill="white" opacity="0.5"/><circle cx="75" cy="12" r="0.5" fill="white" opacity="0.8"/><circle cx="25" cy="45" r="0.3" fill="white" opacity="0.6"/><circle cx="85" cy="35" r="0.2" fill="white" opacity="0.4"/><circle cx="55" cy="65" r="0.4" fill="white" opacity="0.7"/><circle cx="8" cy="78" r="0.3" fill="white" opacity="0.6"/><circle cx="92" cy="88" r="0.2" fill="white" opacity="0.5"/><circle cx="38" cy="85" r="0.2" fill="white" opacity="0.4"/></svg>') repeat;
          animation: move-stars 200s linear infinite;
        }
        .twinkling {
          background: transparent url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="32" cy="18" r="0.15" fill="cyan" opacity="0.9"/><circle cx="68" cy="42" r="0.2" fill="yellow" opacity="0.8"/><circle cx="12" cy="65" r="0.1" fill="white" opacity="0.7"/><circle cx="88" cy="75" r="0.15" fill="cyan" opacity="0.6"/></svg>') repeat;
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
      <motion.header 
        className="bg-slate-800/90 backdrop-blur-md shadow-lg border-b border-blue-500/30 relative z-10"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-5">
            <motion.div 
              className="flex items-center gap-3 sm:gap-4"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg border border-blue-400/30"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                <motion.div
                  className="absolute inset-0 rounded-lg bg-blue-400/20"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <motion.h1 
                  className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
                  animate={{ 
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ backgroundSize: "200% 100%" }}
                >
                  <Stars className="inline w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-2 text-blue-400" />
                  Space Cat Station
                </motion.h1>
                <motion.p 
                  className="text-xs sm:text-sm text-blue-300 hidden sm:block flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Sparkles className="w-3 h-3" />
                  Presented by 拝啓ねこ様
                </motion.p>
              </div>
            </motion.div>
            <Link 
              href="/admin" 
              className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-700/70 hover:bg-slate-600/70 text-blue-200 hover:text-white rounded-lg text-sm sm:text-base font-medium transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50 min-h-[48px] flex items-center justify-center active:scale-95"
            >
              <span className="flex items-center gap-2 opacity-80 hover:opacity-100">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Control Center</span>
                <span className="sm:hidden flex items-center justify-center">管理</span>
              </span>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-red-900/30 backdrop-blur border border-red-400/50 text-red-300 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base shadow-lg"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <motion.button 
                  onClick={() => setError(null)} 
                  className="text-red-400 hover:text-red-200 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-green-900/30 backdrop-blur border border-green-400/50 text-green-300 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base shadow-lg"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{successMessage}</span>
                <motion.button 
                  onClick={() => setSuccessMessage(null)} 
                  className="text-green-400 hover:text-green-200 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedFolder ? (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="text-center mb-6 sm:mb-8 lg:mb-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4 flex items-center justify-center gap-3 flex-wrap">
                <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                <span className="text-center">拝啓ねこ様フォトギャラリー</span>
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-blue-300 flex items-center justify-center gap-2 flex-wrap px-4">
                <span className="text-center">阿佐ヶ谷の誇る名所、拝啓ねこ様のねこちゃん達の活き活きした姿をご覧あれ！</span>
              </p>
            </motion.div>

            {/* Tab Navigation */}
            <motion.div 
              className="mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="border-b border-blue-500/30 mb-6">
                <nav className="-mb-px flex justify-center space-x-8">
                  <motion.button
                    onClick={() => setActiveTab('enrolled')}
                    className={`py-3 px-6 border-b-2 font-medium text-sm sm:text-base transition-all duration-200 min-h-[48px] flex items-center justify-center ${
                      activeTab === 'enrolled'
                        ? 'border-green-400 text-green-300'
                        : 'border-transparent text-blue-300/70 hover:text-blue-300 hover:border-blue-400/50'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="flex items-center gap-2">
                      <Stars className="w-4 h-4 sm:w-5 sm:h-5" />
                      在籍生 ({folders.filter(f => f.status === 'enrolled').length})
                    </span>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setActiveTab('graduated')}
                    className={`py-3 px-6 border-b-2 font-medium text-sm sm:text-base transition-all duration-200 min-h-[48px] flex items-center justify-center ${
                      activeTab === 'graduated'
                        ? 'border-yellow-400 text-yellow-300'
                        : 'border-transparent text-blue-300/70 hover:text-blue-300 hover:border-blue-400/50'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                      卒業生 ({folders.filter(f => f.status === 'graduated').length})
                    </span>
                  </motion.button>
                </nav>
              </div>
            </motion.div>

            {/* Filtered folders by active tab */}
            {folders.filter(folder => folder.status === activeTab).length > 0 ? (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mb-12"
              >
                <div className="mb-4 sm:mb-6">
                  <motion.h3 
                    className={`text-xl sm:text-2xl font-bold mb-2 flex items-center gap-3 ${
                      activeTab === 'enrolled' ? 'text-green-300' : 'text-yellow-300'
                    }`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    {activeTab === 'enrolled' ? (
                      <>
                        <Stars className="w-6 h-6 text-green-400" />
                        在籍生（最大100枚）
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                        卒業生（最大10枚）
                      </>
                    )}
                  </motion.h3>
                  <motion.p 
                    className={`text-sm ml-9 ${
                      activeTab === 'enrolled' ? 'text-green-300' : 'text-yellow-300'
                    }`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    {activeTab === 'enrolled' 
                      ? '拝啓ねこ様の宇宙船で活躍しているぞ！'
                      : '到着した惑星で元気に探索中！'
                    }
                  </motion.p>
                </div>
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        delayChildren: 0.5,
                        staggerChildren: 0.1
                      }
                    }
                  }}
                >
                  {folders.filter(folder => folder.status === activeTab).map((folder) => (
                    <FolderCard key={folder.id} folder={folder} onSelectFolder={handleFolderSelect} onFileUpload={handleFileUpload} uploadingFolder={uploadingFolder} />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                className="text-center py-12 sm:py-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-dashed border-blue-400/30"
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {activeTab === 'enrolled' ? (
                    <Stars className="w-8 h-8 text-white" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-white" />
                  )}
                </motion.div>
                <p className="text-blue-300">
                  {activeTab === 'enrolled' ? '在籍生の宇宙領域がありません' : '卒業生の宇宙領域がありません'}
                </p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 sm:mb-6">
              <motion.button 
onClick={async () => {
                  setSelectedFolder(null);
                  setSelectedFolderData(null);
                  // フォルダ一覧を再取得
                  await fetchFolders();
                }}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg transition-all duration-200 text-sm sm:text-base font-medium shadow-lg border border-blue-400/30"
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">宇宙ステーションに戻る</span>
                <span className="sm:hidden flex items-center justify-center">戻る</span>
              </motion.button>
            </div>

            {selectedFolderData && (
              <motion.div 
                className="space-y-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <motion.div 
                  className="text-center mb-6 sm:mb-8"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    {selectedFolderData.status === 'graduated' 
                      ? `${selectedFolderData.name}の惑星探索` 
                      : `${selectedFolderData.name}の宇宙航海`
                    }
                  </h2>
                  <p className="text-sm sm:text-base text-blue-300 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {selectedFolderData.photos.length}枚の写真
                  </p>
                </motion.div>

                {selectedFolderData.photos.length === 0 ? (
                  <motion.div 
                    className="text-center py-12 sm:py-16"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    <motion.div 
                      className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </motion.div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">宇宙船には誰もいないぞ！</h3>
                    <p className="text-sm sm:text-base text-blue-300 mb-8 max-w-md mx-auto">
                      この宇宙領域にはまだねこ様の写真が存在しません。最初の写真をアップロードして探査を開始しましょう！
                    </p>
                    <input
                      ref={detailUploadRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(selectedFolderData.id, e)}
                      style={{ display: 'none' }}
                      disabled={uploadingFolder === selectedFolderData.id}
                    />
                    <div
                      onClick={() => {
                        if (uploadingFolder !== selectedFolderData.id) {
                          triggerFileUpload(selectedFolderData.id);
                        }
                      }}
                      className={`
                        relative overflow-hidden text-white py-3 px-4 sm:py-3 sm:px-6 rounded-lg cursor-pointer text-sm font-medium shadow-lg transition-all duration-200 inline-block min-h-[44px] flex items-center justify-center
                        ${uploadingFolder === selectedFolderData.id 
                          ? 'bg-slate-600 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105'
                        }
                      `}
                    >
                      <span className="relative flex items-center justify-center gap-3">
                        {uploadingFolder === selectedFolderData.id ? (
                          <>
                            <div
                              className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"
                            />
                            <span className="text-base font-medium">宇宙転送中...</span>
                          </>
                        ) : (
                          <>
                            <Rocket className="w-5 h-5" />
                            <span className="text-base font-medium">写真をアップロード</span>
                          </>
                        )}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <motion.div
                      className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: {
                          transition: {
                            delayChildren: 0.4,
                            staggerChildren: 0.05
                          }
                        }
                      }}
                    >
                      {selectedFolderData.photos.map((photo) => (
                        <motion.div 
                          key={photo.id}
                          variants={{
                            hidden: { y: 20, opacity: 0 },
                            visible: { y: 0, opacity: 1 }
                          }}
                          whileHover={{ 
                            y: -5, 
                            scale: 1.02,
                            transition: { type: "spring", stiffness: 300 }
                          }}
                          className="group"
                        >
                          <div className="relative bg-slate-800/60 backdrop-blur-md rounded-xl shadow-xl hover:shadow-2xl overflow-hidden transition-all duration-300 border border-blue-500/30 hover:border-purple-400/50 min-h-[280px] sm:min-h-[320px]">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            />
                            
                            <div className="relative aspect-square overflow-hidden rounded-t-xl">
                              <Image 
                                src={photo.url} 
                                alt={photo.originalName} 
                                width={300} 
                                height={300}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  console.error('Image load error:', photo.url);
                                  console.error('Full photo data:', photo);
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('Image loaded successfully:', photo.url);
                                }}
                                unoptimized
                              />
                              <motion.div
                                className="absolute inset-0 bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              />
                            </div>
                            
                            <div className="relative p-3 sm:p-4 bg-slate-800/80 backdrop-blur">
                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <p className="text-blue-300 truncate flex items-center gap-1.5">
                                  <span className="text-xs">📅</span>
                                  {new Date(photo.uploadedAt).toLocaleDateString('ja-JP')}
                                </p>
                                <motion.a 
                                  href={photo.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0 p-2 rounded-lg transition-colors bg-slate-700/50 hover:bg-slate-600/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                </motion.a>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* 詳細画面でのアップロードボタン */}
                    <motion.div 
                      className="flex justify-center mt-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.6 }}
                    >
                      <div
                        onClick={() => {
                          if (uploadingFolder !== selectedFolderData.id) {
                            triggerFileUpload(selectedFolderData.id);
                          }
                        }}
                        className={`
                          relative overflow-hidden text-white py-3 px-4 sm:py-3 sm:px-6 rounded-lg cursor-pointer text-sm font-medium shadow-lg transition-all duration-200 inline-block min-h-[44px] flex items-center justify-center
                          ${uploadingFolder === selectedFolderData.id 
                            ? 'bg-slate-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105'
                          }
                        `}
                      >
                        <span className="relative flex items-center justify-center gap-2">
                          {uploadingFolder === selectedFolderData.id ? (
                            <>
                              <div
                                className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"
                              />
                              転送中...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              追加アップロード
                            </>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <motion.footer 
        className="bg-slate-800/70 backdrop-blur-md border-t border-blue-500/30 mt-12 relative z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-6">
            {/* Social Links */}
            <div className="flex justify-center gap-2 sm:gap-6">
              <motion.a
                href="https://x.com/haikeinekosama"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-slate-700/70 hover:bg-blue-600/70 text-blue-200 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-blue-400/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">X (Twitter)</span>
              </motion.a>
              
              <motion.a
                href="https://www.instagram.com/haikeinekosama/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-slate-700/70 hover:bg-pink-600/70 text-blue-200 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-pink-400/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">Instagram</span>
              </motion.a>
              
              <motion.a
                href="https://aboutme.style/haikeinekosama"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-slate-700/70 hover:bg-purple-600/70 text-blue-200 hover:text-white rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-purple-400/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm">HP</span>
              </motion.a>
            </div>
            
            {/* Presented by */}
            <div className="text-center">
              <motion.p 
                className="text-blue-300 text-sm flex items-center justify-center gap-2 flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span>Presented by</span>
                <motion.a
                  href="https://x.com/kilomake0607"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                >
                  きろめいく里親
                </motion.a>
              </motion.p>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

// フォルダーカードコンポーネント
function FolderCard({ 
  folder, 
  onSelectFolder, 
  onFileUpload, 
  uploadingFolder 
}: { 
  folder: CatFolder; 
  onSelectFolder: (folderId: string) => void; 
  onFileUpload: (folderId: string, event: React.ChangeEvent<HTMLInputElement>) => void; 
  uploadingFolder: string | null; 
}) {
  const folderUploadRef = useRef<HTMLInputElement>(null);

  const triggerFolderFileUpload = (folderId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const syntheticEvent = {
          target: target,
          currentTarget: target
        } as React.ChangeEvent<HTMLInputElement>;
        onFileUpload(folderId, syntheticEvent);
      }
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  };
  return (
    <motion.div 
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        transition: { type: "spring", stiffness: 300 }
      }}
      className="group"
    >
      <div className="relative bg-slate-800/60 backdrop-blur-md rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden h-64 sm:h-72 lg:h-74 flex flex-col border border-blue-500/30 hover:border-purple-400/50">
        
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        
        
        <motion.div 
          className="relative p-4 sm:p-5 cursor-pointer flex-1 flex flex-col" 
          onClick={() => onSelectFolder(folder.id)}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate flex-1 text-left pr-2">
              {folder.name}
            </h3>
            {folder.status === 'enrolled' ? (
              <div className="bg-green-500/80 backdrop-blur-sm text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1 shadow-md flex-shrink-0">
                <Stars className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>在籍</span>
              </div>
            ) : (
              <div className="bg-yellow-500/80 backdrop-blur-sm text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1 shadow-md flex-shrink-0">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>卒業</span>
              </div>
            )}
          </div>
          
          {/* 写真数表示 */}
          <div className="mb-3 flex justify-center">
            <p className="text-sm sm:text-base text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">{folder.photoCount}枚の写真</span>
            </p>
          </div>
          
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 h-24 sm:h-24 lg:h-28 w-full max-w-lg sm:max-w-none">
            {folder.photos.slice(0, 3).map((photo) => (
              <motion.div 
                key={photo.id} 
                className="relative aspect-square bg-slate-700/50 rounded-lg overflow-hidden border border-blue-400/30"
                whileHover={{ scale: 1.08 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image 
                  src={photo.url} 
                  alt={`${folder.name}の写真`} 
                  width={100} 
                  height={100}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image load error:', photo.url);
                    console.error('Full photo data:', photo);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', photo.url);
                  }}
                  unoptimized
                />
                <motion.div
                  className="absolute inset-0 bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
              </motion.div>
            ))}
            {folder.photoCount === 0 && (
              <div className="col-span-3 h-20 sm:h-24 lg:h-28 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-400/30">
                <div className="text-center">
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-300 text-xs sm:text-sm font-medium">写真がありません</p>
                </div>
              </div>
            )}
            </div>
          </div>
        </motion.div>
        
        <div className="px-3 pb-2 sm:px-4 sm:pb-2 mt-1 relative flex justify-center">
          <input
            ref={folderUploadRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => onFileUpload(folder.id, e)}
            style={{ display: 'none' }}
            disabled={uploadingFolder === folder.id}
          />
          <div
            onClick={() => {
              if (uploadingFolder !== folder.id) {
                triggerFolderFileUpload(folder.id);
              }
            }}
            className={`
                relative overflow-hidden text-white text-center py-0.5 sm:py-1.5 px-2 sm:px-3 rounded-md cursor-pointer text-xs sm:text-sm font-medium transition-all duration-200 w-1/2 sm:w-auto
                ${uploadingFolder === folder.id 
                  ? 'bg-slate-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-102'
                }
              `}
          >
            <span className="relative flex items-center justify-center gap-1.5">
              {uploadingFolder === folder.id ? (
                <>
                  <div
                    className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"
                  />
                  <span className="hidden sm:inline">転送中...</span>
                  <span className="sm:hidden flex items-center justify-center">転送中</span>
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  <span className="hidden sm:inline">写真をアップロード</span>
                  <span className="sm:hidden flex items-center justify-center">アップロード</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
