'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  Flex,
  Grid,
  Image,
  IconButton,
  Badge,
  Spinner,
  Center,
  Link,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  useToast,
  CloseButton,
} from '@chakra-ui/react';
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
  AlertTriangle,
  CheckCircle,
  GripVertical,
  Square,
  CheckSquare,
  Info,
  Star
} from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionButton = motion(Button);
const MotionCard = motion(Card);
const MotionFlex = motion(Flex);


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
  const [activeTab, setActiveTab] = useState<'enrolled' | 'graduated'>('enrolled');
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
        
        // Check if graduated folder has 10+ photos and needs selection
        // Use updatedFolder if provided, otherwise find from current folders state
        const folder = updatedFolder || folders.find(f => f.id === folderId);
        if (folder?.status === 'graduated' && data.photos?.length >= 10) {
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
      if (selectedPhotos.length < 5) {
        setSelectedPhotos(prev => [...prev, photoId]);
      } else {
        setError('残す写真は5枚まで選択できます');
      }
    } else {
      setSelectedPhotos(prev => prev.filter(id => id !== photoId));
    }
  };

  const handleBulkDeletePhotos = async () => {
    if (selectedPhotos.length !== 5) {
      setError('残す写真を5枚選択してください');
      return;
    }

    const photosToDelete = photos.filter(photo => !selectedPhotos.includes(photo.id));
    const confirmMessage = `${photosToDelete.length}枚の写真を削除して、選択した5枚を残しますか？この操作は取り消せません。`;
    
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
    
    // If changing to graduated status, check if folder has 10+ photos and show selection first
    if (newStatus === 'graduated' && folder.photoCount >= 10) {
      // First load photos to show selection interface
      await fetchPhotos(folderId);
      setActiveTab('graduated');
      const updatedFolder = { ...folder, status: 'graduated' as const };
      await fetchPhotos(folderId, updatedFolder);
      
      // Show confirmation after selection interface is displayed
      const confirmMessage = `このフォルダには${folder.photoCount}枚の写真があります。卒業生に変更するには5枚まで削減する必要があります。写真を選択して削減しますか？`;
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
  const filteredFolders = folders.filter(folder => folder.status === activeTab);

  if (!authenticated || loading) {
    return (
      <Box
        minH="100vh"
        bgGradient="linear(to-br, slate.900, purple.900, slate.900)"
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box position="absolute" inset={0} overflow="hidden">
          <Box className="stars" />
          <Box className="twinkling" />
        </Box>
        <MotionBox
          textAlign="center"
          position="relative"
          zIndex={10}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MotionBox
            position="relative"
            mx="auto"
            mb={6}
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity }
            }}
          >
            <Settings size="4rem" color="rgba(96, 165, 250, 1)" />
            <MotionBox
              position="absolute"
              inset="-4"
              borderRadius="full"
              border="2px solid"
              borderColor="rgba(96, 165, 250, 0.3)"
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </MotionBox>
          <MotionBox
            color="blue.300"
            fontSize="lg"
            fontWeight="medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            管理システム起動中...
          </MotionBox>
        </MotionBox>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, slate.900, purple.900, slate.900)"
      position="relative"
    >
      {/* Space stars background */}
      <Box position="absolute" inset={0} overflow="hidden">
        <Box className="stars" />
        <Box className="twinkling" />
      </Box>

      <MotionBox
        as="header"
        bg="rgba(30, 41, 59, 0.9)"
        backdropFilter="blur(12px)"
        boxShadow="lg"
        borderBottom="1px solid"
        borderBottomColor="rgba(59, 130, 246, 0.3)"
        position="relative"
        zIndex={10}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
          <Flex justify="space-between" align="center" py={{ base: 4, sm: 6 }}>
            <MotionFlex
              align="center"
              gap={3}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <MotionBox
                w={{ base: 12, sm: 14 }}
                h={{ base: 12, sm: 14 }}
                bgGradient="linear(to-br, blue.600, purple.600)"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="lg"
                border="1px solid"
                borderColor="rgba(59, 130, 246, 0.3)"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Settings size="1.75rem" color="white" />
              </MotionBox>
              <Heading
                size={{ base: "lg", sm: "xl", lg: "2xl", xl: "3xl" }}
                bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
                bgClip="text"
                color="transparent"
                fontWeight="bold"
              >
                <Text display={{ base: "none", sm: "inline" }}>宇宙船管理センター</Text>
                <Text display={{ base: "inline", sm: "none" }}>管理センター</Text>
              </Heading>
            </MotionFlex>
            <HStack spacing={{ base: 2, sm: 3 }}>
              <MotionButton
                onClick={handleLogout}
                bg="rgba(220, 38, 38, 0.8)"
                _hover={{ bg: "rgba(220, 38, 38, 1)" }}
                color="white"
                px={{ base: 4, sm: 6 }}
                py={{ base: 3, sm: 4 }}
                size={{ base: "sm", sm: "md" }}
                backdropFilter="blur(4px)"
                border="1px solid"
                borderColor="rgba(248, 113, 113, 0.3)"
                boxShadow="lg"
                minH="48px"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Text display={{ base: "none", sm: "flex" }} alignItems="center" gap={2}>
                  <LogOut size="1rem" />
                  ログアウト
                </Text>
                <Box display={{ base: "block", sm: "none" }}>
                  <LogOut size="1rem" />
                </Box>
              </MotionButton>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <MotionButton
                  bg="linear-gradient(to right, #2563eb, #7c3aed)"
                  _hover={{ bg: "linear-gradient(to right, #3b82f6, #8b5cf6)" }}
                  color="white"
                  px={{ base: 4, sm: 6 }}
                  py={{ base: 3, sm: 4 }}
                  size={{ base: "sm", sm: "md" }}
                  boxShadow="lg"
                  border="1px solid"
                  borderColor="rgba(59, 130, 246, 0.3)"
                  minH="48px"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <ArrowLeft size="1rem" />
                  <Text display={{ base: "none", sm: "inline" }}>宇宙ステーション</Text>
                  <Text display={{ base: "inline", sm: "none" }}>戻る</Text>
                </MotionButton>
              </Link>
            </HStack>
          </Flex>
        </Container>
      </MotionBox>

      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }} py={8} position="relative" zIndex={10}>
        <AnimatePresence>
          {error && (
            <MotionBox
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              bg="rgba(127, 29, 29, 0.3)"
              backdropFilter="blur(10px)"
              border="1px solid rgba(248, 113, 113, 0.5)"
              color="rgba(252, 165, 165, 1)"
              px={{ base: 3, sm: 4 }}
              py={{ base: 2, sm: 3 }}
              borderRadius="lg"
              mb={{ base: 4, sm: 6 }}
              fontSize={{ base: "sm", sm: "md" }}
              boxShadow="lg"
            >
              <Flex align="center" gap={2}>
                <AlertTriangle size="1rem" />
                <Text flex="1">{error}</Text>
                <CloseButton
                  onClick={() => setError(null)}
                  color="rgba(252, 165, 165, 1)"
                  _hover={{ bg: "rgba(127, 29, 29, 0.5)" }}
                  size="sm"
                />
              </Flex>
            </MotionBox>
          )}
        </AnimatePresence>

        <MotionCard
          bg="rgba(30, 41, 59, 0.6)"
          backdropFilter="blur(12px)"
          borderRadius="xl"
          boxShadow="xl"
          p={{ base: 4, sm: 6 }}
          mb={{ base: 6, sm: 8 }}
          border="1px solid"
          borderColor="rgba(59, 130, 246, 0.3)"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <CardBody p={0}>
            <Heading
              size={{ base: "xl", sm: "2xl" }}
              bgGradient="linear(to-r, blue.400, purple.400)"
              bgClip="text"
              color="transparent"
              mb={{ base: 4, sm: 6 }}
              display="flex"
              alignItems="center"
              gap={3}
            >
              <Plus size="1.5rem" color="rgba(96, 165, 250, 1)" />
              新しいフォルダを作成
            </Heading>
            <Flex direction={{ base: "column", sm: "row" }} gap={{ base: 3, sm: 4 }}>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="ねこ様の名前を入力..."
                aria-label="新しいフォルダの名前"
                flex="1"
                bg="rgba(71, 85, 105, 0.5)"
                border="1px solid"
                borderColor="rgba(59, 130, 246, 0.3)"
                color="white"
                _placeholder={{ color: "rgba(147, 197, 253, 0.5)" }}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)"
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                isDisabled={submitting}
                size={{ base: "md", sm: "lg" }}
              />
              <MotionButton
                onClick={handleAddFolder}
                isDisabled={submitting || !newFolderName.trim()}
                bg={submitting || !newFolderName.trim() 
                  ? "rgba(71, 85, 105, 1)" 
                  : "linear-gradient(to right, #059669, #10b981)"}
                _hover={submitting || !newFolderName.trim() ? {} : {
                  bg: "linear-gradient(to right, #047857, #059669)"
                }}
                color={submitting || !newFolderName.trim() ? "rgba(148, 163, 184, 1)" : "white"}
                px={{ base: 4, sm: 6 }}
                py={{ base: 2, sm: 2 }}
                size={{ base: "md", sm: "lg" }}
                whiteSpace="nowrap"
                boxShadow="lg"
                whileHover={submitting || !newFolderName.trim() ? {} : { scale: 1.05 }}
                whileTap={submitting || !newFolderName.trim() ? {} : { scale: 0.95 }}
                display="flex"
                alignItems="center"
                gap={2}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" color="blue.300" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Plus size="1rem" />
                    作成
                  </>
                )}
              </MotionButton>
            </Flex>
          </CardBody>
        </MotionCard>

        <MotionCard
          bg="rgba(30, 41, 59, 0.6)"
          backdropFilter="blur(12px)"
          borderRadius="xl"
          boxShadow="xl"
          p={{ base: 4, sm: 6 }}
          border="1px solid"
          borderColor="rgba(59, 130, 246, 0.3)"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <CardBody p={0}>
            <VStack spacing={{ base: 4, sm: 6 }} align="stretch">
              <Heading
                size={{ base: "xl", sm: "2xl" }}
                bgGradient="linear(to-r, blue.400, purple.400)"
                bgClip="text"
                color="transparent"
                mb={4}
                display="flex"
                alignItems="center"
                gap={3}
              >
                <Settings size="1.5rem" color="rgba(96, 165, 250, 1)" />
                管理センター
              </Heading>
              
              {/* Custom Tab Navigation */}
              <Box>
                <Box borderBottom="1px solid" borderBottomColor="rgba(59, 130, 246, 0.3)" mb={4}>
                  <HStack spacing={8} mb="-2px">
                    <MotionButton
                      onClick={() => setActiveTab('enrolled')}
                      variant="ghost"
                      py={3}
                      px={6}
                      borderBottom="2px solid"
                      borderBottomColor={activeTab === 'enrolled' ? "green.400" : "transparent"}
                      color={activeTab === 'enrolled' ? "green.300" : "rgba(147, 197, 253, 0.7)"}
                      _hover={activeTab !== 'enrolled' ? { 
                        color: "blue.300", 
                        borderBottomColor: "rgba(59, 130, 246, 0.5)" 
                      } : {}}
                      fontWeight="medium"
                      fontSize={{ base: "sm", sm: "md" }}
                      css={{ transition: "all 0.2s" }}
                      minH="48px"
                      whileHover={{ y: -2 }}
                      borderRadius={0}
                    >
                      <HStack spacing={2}>
                        <Stars size="1rem" />
                        <Text>在籍生 ({folders.filter(f => f.status === 'enrolled').length})</Text>
                      </HStack>
                    </MotionButton>
                    <MotionButton
                      onClick={() => setActiveTab('graduated')}
                      variant="ghost"
                      py={3}
                      px={6}
                      borderBottom="2px solid"
                      borderBottomColor={activeTab === 'graduated' ? "yellow.400" : "transparent"}
                      color={activeTab === 'graduated' ? "yellow.300" : "rgba(147, 197, 253, 0.7)"}
                      _hover={activeTab !== 'graduated' ? { 
                        color: "blue.300", 
                        borderBottomColor: "rgba(59, 130, 246, 0.5)" 
                      } : {}}
                      fontWeight="medium"
                      fontSize={{ base: "sm", sm: "md" }}
                      css={{ transition: "all 0.2s" }}
                      minH="48px"
                      whileHover={{ y: -2 }}
                      borderRadius={0}
                    >
                      <HStack spacing={2}>
                        <Sparkles size="1rem" />
                        <Text>卒業生 ({folders.filter(f => f.status === 'graduated').length})</Text>
                      </HStack>
                    </MotionButton>
                  </HStack>
                </Box>
                
                <Text 
                  fontSize={{ base: "xs", sm: "sm" }} 
                  color="rgba(147, 197, 253, 0.7)"
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <GripVertical size="1rem" />
                  フォルダをドラッグ&ドロップして表示順序を変更
                </Text>
              </Box>
          <motion.div 
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  delayChildren: 0.1,
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {filteredFolders.length === 0 ? (
              <MotionVStack 
                spacing={4}
                py={8}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <MotionBox
                  w={16}
                  h={16}
                  bgGradient="linear(to-br, blue.500, purple.500)"
                  borderRadius="2xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="xl"
                  animate={{ 
                    scale: [1, 1.02, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {activeTab === 'enrolled' ? (
                    <Stars size="2rem" color="white" />
                  ) : (
                    <Sparkles size="2rem" color="white" />
                  )}
                </MotionBox>
                <Text color="blue.300">
                  {activeTab === 'enrolled' ? '在籍生の宇宙領域がありません' : '卒業生の宇宙領域がありません'}
                </Text>
              </MotionVStack>
            ) : (
              filteredFolders.map((folder) => (
                <MotionCard
                  key={folder.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -1 }}
                  role="listitem"
                  tabIndex={0}
                  bg="rgba(71, 85, 105, 0.5)"
                  backdropFilter="blur(12px)"
                  borderRadius="xl"
                  p={{ base: 3, sm: 4 }}
                  transition="all 0.2s"
                  boxShadow="lg"
                  border="1px solid"
                  borderColor={
                    draggedFolder === folder.id
                      ? "transparent"
                      : isDragOver === folder.id
                      ? activeTab === 'enrolled'
                        ? "green.400"
                        : "yellow.400"
                      : activeTab === 'enrolled'
                      ? "green.500"
                      : "yellow.500"
                  }
                  borderLeftWidth={4}
                  borderLeftColor={activeTab === 'enrolled' ? "green.400" : "yellow.400"}
                  opacity={draggedFolder === folder.id ? 0.5 : 1}
                  transform={draggedFolder === folder.id ? "scale(0.95)" : "none"}
                  _hover={{
                    borderColor: activeTab === 'enrolled' ? "green.400" : "yellow.400",
                    bg: "rgba(71, 85, 105, 0.7)"
                  }}
                  draggable={editingFolder !== folder.id}
                  onDragStart={(e) => handleDragStart(e, folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <CardBody p={0}>
                    <Flex 
                      direction={{ base: "column", sm: "row" }} 
                      align={{ sm: "center" }} 
                      justify={{ sm: "space-between" }} 
                      gap={3}
                    >
                      <Flex align="center" gap={{ base: 2, sm: 4 }} minW={0} flex={1}>
                      {editingFolder === folder.id ? (
                        <VStack spacing={2} align="stretch" w="full">
                          <Flex direction={{ base: "column", sm: "row" }} gap={2} w="full">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              bg="rgba(71, 85, 105, 0.5)"
                              border="1px solid"
                              borderColor="blue.500"
                              borderRadius="lg"
                              color="white"
                              _placeholder={{ color: "blue.300" }}
                              _focus={{
                                borderColor: "blue.400",
                                boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)"
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                              aria-label="フォルダ名を編集"
                              isDisabled={submitting}
                              autoFocus
                              flex={1}
                              size={{ base: "sm", sm: "md" }}
                            />
                            <HStack spacing={2}>
                              <MotionButton
                                onClick={handleSaveEdit}
                                isDisabled={submitting || !editingName.trim()}
                                bgGradient={submitting || !editingName.trim() 
                                  ? "none"
                                  : "linear(to-r, green.600, green.500)"
                                }
                                bg={submitting || !editingName.trim() ? "gray.600" : undefined}
                                color="white"
                                _hover={submitting || !editingName.trim() ? {} : {
                                  bgGradient: "linear(to-r, green.500, green.400)"
                                }}
                                px={3}
                                py={2}
                                borderRadius="lg"
                                size={{ base: "xs", sm: "sm" }}
                                boxShadow="lg"
                                whileHover={submitting || !editingName.trim() ? {} : { scale: 1.05 }}
                                whileTap={submitting || !editingName.trim() ? {} : { scale: 0.95 }}
                                leftIcon={submitting ? <Spinner size="xs" /> : <CheckCircle size="0.75rem" />}
                              >
                                {submitting ? "保存中..." : "保存"}
                              </MotionButton>
                              <MotionButton
                                onClick={() => {
                                  setEditingFolder(null);
                                  setEditingName('');
                                }}
                                isDisabled={submitting}
                                bg="gray.600"
                                _hover={{ bg: "gray.500" }}
                                _disabled={{ bg: "gray.700" }}
                                color="white"
                                px={3}
                                py={2}
                                borderRadius="lg"
                                size={{ base: "xs", sm: "sm" }}
                                boxShadow="lg"
                                border="1px solid"
                                borderColor="gray.500"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                キャンセル
                              </MotionButton>
                            </HStack>
                          </Flex>
                        </VStack>
                      ) : (
                        <HStack spacing={2} minW={0} flex={1}>
                          <Box color="blue.400" cursor="grab" _active={{ cursor: "grabbing" }} flexShrink={0}>
                            <GripVertical size="1.25rem" />
                          </Box>
                          <Heading 
                            size={{ base: "md", sm: "lg" }} 
                            color="white" 
                            noOfLines={1}
                            flex={1}
                          >
                            {folder.name}
                          </Heading>
                          <HStack spacing={1} fontSize={{ base: "xs", sm: "sm" }} color="blue.300" flexShrink={0}>
                            <Camera size="0.75rem" />
                            <Text>{folder.photoCount}枚</Text>
                          </HStack>
                          <Badge
                            fontSize="xs"
                            px={2}
                            py={1}
                            borderRadius="full"
                            border="1px solid"
                            backdropFilter="blur(4px)"
                            bg={folder.status === 'enrolled' ? "green.900" : "yellow.900"}
                            color={folder.status === 'enrolled' ? "green.300" : "yellow.300"}
                            borderColor={folder.status === 'enrolled' ? "green.400" : "yellow.400"}
                            opacity={0.9}
                          >
                            <HStack spacing={1}>
                              {folder.status === 'enrolled' ? (
                                <Stars size="0.75rem" />
                              ) : (
                                <Sparkles size="0.75rem" />
                              )}
                              <Text>{folder.status === 'enrolled' ? '在籍' : '卒業'}</Text>
                            </HStack>
                          </Badge>
                        </HStack>
                      )}
                      </Flex>
                    {editingFolder !== folder.id && (
                      <Box>
                        <VStack spacing={2} display={{ base: "flex", sm: "none" }} w="full">
                          <HStack spacing={2} w="full">
                          <MotionButton
                            onClick={() => fetchPhotos(folder.id)}
                            isDisabled={submitting}
                            bg="purple.600"
                            _hover={{ bg: "purple.500" }}
                            _disabled={{ bg: "gray.600" }}
                            color="white"
                            px={4}
                            py={3}
                            borderRadius="lg"
                            size="sm"
                            backdropFilter="blur(4px)"
                            border="1px solid"
                            borderColor="purple.400"
                            boxShadow="lg"
                            minH="44px"
                            flex={1}
                            fontWeight="medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            leftIcon={<Camera size="1rem" />}
                          >
                            写真管理
                          </MotionButton>
                          <MotionButton
                            onClick={() => handleToggleStatus(folder.id)}
                            isDisabled={submitting}
                            bg={folder.status === 'enrolled' ? "yellow.600" : "green.600"}
                            _hover={{ 
                              bg: folder.status === 'enrolled' ? "yellow.500" : "green.500" 
                            }}
                            _disabled={{ bg: "gray.600" }}
                            color="white"
                            px={4}
                            py={3}
                            borderRadius="lg"
                            size="sm"
                            backdropFilter="blur(4px)"
                            border="1px solid"
                            borderColor={folder.status === 'enrolled' ? "yellow.400" : "green.400"}
                            boxShadow="lg"
                            minH="44px"
                            flex={1}
                            fontWeight="medium"
                            title={folder.status === 'enrolled' ? '卒業に変更' : '在籍に変更'}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            leftIcon={folder.status === 'enrolled' ? 
                              <Sparkles size="1rem" /> : 
                              <Stars size="1rem" />
                            }
                          >
                            {folder.status === 'enrolled' ? '卒業へ' : '在籍へ'}
                          </MotionButton>
                        </HStack>
                        
                        <HStack spacing={2} w="full">
                          <MotionButton
                            onClick={() => handleEditFolder(folder.id)}
                            isDisabled={submitting}
                            bg="blue.600"
                            _hover={{ bg: "blue.500" }}
                            _disabled={{ bg: "gray.600" }}
                            color="white"
                            px={4}
                            py={3}
                            borderRadius="lg"
                            size="sm"
                            backdropFilter="blur(4px)"
                            border="1px solid"
                            borderColor="blue.400"
                            boxShadow="lg"
                            minH="44px"
                            flex={1}
                            fontWeight="medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            leftIcon={<Edit3 size="1rem" />}
                          >
                            編集
                          </MotionButton>
                          <MotionButton
                            onClick={() => handleDeleteFolder(folder.id)}
                            isDisabled={submitting}
                            bg="red.600"
                            _hover={{ bg: "red.500" }}
                            _disabled={{ bg: "gray.600" }}
                            color="white"
                            px={4}
                            py={3}
                            borderRadius="lg"
                            size="sm"
                            backdropFilter="blur(4px)"
                            border="1px solid"
                            borderColor="red.400"
                            boxShadow="lg"
                            minH="44px"
                            flex={1}
                            fontWeight="medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            leftIcon={<Trash2 size="1rem" />}
                          >
                            削除
                          </MotionButton>
                        </HStack>
                      </VStack>

                      {/* デスクトップ: 横並びのボタン */}
                      <HStack spacing={2} display={{ base: "none", sm: "flex" }}>
                        <MotionButton
                          onClick={() => fetchPhotos(folder.id)}
                          isDisabled={submitting}
                          bg="purple.600"
                          _hover={{ bg: "purple.500" }}
                          _disabled={{ bg: "gray.600" }}
                          color="white"
                          px={4}
                          py={3}
                          borderRadius="lg"
                          size="sm"
                          backdropFilter="blur(4px)"
                          border="1px solid"
                          borderColor="purple.400"
                          boxShadow="lg"
                          minH="44px"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          leftIcon={<Camera size="1rem" />}
                        >
                          写真管理
                        </MotionButton>
                        <MotionButton
                          onClick={() => handleToggleStatus(folder.id)}
                          isDisabled={submitting}
                          bg={folder.status === 'enrolled' ? "yellow.600" : "green.600"}
                          _hover={{ 
                            bg: folder.status === 'enrolled' ? "yellow.500" : "green.500" 
                          }}
                          _disabled={{ bg: "gray.600" }}
                          color="white"
                          px={4}
                          py={3}
                          borderRadius="lg"
                          size="sm"
                          backdropFilter="blur(4px)"
                          border="1px solid"
                          borderColor={folder.status === 'enrolled' ? "yellow.400" : "green.400"}
                          boxShadow="lg"
                          minH="44px"
                          title={folder.status === 'enrolled' ? '卒業に変更' : '在籍に変更'}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          leftIcon={folder.status === 'enrolled' ? 
                            <Sparkles size="1rem" /> : 
                            <Stars size="1rem" />
                          }
                        >
                          {folder.status === 'enrolled' ? '卒業へ' : '在籍へ'}
                        </MotionButton>
                        <MotionButton
                          onClick={() => handleEditFolder(folder.id)}
                          isDisabled={submitting}
                          bg="blue.600"
                          _hover={{ bg: "blue.500" }}
                          _disabled={{ bg: "gray.600" }}
                          color="white"
                          px={4}
                          py={3}
                          borderRadius="lg"
                          size="sm"
                          backdropFilter="blur(4px)"
                          border="1px solid"
                          borderColor="blue.400"
                          boxShadow="lg"
                          minH="44px"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          leftIcon={<Edit3 size="1rem" />}
                        >
                          編集
                        </MotionButton>
                        <MotionButton
                          onClick={() => handleDeleteFolder(folder.id)}
                          isDisabled={submitting}
                          bg="red.600"
                          _hover={{ bg: "red.500" }}
                          _disabled={{ bg: "gray.600" }}
                          color="white"
                          px={4}
                          py={3}
                          borderRadius="lg"
                          size="sm"
                          backdropFilter="blur(4px)"
                          border="1px solid"
                          borderColor="red.400"
                          boxShadow="lg"
                          minH="44px"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          leftIcon={<Trash2 size="1rem" />}
                        >
                          削除
                        </MotionButton>
                      </HStack>
                      </Box>
                    )}
                    </Flex>
                  </CardBody>
                </MotionCard>
                </motion.div>
              ))
            )}
          </motion.div>
            </VStack>
          </CardBody>
        </MotionCard>

        {/* Photo Management Section */}
        {selectedFolder && (
          <MotionCard
            bg="rgba(30, 41, 59, 0.6)"
            backdropFilter="blur(12px)"
            borderRadius="xl"
            boxShadow="xl"
            p={{ base: 4, sm: 6 }}
            mt={{ base: 6, sm: 8 }}
            border="1px solid"
            borderColor="purple.500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <CardBody>
              <Flex 
                direction={{ base: "column", sm: "row" }} 
                align={{ sm: "center" }} 
                justify={{ sm: "space-between" }} 
                gap={{ base: 3, sm: 0 }} 
                mb={{ base: 4, sm: 6 }}
              >
                <Heading
                  size={{ base: "lg", sm: "xl", lg: "2xl" }}
                  bgGradient="linear(to-r, purple.400, cyan.400)"
                  bgClip="text"
                  color="transparent"
                  display="flex"
                  alignItems="center"
                  gap={3}
                >
                  <Camera size="1.5rem" color="rgba(167, 139, 250, 1)" />
                  写真管理 - {folders.find(f => f.id === selectedFolder)?.name}
                </Heading>
                <MotionButton
                  onClick={() => {
                    setSelectedFolder(null);
                    setPhotos([]);
                    setSelectedPhotos([]);
                    setShowPhotoSelection(false);
                    setPendingStatusChange(null);
                  }}
                  bg="gray.600"
                  _hover={{ bg: "gray.500" }}
                  color="white"
                  px={{ base: 4, sm: 6 }}
                  py={{ base: 3, sm: 4 }}
                  borderRadius="lg"
                  size={{ base: "sm", sm: "md" }}
                  backdropFilter="blur(4px)"
                  border="1px solid"
                  borderColor="gray.500"
                  boxShadow="lg"
                  alignSelf={{ base: "flex-start", sm: "auto" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  閉じる
                </MotionButton>
              </Flex>

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
                        ? `このフォルダを卒業生に変更するため、${photos.length}枚の写真から5枚を選択してください。選択されなかった写真は削除され、その後卒業生ステータスに変更されます。`
                        : `このフォルダには${photos.length}枚の写真があります。卒業生フォルダは最大10枚まで保存できるため、残したい5枚の写真を選択してください。選択されなかった写真は削除されます。`
                      }
                    </p>
                    <p className="text-xs text-yellow-400/80">
                      選択済み: {selectedPhotos.length}/5枚
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
                      残したい写真をクリックして選択してください ({selectedPhotos.length}/5枚選択済み)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleBulkDeletePhotos}
                      disabled={selectedPhotos.length !== 5 || submitting}
                      className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg ${
                        selectedPhotos.length === 5 && !submitting
                          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                          : 'bg-slate-600 cursor-not-allowed text-slate-400'
                      }`}
                      whileHover={selectedPhotos.length === 5 && !submitting ? { scale: 1.05 } : {}}
                      whileTap={selectedPhotos.length === 5 && !submitting ? { scale: 0.95 } : {}}
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
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {photos.map(photo => {
                  const isSelected = selectedPhotos.includes(photo.id);
                  return (
                    <div 
                      key={photo.id} 
                      className="relative group"
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
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </Container>
    </Box>
  );
}