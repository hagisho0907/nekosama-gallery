'use client';

import { useState } from 'react';
import Link from 'next/link';

type CatFolder = {
  id: string;
  name: string;
  photos: string[];
};

export default function AdminPage() {
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

  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: CatFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      photos: []
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
  };

  const handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolder(folderId);
      setEditingName(folder.name);
    }
  };

  const handleSaveEdit = () => {
    if (!editingName.trim()) return;
    
    setFolders(prev => prev.map(folder => 
      folder.id === editingFolder 
        ? { ...folder, name: editingName.trim() }
        : folder
    ));
    
    setEditingFolder(null);
    setEditingName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('このフォルダを削除しますか？')) {
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🔧 管理者ページ
            </h1>
            <Link 
              href="/" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← ギャラリーに戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">新しいフォルダを作成</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="猫の名前を入力..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
            />
            <button
              onClick={handleAddFolder}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              作成
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">フォルダ管理</h2>
          <div className="space-y-4">
            {folders.map(folder => (
              <div key={folder.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {editingFolder === folder.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingFolder(null)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{folder.name}</h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">({folder.photos.length}枚)</span>
                      </>
                    )}
                  </div>
                  {editingFolder !== folder.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFolder(folder.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}