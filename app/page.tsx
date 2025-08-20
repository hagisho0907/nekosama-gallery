'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type CatPhoto = {
  id: string;
  url: string;
  originalName: string;
  uploadedAt: string;
};

type CatFolder = {
  id: string;
  name: string;
  photos: CatPhoto[];
  photoCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const [folders, setFolders] = useState<CatFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFolderData, setSelectedFolderData] = useState<CatFolder | null>(null);
  const [uploadingFolder, setUploadingFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
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
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', folderId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }
        
        return data.photo;
      });

      await Promise.all(uploadPromises);
      
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-slate-900">
      {/* Modern Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-white/20 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🐱</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  拝啓ねこ様 Gallery
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Beautiful cat photos collection</p>
              </div>
            </div>
            <Link 
              href="/admin" 
              className="group relative px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10">管理者ページ</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {!selectedFolder ? (
          <div className="space-y-8">
            {/* Modern Section Header */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                猫のフォルダ一覧
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">愛らしい猫たちの写真コレクション</p>
            </div>
            
            {/* Modern Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {folders.map(folder => (
                <div key={folder.id} className="group relative">
                  {/* Main Card */}
                  <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] overflow-hidden">
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Content */}
                    <div 
                      className="relative p-6 cursor-pointer" 
                      onClick={() => handleFolderSelect(folder.id)}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                          {folder.name}
                        </h3>
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm">📁</span>
                        </div>
                      </div>
                      
                      {/* Photo Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {folder.photos.slice(0, 3).map((photo, index) => (
                          <div key={index} className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl overflow-hidden shadow-inner group-hover:shadow-lg transition-shadow duration-300">
                            <Image 
                              src={photo.url} 
                              alt={`${folder.name}の写真`} 
                              width={80} 
                              height={80}
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
                          </div>
                        ))}
                        {folder.photoCount === 0 && (
                          <div className="col-span-3 aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <div className="text-center">
                              <div className="text-4xl mb-2">📷</div>
                              <p className="text-gray-400 text-sm font-medium">写真がありません</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                          {folder.photoCount}枚の写真
                        </span>
                      </div>
                    </div>
                    
                    {/* Upload Button */}
                    <div className="px-6 pb-6">
                      <label className="block">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(folder.id, e)}
                          className="hidden"
                          disabled={uploadingFolder === folder.id}
                        />
                        <div className="group/btn relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white text-center py-3 px-6 rounded-xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] font-medium">
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {uploadingFolder === folder.id ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                アップロード中...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                写真を追加
                              </>
                            )}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Modern Back Button */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setSelectedFolder(null);
                  setSelectedFolderData(null);
                }}
                className="group flex items-center gap-2 px-6 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-medium"
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                フォルダ一覧に戻る
              </button>
            </div>

            {selectedFolderData && (
              <div className="space-y-8">
                {/* Modern Page Header */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-200 dark:border-purple-800">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🐱</span>
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {selectedFolderData.name}の写真
                    </h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedFolderData.photos.length}枚の美しい写真コレクション
                  </p>
                </div>

                {selectedFolderData.photos.length === 0 ? (
                  // Empty State
                  <div className="text-center py-20">
                    <div className="max-w-md mx-auto space-y-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto">
                        <div className="text-6xl">📷</div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">まだ写真がありません</h3>
                        <p className="text-gray-500 dark:text-gray-400">最初の写真をアップロードして、ギャラリーを始めましょう</p>
                      </div>
                      <label className="inline-block">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(selectedFolderData.id, e)}
                          className="hidden"
                          disabled={uploadingFolder === selectedFolderData.id}
                        />
                        <div className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 px-8 rounded-xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-medium">
                          <span className="relative z-10 flex items-center gap-2">
                            {uploadingFolder === selectedFolderData.id ? (
                              <>
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                アップロード中...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                最初の写真を追加
                              </>
                            )}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                  {/* Photo Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {selectedFolderData.photos.map((photo, index) => (
                      <div key={photo.id} className="group relative">
                        <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02]">
                          {/* Photo */}
                          <div className="aspect-square overflow-hidden">
                            <Image 
                              src={photo.url} 
                              alt={photo.originalName} 
                              width={300} 
                              height={300}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                          </div>
                          
                          {/* Info Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                              <p className="font-medium truncate">{photo.originalName}</p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs opacity-80">
                                  {new Date(photo.uploadedAt).toLocaleDateString('ja-JP')}
                                </p>
                                <a 
                                  href={photo.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg hover:bg-white/30 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🔗 直接表示
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          {/* Index Badge */}
                          <div className="absolute top-3 left-3 w-8 h-8 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
