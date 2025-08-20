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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🐱 NekoSama Gallery
            </h1>
            <Link 
              href="/admin" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              管理者ページ
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">猫のフォルダ一覧</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map(folder => (
                <div key={folder.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div 
                    className="p-6 cursor-pointer" 
                    onClick={() => handleFolderSelect(folder.id)}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{folder.name}</h3>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {folder.photos.slice(0, 3).map((photo, index) => (
                        <div key={index} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
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
                        <div className="col-span-3 aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <p className="text-gray-400 text-sm">写真がありません</p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{folder.photoCount}枚の写真</p>
                  </div>
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
                      <div className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-center py-2 px-4 rounded-lg cursor-pointer transition-colors">
                        {uploadingFolder === folder.id ? 'アップロード中...' : '写真を追加'}
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <button 
                onClick={() => {
                  setSelectedFolder(null);
                  setSelectedFolderData(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← フォルダ一覧に戻る
              </button>
            </div>
            {selectedFolderData && (
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{selectedFolderData.name}の写真</h2>
                {selectedFolderData.photos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">まだ写真がアップロードされていません</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileUpload(selectedFolderData.id, e)}
                        className="hidden"
                        disabled={uploadingFolder === selectedFolderData.id}
                      />
                      <div className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg cursor-pointer transition-colors">
                        {uploadingFolder === selectedFolderData.id ? 'アップロード中...' : '最初の写真を追加'}
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {selectedFolderData.photos.map((photo) => (
                      <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        <div className="aspect-square">
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
                        <div className="p-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{photo.originalName}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            <a href={photo.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              直接表示
                            </a>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
