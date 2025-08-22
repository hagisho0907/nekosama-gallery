'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';

type CatFolder = {
  id: string;
  name: string;
  displayOrder: number;
  status: 'enrolled' | 'graduated'; // enrolled: 在籍生, graduated: 卒業生
  photoCount: number;
  createdAt: string;
  updatedAt: string;
};

type Photo = {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: string;
};

export default function AdminPage() {
  const [folders, setFolders] = useState<CatFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'graduated'>('enrolled');
  const router = useRouter();

  useEffect(() => {
    // Check authentication first
    console.log('Admin page loading, cookies:', document.cookie);
    console.log('isAuthenticated():', isAuthenticated());
    
    if (!isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      router.push('/admin/login');
      return;
    }
    
    console.log('Authenticated, loading admin page');
    setAuthenticated(true);
    fetchFolders();
  }, [router]);

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

  const handleAddFolder = async () => {
    if (!newFolderName.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFolders(prev => [...prev, data.folder]);
        setNewFolderName('');
        // Signal that data was updated for main page refresh
        localStorage.setItem('nekosama_data_updated', Date.now().toString());
      } else {
        setError(data.error || 'Failed to create folder');
      }
    } catch (err) {
      setError('Failed to create folder');
      console.error('Error creating folder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolder(folderId);
      setEditingName(folder.name);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim() || !editingFolder || submitting) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`/api/folders/${editingFolder}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFolders(prev => prev.map(folder => 
          folder.id === editingFolder 
            ? { ...folder, name: editingName.trim() }
            : folder
        ));
        setEditingFolder(null);
        setEditingName('');
        // Signal that data was updated for main page refresh
        localStorage.setItem('nekosama_data_updated', Date.now().toString());
      } else {
        setError(data.error || 'Failed to update folder');
      }
    } catch (err) {
      setError('Failed to update folder');
      console.error('Error updating folder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchPhotos = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setPhotos(data.photos || []);
        setSelectedFolder(folderId);
      } else {
        setError(data.error || 'Failed to fetch photos');
      }
    } catch (err) {
      setError('Failed to fetch photos');
      console.error('Error fetching photos:', err);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('この写真を削除しますか？')) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        // Update folder photo count
        if (selectedFolder) {
          setFolders(prev => prev.map(folder => 
            folder.id === selectedFolder 
              ? { ...folder, photoCount: folder.photoCount - 1 }
              : folder
          ));
        }
      } else {
        setError(data.error || 'Failed to delete photo');
      }
    } catch (err) {
      setError('Failed to delete photo');
      console.error('Error deleting photo:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReorderFolders = async (newOrder: string[]) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/folders/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderIds: newOrder }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state to reflect new order within the current tab
        const otherFolders = folders.filter(f => f.status !== activeTab);
        const reorderedFolders = newOrder.map(id => 
          folders.find(folder => folder.id === id)!
        ).filter(Boolean);
        setFolders([...otherFolders, ...reorderedFolders]);
        // Signal that data was updated for main page refresh
        localStorage.setItem('nekosama_data_updated', Date.now().toString());
      } else {
        setError(data.error || 'Failed to reorder folders');
      }
    } catch (err) {
      setError('Failed to reorder folders');
      console.error('Error reordering folders:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, folderId: string) => {
    setDraggedFolder(folderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', folderId);
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(targetFolderId);
  };

  const handleDragLeave = () => {
    setIsDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setIsDragOver(null);
    
    if (!draggedFolder || draggedFolder === targetFolderId) {
      setDraggedFolder(null);
      return;
    }

    // 現在のタブ内のフォルダのみで並び替え
    const currentTabFolders = filteredFolders.map(f => f.id);
    const draggedIndex = currentTabFolders.indexOf(draggedFolder);
    const targetIndex = currentTabFolders.indexOf(targetFolderId);

    // Create new order for current tab
    const newTabOrder = [...currentTabFolders];
    newTabOrder.splice(draggedIndex, 1);
    newTabOrder.splice(targetIndex, 0, draggedFolder);

    // Update server with new order
    handleReorderFolders(newTabOrder);
    setDraggedFolder(null);
  };

  const handleToggleStatus = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || submitting) return;
    
    const newStatus = folder.status === 'enrolled' ? 'graduated' : 'enrolled';
    const confirmMessage = folder.status === 'enrolled' 
      ? 'このフォルダを卒業生に変更しますか？' 
      : 'このフォルダを在籍生に変更しますか？';
    
    if (!confirm(confirmMessage)) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFolders(prev => prev.map(f => 
          f.id === folderId 
            ? { ...f, status: newStatus }
            : f
        ));
        // Signal that data was updated for main page refresh
        localStorage.setItem('nekosama_data_updated', Date.now().toString());
        
        // ステータス変更後、該当するタブに自動切り替え
        setActiveTab(newStatus);
      } else {
        setError(data.error || 'Failed to update folder status');
      }
    } catch (err) {
      setError('Failed to update folder status');
      console.error('Error updating folder status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('このフォルダを削除しますか？写真も全て削除されます。') || submitting) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setFolders(prev => prev.filter(folder => folder.id !== folderId));
        // Signal that data was updated for main page refresh
        localStorage.setItem('nekosama_data_updated', Date.now().toString());
      } else {
        setError(data.error || 'Failed to delete folder');
      }
    } catch (err) {
      setError('Failed to delete folder');
      console.error('Error deleting folder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // フィルター済みフォルダを取得
  const filteredFolders = folders.filter(folder => folder.status === activeTab);

  if (!authenticated || loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-lg sm:text-xl lg:text-2xl">🔧</span> 管理者ページ
            </h1>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">ログアウト</span>
                <span className="sm:hidden">ログアウト</span>
              </button>
              <Link 
                href="/" 
                className="bg-amber-800 hover:bg-amber-900 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">← ギャラリーに戻る</span>
                <span className="sm:hidden">ギャラリー</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 sm:mb-6 text-sm sm:text-base">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 float-right"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">新しいフォルダを作成</h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="猫の名前を入力..."
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm sm:text-base"
              onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
              disabled={submitting}
            />
            <button
              onClick={handleAddFolder}
              disabled={submitting || !newFolderName.trim()}
              className="bg-amber-800 hover:bg-amber-900 disabled:bg-gray-400 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              {submitting ? '作成中...' : '作成'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">フォルダ管理</h2>
            
            {/* タブナビゲーション */}
            <div className="border-b border-gray-200 dark:border-gray-600 mb-4">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('enrolled')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'enrolled'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    在籍生 ({folders.filter(f => f.status === 'enrolled').length})
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('graduated')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'graduated'
                      ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    卒業生 ({folders.filter(f => f.status === 'graduated').length})
                  </span>
                </button>
              </nav>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              📱 フォルダをドラッグ&ドロップして表示順序を変更できます
            </p>
          </div>
          <div className="space-y-4 transition-all duration-300">
            {filteredFolders.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-300">
                  {activeTab === 'enrolled' ? (
                    <>
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      在籍生のフォルダがありません。
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      卒業生のフォルダがありません。
                    </>
                  )}
                </div>
              </div>
            ) : (
              filteredFolders.map(folder => (
                <div 
                  key={folder.id} 
                  className={`border rounded-lg p-3 sm:p-4 transition-all duration-200 ${
                    draggedFolder === folder.id 
                      ? 'opacity-50 scale-95' 
                      : isDragOver === folder.id 
                        ? activeTab === 'enrolled' 
                          ? 'border-green-500 bg-green-50 dark:bg-green-800/30' 
                          : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-800/30'
                        : activeTab === 'enrolled'
                          ? 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                          : 'border-gray-200 dark:border-gray-600 hover:border-yellow-300 dark:hover:border-yellow-500'
                  } ${
                    activeTab === 'enrolled' 
                      ? 'border-l-4 border-l-green-500' 
                      : 'border-l-4 border-l-yellow-500'
                  }`}
                  draggable={editingFolder !== folder.id}
                  onDragStart={(e) => handleDragStart(e, folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      {editingFolder === folder.id ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            disabled={submitting}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={submitting || !editingName.trim()}
                              className="flex-1 sm:flex-none bg-amber-700 hover:bg-amber-800 disabled:bg-gray-400 text-white px-3 py-2 rounded text-xs sm:text-sm transition-colors"
                            >
                              {submitting ? '保存中...' : '保存'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingFolder(null);
                                setEditingName('');
                              }}
                              disabled={submitting}
                              className="flex-1 sm:flex-none bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-3 py-2 rounded text-xs sm:text-sm transition-colors"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <svg 
                              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM8 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            </svg>
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{folder.name}</h3>
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">({folder.photoCount}枚)</span>
                            {/* ステータスバッジ */}
                            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                              folder.status === 'enrolled' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                            }`}>
                              {folder.status === 'enrolled' ? '在籍' : '卒業'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {editingFolder !== folder.id && (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <button
                          onClick={() => fetchPhotos(folder.id)}
                          disabled={submitting}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm transition-colors flex-1 sm:flex-none"
                        >
                          <span className="hidden sm:inline">写真管理</span>
                          <span className="sm:hidden">管理</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(folder.id)}
                          disabled={submitting}
                          className={`${
                            folder.status === 'enrolled' 
                              ? 'bg-yellow-600 hover:bg-yellow-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          } disabled:bg-gray-400 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm transition-colors flex-1 sm:flex-none`}
                          title={folder.status === 'enrolled' ? '卒業に変更' : '在籍に変更'}
                        >
                          <span className="hidden sm:inline">
                            {folder.status === 'enrolled' ? '卒業へ' : '在籍へ'}
                          </span>
                          <span className="sm:hidden">
                            {folder.status === 'enrolled' ? '卒業' : '在籍'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleEditFolder(folder.id)}
                          disabled={submitting}
                          className="bg-amber-700 hover:bg-amber-800 disabled:bg-gray-400 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm transition-colors flex-1 sm:flex-none"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          disabled={submitting}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm transition-colors flex-1 sm:flex-none"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Photo Management Section */}
        {selectedFolder && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                写真管理 - {folders.find(f => f.id === selectedFolder)?.name}
              </h2>
              <button
                onClick={() => {
                  setSelectedFolder(null);
                  setPhotos([]);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base self-start sm:self-auto"
              >
                閉じる
              </button>
            </div>
            
            {photos.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-300">このフォルダには写真がありません。</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.originalName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={submitting}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white p-1 sm:p-2 rounded-full shadow-lg transition-colors"
                        title="写真を削除"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate" title={photo.originalName}>
                        {photo.originalName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(photo.uploadedAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}