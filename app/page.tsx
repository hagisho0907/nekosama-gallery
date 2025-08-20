'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type CatFolder = {
  id: string;
  name: string;
  photos: string[];
};

export default function Home() {
  const [folders, setFolders] = useState<CatFolder[]>([
    {
      id: '1',
      name: 'ミケ',
      photos: ['/next.svg', '/vercel.svg']
    },
    {
      id: '2', 
      name: 'しろ',
      photos: ['/globe.svg']
    }
  ]);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploadingFolder, setUploadingFolder] = useState<string | null>(null);

  const handleFileUpload = (folderId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploadingFolder(folderId);
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFolders(prev => prev.map(folder => 
          folder.id === folderId 
            ? { ...folder, photos: [...folder.photos, result] }
            : folder
        ));
      };
      reader.readAsDataURL(file);
    });

    setUploadingFolder(null);
  };

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
        {!selectedFolder ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">猫のフォルダ一覧</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map(folder => (
                <div key={folder.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div 
                    className="p-6 cursor-pointer" 
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{folder.name}</h3>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {folder.photos.slice(0, 3).map((photo, index) => (
                        <div key={index} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <Image 
                            src={photo} 
                            alt={`${folder.name}の写真`} 
                            width={80} 
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{folder.photos.length}枚の写真</p>
                  </div>
                  <div className="px-6 pb-6">
                    <label className="block">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileUpload(folder.id, e)}
                        className="hidden"
                      />
                      <div className="bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded-lg cursor-pointer transition-colors">
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
                onClick={() => setSelectedFolder(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← フォルダ一覧に戻る
              </button>
            </div>
            {folders
              .filter(folder => folder.id === selectedFolder)
              .map(folder => (
                <div key={folder.id}>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{folder.name}の写真</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {folder.photos.map((photo, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        <div className="aspect-square">
                          <Image 
                            src={photo} 
                            alt={`${folder.name}の写真 ${index + 1}`} 
                            width={300} 
                            height={300}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </main>
    </div>
  );
}
