'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Stars, 
  Sparkles, 
  ArrowLeft, 
  LogOut, 
  Plus, 
  Edit3, 
  Trash2, 
  Camera,
  AlertCircle,
  CheckCircle,
  GripVertical,
  Square,
  CheckSquare,
  Info,
  Star,
  BarChart3
} from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import UsageMonitor from '@/components/UsageMonitor';

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
  isFeatured?: boolean;
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
  const [activeTab, setActiveTab] = useState<'enrolled' | 'graduated' | 'monitoring'>('enrolled');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showPhotoSelection, setShowPhotoSelection] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{folderId: string, newStatus: 'enrolled' | 'graduated'} | null>(null);
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

  const fetchPhotos = async (folderId: string, updatedFolder?: CatFolder) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setPhotos(data.photos || []);
        setSelectedFolder(folderId);
        setSelectedPhotos([]);
        
        // Check if graduated folder has 50+ photos and needs selection
        // Use updatedFolder if provided, otherwise find from current folders state
        const folder = updatedFolder || folders.find(f => f.id === folderId);
        if (folder?.status === 'graduated' && data.photos?.length > 50) {
          setShowPhotoSelection(true);
        } else {
          setShowPhotoSelection(false);
        }
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

  const handlePhotoSelection = (photoId: string, selected: boolean) => {
    if (selected) {
      if (selectedPhotos.length < 50) {
        setSelectedPhotos(prev => [...prev, photoId]);
      } else {
        setError('残す写真は50枚まで選択できます');
      }
    } else {
      setSelectedPhotos(prev => prev.filter(id => id !== photoId));
    }
  };

  const handleBulkDeletePhotos = async () => {
    if (selectedPhotos.length !== 50) {
      setError('残す写真を50枚選択してください');
      return;
    }

    const photosToDelete = photos.filter(photo => !selectedPhotos.includes(photo.id));
    const confirmMessage = `${photosToDelete.length}枚の写真を削除して、選択した50枚を残しますか？この操作は取り消せません。`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setSubmitting(true);
      const deletePromises = photosToDelete.map(photo => 
        fetch(`/api/photos/${photo.id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed > 0) {
        setError(`${failed}枚の写真の削除に失敗しました`);
      } else {
        // If there's a pending status change, execute it now
        if (pendingStatusChange) {
          try {
            const response = await fetch(`/api/folders/${pendingStatusChange.folderId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: pendingStatusChange.newStatus }),
            });

            const data = await response.json();
            
            if (response.ok) {
              setFolders(prev => prev.map(f => 
                f.id === pendingStatusChange.folderId 
                  ? { ...f, status: pendingStatusChange.newStatus }
                  : f
              ));
              // Signal that data was updated for main page refresh
              localStorage.setItem('nekosama_data_updated', Date.now().toString());
            } else {
              setError(data.error || 'Failed to update folder status');
            }
          } catch (statusError) {
            setError('Failed to update folder status');
            console.error('Error updating folder status:', statusError);
          }
          
          setPendingStatusChange(null);
        }
        
        // Refresh photos after successful deletion
        if (selectedFolder) {
          await fetchPhotos(selectedFolder);
        }
        setShowPhotoSelection(false);
        setSelectedPhotos([]);
        setError(null);
      }
    } catch (err) {
      setError('写真の削除に失敗しました');
      console.error('Error deleting photos:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFeatured = async (photoId: string) => {
    try {
      setSubmitting(true);
      const photo = photos.find(p => p.id === photoId);
      const newFeaturedStatus = !photo?.isFeatured;
      
      // Count current featured photos for this folder
      const currentFeatured = photos.filter(p => p.isFeatured).length;
      
      // If trying to feature a photo but already have 3 featured, prevent it
      if (newFeaturedStatus && currentFeatured >= 3) {
        setError('代表写真は最大3枚まで設定できます');
        return;
      }
      
      const response = await fetch(`/api/folders?action=set-featured&photoId=${photoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFeatured: newFeaturedStatus }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setPhotos(prev => prev.map(p => 
          p.id === photoId 
            ? { ...p, isFeatured: newFeaturedStatus }
            : p
        ));
        // Signal that data was updated for main page refresh
        localStorage.setItem('nekosama_data_updated', Date.now().toString());
      } else {
        setError(data.error || 'Failed to update featured status');
      }
    } catch (err) {
      setError('Failed to update featured status');
      console.error('Error updating featured status:', err);
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
    
    // If changing to graduated status, check if folder has more than 50 photos and show selection first
    if (newStatus === 'graduated' && folder.photoCount > 50) {
      // First load photos to show selection interface
      await fetchPhotos(folderId);
      setActiveTab('graduated');
      const updatedFolder = { ...folder, status: 'graduated' as const };
      await fetchPhotos(folderId, updatedFolder);
      
      // Show confirmation after selection interface is displayed
      const confirmMessage = `このフォルダには${folder.photoCount}枚の写真があります。卒業生に変更するには50枚まで削減する必要があります。写真を選択して削減しますか？`;
      if (!confirm(confirmMessage)) {
        // Reset photo selection state if cancelled
        setSelectedFolder(null);
        setPhotos([]);
        setSelectedPhotos([]);
        setShowPhotoSelection(false);
        return;
      }
      
      // Store pending status change to complete after photo selection
      setPendingStatusChange({ folderId, newStatus: 'graduated' });
      return;
    }
    
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
  const filteredFolders = activeTab === 'monitoring' ? [] : folders.filter(folder => folder.status === activeTab);

  if (!authenticated || loading) {
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
            <Settings className="w-16 h-16 text-blue-400 mx-auto" />
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
            管理システム起動中...
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

      <motion.header 
        className="bg-slate-800/90 backdrop-blur-md shadow-lg border-b border-blue-500/30 relative z-10"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg border border-blue-400/30"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                <span className="hidden sm:inline">宇宙船管理センター</span>
                <span className="sm:hidden">管理センター</span>
              </h1>
            </motion.div>
            <div className="flex gap-2 sm:gap-3">
              <motion.button
                onClick={handleLogout}
                className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg transition-all duration-200 text-sm sm:text-base backdrop-blur-sm border border-red-400/30 shadow-lg min-h-[48px] flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="hidden sm:flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </span>
                <span className="sm:hidden">
                  <LogOut className="w-4 h-4" />
                </span>
              </motion.button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  href="/" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg transition-all duration-200 text-sm sm:text-base shadow-lg border border-blue-400/30 flex items-center gap-2 min-h-[48px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">宇宙ステーション</span>
                  <span className="sm:hidden">戻る</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
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
                  className="text-red-400 hover:text-red-200 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-blue-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 sm:mb-6 flex items-center gap-3">
            <Plus className="w-6 h-6 text-blue-400" />
            新しいフォルダを作成
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="ねこ様の名前を入力..."
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-slate-700/50 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300/50 backdrop-blur transition-all duration-200 text-sm sm:text-base"
              onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
              disabled={submitting}
            />
            <motion.button
              onClick={handleAddFolder}
              disabled={submitting || !newFolderName.trim()}
              className={`px-4 py-2 sm:px-6 sm:py-2 rounded-lg transition-all duration-200 text-sm sm:text-base whitespace-nowrap shadow-lg ${
                submitting || !newFolderName.trim()
                  ? 'bg-slate-600 cursor-not-allowed text-slate-400'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
              }`}
              whileHover={submitting || !newFolderName.trim() ? {} : { scale: 1.05 }}
              whileTap={submitting || !newFolderName.trim() ? {} : { scale: 0.95 }}
            >
              <span className="flex items-center gap-2">
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    作成
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div 
          className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-xl p-4 sm:p-6 border border-blue-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-400" />
              管理センター
            </h2>

            
            {/* タブナビゲーション */}
            <div className="border-b border-blue-500/30 mb-4">
              <nav className="-mb-px flex space-x-8">
                <motion.button
                  onClick={() => setActiveTab('enrolled')}
                  className={`py-3 px-6 border-b-2 font-medium text-sm sm:text-base transition-all duration-200 min-h-[48px] flex items-center justify-center ${
                    activeTab === 'enrolled'
                      ? 'border-green-400 text-green-300'
                      : 'border-transparent text-blue-300/70 hover:text-blue-300 hover:border-blue-400/50'
                  }`}
                  whileHover={{ y: -2 }}
                >
                  <span className="flex items-center gap-2">
                    <Stars className="w-4 h-4" />
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
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    卒業生 ({folders.filter(f => f.status === 'graduated').length})
                  </span>
                </motion.button>
                <motion.button
                  onClick={() => setActiveTab('monitoring')}
                  className={`py-3 px-6 border-b-2 font-medium text-sm sm:text-base transition-all duration-200 min-h-[48px] flex items-center justify-center ${
                    activeTab === 'monitoring'
                      ? 'border-purple-400 text-purple-300'
                      : 'border-transparent text-blue-300/70 hover:text-blue-300 hover:border-blue-400/50'
                  }`}
                  whileHover={{ y: -2 }}
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    使用量モニター
                  </span>
                </motion.button>
              </nav>
            </div>
            
            {activeTab !== 'monitoring' && (
              <p className="text-xs sm:text-sm text-blue-300/70 flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                フォルダをドラッグ&ドロップして表示順序を変更
              </p>
            )}
          </div>
          <motion.div 
            className="space-y-4 transition-all duration-300"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  delayChildren: 0.2,
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {filteredFolders.length === 0 ? (
              <motion.div 
                className="text-center py-8"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
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
            ) : (
              filteredFolders.map((folder) => (
                <motion.div 
                  key={folder.id} 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -2, scale: 1.01 }}
                >
                  <div
                    className={`bg-slate-700/50 backdrop-blur-md border rounded-xl p-3 sm:p-4 transition-all duration-200 shadow-lg ${
                      draggedFolder === folder.id 
                        ? 'opacity-50 scale-95' 
                        : isDragOver === folder.id 
                          ? activeTab === 'enrolled' 
                            ? 'border-green-400 bg-green-900/30 shadow-green-400/20' 
                            : 'border-yellow-400 bg-yellow-900/30 shadow-yellow-400/20'
                          : activeTab === 'enrolled'
                            ? 'border-green-500/30 hover:border-green-400 hover:bg-slate-600/50'
                            : 'border-yellow-500/30 hover:border-yellow-400 hover:bg-slate-600/50'
                    } ${
                      activeTab === 'enrolled' 
                        ? 'border-l-4 border-l-green-400' 
                        : 'border-l-4 border-l-yellow-400'
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
                            className="flex-1 px-3 py-2 bg-slate-600/50 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-blue-300/50 backdrop-blur transition-all duration-200 text-sm sm:text-base"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                            disabled={submitting}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <motion.button
                              onClick={handleSaveEdit}
                              disabled={submitting || !editingName.trim()}
                              className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 ${
                                submitting || !editingName.trim()
                                  ? 'bg-slate-600 cursor-not-allowed text-slate-400'
                                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
                              }`}
                              whileHover={submitting || !editingName.trim() ? {} : { scale: 1.05 }}
                              whileTap={submitting || !editingName.trim() ? {} : { scale: 0.95 }}
                            >
                              <span className="flex items-center gap-1">
                                {submitting ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                                    保存中...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    保存
                                  </>
                                )}
                              </span>
                            </motion.button>
                            <motion.button
                              onClick={() => {
                                setEditingFolder(null);
                                setEditingName('');
                              }}
                              disabled={submitting}
                              className="flex-1 sm:flex-none bg-slate-600/80 hover:bg-slate-500 disabled:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 shadow-lg border border-slate-500/50"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              キャンセル
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400/70 cursor-grab active:cursor-grabbing flex-shrink-0" />
                            <h3 className="text-lg sm:text-xl font-semibold text-white truncate">{folder.name}</h3>
                            <span className="text-xs sm:text-sm text-blue-300/70 whitespace-nowrap flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {folder.photoCount}枚
                            </span>
                            {/* ステータスバッジ */}
                            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap border ${
                              folder.status === 'enrolled' 
                                ? 'bg-green-900/50 text-green-300 border-green-400/50 backdrop-blur' 
                                : 'bg-yellow-900/50 text-yellow-300 border-yellow-400/50 backdrop-blur'
                            }`}>
                              {folder.status === 'enrolled' ? (
                                <span className="flex items-center gap-1">
                                  <Stars className="w-3 h-3" />
                                  在籍
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  卒業
                                </span>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {editingFolder !== folder.id && (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <motion.button
                          onClick={() => fetchPhotos(folder.id)}
                          disabled={submitting}
                          className="bg-purple-600/80 hover:bg-purple-600 disabled:bg-slate-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-none backdrop-blur border border-purple-400/30 shadow-lg min-h-[40px] sm:min-h-[44px] flex items-center justify-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="hidden sm:flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            写真管理
                          </span>
                          <span className="sm:hidden flex items-center justify-center w-full">
                            管理
                          </span>
                        </motion.button>
                        <motion.button
                          onClick={() => handleToggleStatus(folder.id)}
                          disabled={submitting}
                          className={`disabled:bg-slate-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-none backdrop-blur min-h-[40px] sm:min-h-[44px] flex items-center justify-center shadow-lg border ${
                            folder.status === 'enrolled' 
                              ? 'bg-yellow-600/80 hover:bg-yellow-600 border-yellow-400/30' 
                              : 'bg-green-600/80 hover:bg-green-600 border-green-400/30'
                          }`}
                          title={folder.status === 'enrolled' ? '卒業に変更' : '在籍に変更'}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="hidden sm:flex items-center gap-1">
                            {folder.status === 'enrolled' ? (
                              <>
                                <Sparkles className="w-3 h-3" />
                                卒業へ
                              </>
                            ) : (
                              <>
                                <Stars className="w-3 h-3" />
                                在籍へ
                              </>
                            )}
                          </span>
                          <span className="sm:hidden flex items-center justify-center w-full">
                            {folder.status === 'enrolled' ? '卒業' : '在籍'}
                          </span>
                        </motion.button>
                        <motion.button
                          onClick={() => handleEditFolder(folder.id)}
                          disabled={submitting}
                          className="bg-blue-600/80 hover:bg-blue-600 disabled:bg-slate-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-none backdrop-blur min-h-[40px] sm:min-h-[44px] flex items-center justify-center border border-blue-400/30 shadow-lg"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="hidden sm:flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            編集
                          </span>
                          <span className="sm:hidden flex items-center justify-center w-full">
                            編集
                          </span>
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteFolder(folder.id)}
                          disabled={submitting}
                          className="bg-red-600/80 hover:bg-red-600 disabled:bg-slate-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-none backdrop-blur min-h-[40px] sm:min-h-[44px] flex items-center justify-center border border-red-400/30 shadow-lg"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="hidden sm:flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            削除
                          </span>
                          <span className="sm:hidden flex items-center justify-center w-full">
                            削除
                          </span>
                        </motion.button>
                      </div>
                    )}
                  </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </motion.div>

        {/* Usage Monitor Section */}
        {activeTab === 'monitoring' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <UsageMonitor />
          </motion.div>
        )}

        {/* Photo Management Section */}
        {selectedFolder && (
          <motion.div 
            className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-xl p-4 sm:p-6 mt-6 sm:mt-8 border border-purple-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
                <Camera className="w-6 h-6 text-purple-400" />
                写真管理 - {folders.find(f => f.id === selectedFolder)?.name}
              </h2>
              <motion.button
                onClick={() => {
                  setSelectedFolder(null);
                  setPhotos([]);
                  setSelectedPhotos([]);
                  setShowPhotoSelection(false);
                  setPendingStatusChange(null);
                }}
                className="bg-slate-600/80 hover:bg-slate-500 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg transition-all duration-200 text-sm sm:text-base self-start sm:self-auto backdrop-blur border border-slate-500/50 shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                閉じる
              </motion.button>
            </div>

            {/* Photo Selection Warning for Graduated Folders */}
            {showPhotoSelection && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-900/30 backdrop-blur border border-yellow-400/50 text-yellow-300 px-4 py-3 rounded-lg mb-6 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">
                      {pendingStatusChange ? '卒業生への変更 - 写真削減' : '卒業生フォルダ - 写真制限'}
                    </h3>
                    <p className="text-sm mb-2">
                      {pendingStatusChange 
                        ? `このフォルダを卒業生に変更するため、${photos.length}枚の写真から50枚を選択してください。選択されなかった写真は削除され、その後卒業生ステータスに変更されます。`
                        : `このフォルダには${photos.length}枚の写真があります。卒業生フォルダは最大50枚まで保存できるため、残したい50枚の写真を選択してください。選択されなかった写真は削除されます。`
                      }
                    </p>
                    <p className="text-xs text-yellow-400/80">
                      選択済み: {selectedPhotos.length}/50枚
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Bulk Delete Controls for Photo Selection */}
            {showPhotoSelection && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-700/50 backdrop-blur border border-blue-500/30 rounded-lg p-4 mb-6 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">写真選択モード</h3>
                    <p className="text-sm text-blue-300">
                      残したい写真をクリックして選択してください ({selectedPhotos.length}/50枚選択済み)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleBulkDeletePhotos}
                      disabled={selectedPhotos.length !== 50 || submitting}
                      className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg ${
                        selectedPhotos.length === 50 && !submitting
                          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                          : 'bg-slate-600 cursor-not-allowed text-slate-400'
                      }`}
                      whileHover={selectedPhotos.length === 50 && !submitting ? { scale: 1.05 } : {}}
                      whileTap={selectedPhotos.length === 50 && !submitting ? { scale: 0.95 } : {}}
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                          削除中...
                        </span>
                      ) : (
                        pendingStatusChange ? '削除して卒業生に変更' : '選択外の写真を削除'
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowPhotoSelection(false);
                        setSelectedPhotos([]);
                        setPendingStatusChange(null);
                        setSelectedFolder(null);
                        setPhotos([]);
                      }}
                      disabled={submitting}
                      className="bg-slate-600/80 hover:bg-slate-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      キャンセル
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {photos.length === 0 ? (
              <motion.div 
                className="text-center py-6 sm:py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Camera className="w-8 h-8 text-white" />
                </motion.div>
                <p className="text-blue-300">この宇宙領域には写真がありません</p>
              </motion.div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      delayChildren: 0.2,
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {photos.map(photo => {
                  const isSelected = selectedPhotos.includes(photo.id);
                  return (
                    <motion.div 
                      key={photo.id} 
                      className="relative group"
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ y: -5, scale: 1.02 }}
                    >
                      <div 
                        className={`aspect-square bg-slate-700/50 rounded-lg overflow-hidden border shadow-lg transition-all duration-200 min-h-[120px] sm:min-h-[140px] ${
                          showPhotoSelection
                            ? `cursor-pointer ${
                                isSelected 
                                  ? 'border-green-400 ring-2 ring-green-400/50 bg-green-900/20' 
                                  : 'border-blue-500/30 hover:border-blue-400'
                              }`
                            : 'border-blue-500/30'
                        }`}
                        onClick={showPhotoSelection ? () => handlePhotoSelection(photo.id, !isSelected) : undefined}
                      >
                        <img
                          src={photo.url}
                          alt={photo.originalName}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            showPhotoSelection && !isSelected 
                              ? 'group-hover:scale-110 opacity-60' 
                              : 'group-hover:scale-110'
                          }`}
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg';
                          }}
                        />
                        {showPhotoSelection && (
                          <div className="absolute top-2 left-2">
                            <motion.div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center border-2 transition-all duration-200 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] shadow-lg ${
                                isSelected
                                  ? 'bg-green-500 border-green-400 text-white'
                                  : 'bg-white/20 backdrop-blur border-white/50 text-white/70'
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                              ) : (
                                <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                              )}
                            </motion.div>
                          </div>
                        )}
                        {!showPhotoSelection && (
                          <div className="absolute top-2 left-2">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFeatured(photo.id);
                              }}
                              disabled={submitting}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] ${
                                photo.isFeatured
                                  ? 'bg-yellow-500 border-yellow-400 text-white shadow-lg'
                                  : 'bg-white/20 backdrop-blur border-white/50 text-white/70 hover:bg-yellow-500/20 hover:border-yellow-400/50 shadow-md'
                              }`}
                              title={photo.isFeatured ? '代表写真から除外' : '代表写真に設定'}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${photo.isFeatured ? 'fill-current' : ''}`} />
                            </motion.button>
                          </div>
                        )}
                      </div>
                      {!showPhotoSelection && (
                        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            onClick={() => handleDeletePhoto(photo.id)}
                            disabled={submitting}
                            className="bg-red-600/90 hover:bg-red-600 disabled:bg-slate-600 text-white p-1.5 sm:p-2 rounded-full shadow-lg transition-all duration-200 backdrop-blur border border-red-400/50 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center"
                            title="写真を削除"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </motion.button>
                        </div>
                      )}
                      <div className="mt-1 sm:mt-2">
                        <p className="text-xs sm:text-sm text-blue-300 truncate" title={photo.originalName}>
                          {photo.originalName}
                        </p>
                        <p className="text-xs text-blue-400/70">
                          {new Date(photo.uploadedAt).toLocaleDateString('ja-JP')}
                        </p>
                        {showPhotoSelection && isSelected && (
                          <p className="text-xs text-green-400 mt-1">
                            ✓ 保持される写真
                          </p>
                        )}
                        {!showPhotoSelection && photo.isFeatured && (
                          <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            代表写真
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}