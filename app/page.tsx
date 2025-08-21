'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
      {/* Simple Header */}
      <header className="bg-white dark:bg-amber-900 shadow-sm border-b border-amber-300 dark:border-amber-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-800 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg sm:text-2xl">🐱</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-amber-100">
                  拝啓ねこ様 Gallery
                </h1>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 hidden sm:block">Beautiful cat photos collection</p>
              </div>
            </div>
            <Link 
              href="/admin" 
              className="px-3 py-2 sm:px-6 sm:py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200"
            >
              <span className="hidden sm:inline">管理者ページ</span>
              <span className="sm:hidden">管理</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 sm:mb-6 text-sm sm:text-base">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-red-500 hover:text-red-700 float-right"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 sm:mb-6 text-sm sm:text-base">
            {successMessage}
            <button 
              onClick={() => setSuccessMessage(null)} 
              className="ml-2 text-green-500 hover:text-green-700 float-right"
            >
              ✕
            </button>
          </div>
        )}

        {!selectedFolder ? (
          <div className="space-y-8">
            {/* Simple Section Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                猫のフォルダ一覧
              </h2>
              <p className="text-sm sm:text-base text-amber-700 dark:text-amber-300">愛らしい猫たちの写真コレクション</p>
            </div>
            
            {/* Simple Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {folders.map(folder => (
                <div key={folder.id}>
                  {/* Simple Card with Fixed Height */}
                  <div className="bg-white dark:bg-amber-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden h-72 sm:h-80 flex flex-col">
                    
                    <div 
                      className="p-4 sm:p-6 cursor-pointer flex-1" 
                      onClick={() => handleFolderSelect(folder.id)}
                    >
                      {/* Simple Header */}
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-100 truncate pr-2">
                          {folder.name}
                        </h3>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-800 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs sm:text-sm">📁</span>
                        </div>
                      </div>
                      
                      {/* Simple Photo Grid - Fixed Height */}
                      <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-2 sm:mb-3 h-16 sm:h-20">
                        {folder.photos.slice(0, 3).map((photo, index) => (
                          <div key={index} className="aspect-square bg-amber-100 dark:bg-amber-700 rounded-md sm:rounded-lg overflow-hidden">
                            <Image 
                              src={photo.url} 
                              alt={`${folder.name}の写真`} 
                              width={80} 
                              height={80}
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
                          </div>
                        ))}
                        {folder.photoCount === 0 && (
                          <div className="col-span-3 h-16 sm:h-20 bg-amber-50 dark:bg-amber-800 rounded-md sm:rounded-lg flex items-center justify-center border-2 border-dashed border-amber-300 dark:border-amber-600">
                            <div className="text-center">
                              <div className="text-base sm:text-lg mb-1">📷</div>
                              <p className="text-amber-600 dark:text-amber-400 text-xs">写真がありません</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Simple Stats */}
                      <div className="mt-2">
                        <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                          {folder.photoCount}枚の写真
                        </p>
                      </div>
                    </div>
                    
                    {/* Simple Upload Button - Fixed Position */}
                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 mt-auto">
                      <label className="block">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(folder.id, e)}
                          className="hidden"
                          disabled={uploadingFolder === folder.id}
                        />
                        <div className="bg-amber-800 hover:bg-amber-900 disabled:bg-gray-400 text-white text-center py-2 px-3 sm:px-4 rounded-lg cursor-pointer transition-colors duration-200 text-sm sm:text-base">
                          {uploadingFolder === folder.id ? 'アップロード中...' : '写真を追加'}
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
            {/* Simple Back Button */}
            <div className="mb-4 sm:mb-6">
              <button 
                onClick={() => {
                  setSelectedFolder(null);
                  setSelectedFolderData(null);
                }}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg transition-colors duration-200 text-sm sm:text-base"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">フォルダ一覧に戻る</span>
                <span className="sm:hidden">戻る</span>
              </button>
            </div>

            {selectedFolderData && (
              <div className="space-y-8">
                {/* Simple Page Header */}
                <div className="text-center mb-6 sm:mb-8">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-800 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm sm:text-lg">🐱</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-amber-100">
                      {selectedFolderData.name}の写真
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-amber-700 dark:text-amber-300">
                    {selectedFolderData.photos.length}枚の美しい写真コレクション
                  </p>
                </div>

                {selectedFolderData.photos.length === 0 ? (
                  // Simple Empty State
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <div className="text-2xl sm:text-3xl">📷</div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">まだ写真がありません</h3>
                    <p className="text-sm sm:text-base text-amber-700 dark:text-amber-300 mb-6">最初の写真をアップロードしてください</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileUpload(selectedFolderData.id, e)}
                        className="hidden"
                        disabled={uploadingFolder === selectedFolderData.id}
                      />
                      <div className="bg-amber-800 hover:bg-amber-900 text-white py-2 px-4 sm:py-3 sm:px-6 rounded-lg cursor-pointer transition-colors duration-200 text-sm sm:text-base">
                        {uploadingFolder === selectedFolderData.id ? 'アップロード中...' : '最初の写真を追加'}
                      </div>
                    </label>
                  </div>
                ) : (
                  <>
                  {/* Simple Photo Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {selectedFolderData.photos.map((photo) => (
                      <div key={photo.id}>
                        <div className="bg-white dark:bg-amber-800 rounded-lg shadow-md hover:shadow-lg overflow-hidden transition-shadow duration-200">
                          {/* Photo */}
                          <div className="aspect-square overflow-hidden">
                            <Image 
                              src={photo.url} 
                              alt={photo.originalName} 
                              width={300} 
                              height={300}
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
                          </div>
                          
                          {/* Simple Info */}
                          <div className="p-2 sm:p-3">
                            <div className="flex items-center justify-between text-xs">
                              <p className="text-amber-700 dark:text-amber-300 truncate">
                                {new Date(photo.uploadedAt).toLocaleDateString('ja-JP')}
                              </p>
                              <a 
                                href={photo.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 ml-1 flex-shrink-0"
                              >
                                <span className="hidden sm:inline">直接表示</span>
                                <span className="sm:hidden">🔗</span>
                              </a>
                            </div>
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
