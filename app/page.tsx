'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Container,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  IconButton,
  Grid,
  GridItem,
  Badge,
  Alert,
  AlertIcon,
  CloseButton,
  Spinner,
  Center,
  AspectRatio,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Tooltip,
  Card,
  CardBody,
  CardHeader,
  Avatar,
  AvatarBadge,
} from '@chakra-ui/react';
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
  Heart,
  Instagram,
  Globe
} from 'lucide-react';
import { compressImage, COMPRESSION_PRESETS } from '@/lib/image-compression';

type CatPhoto = {
  id: string;
  url: string;
  originalName: string;
  uploadedAt: string;
  likes: number;
};

type CatFolder = {
  id: string;
  name: string;
  displayOrder: number;
  status: 'enrolled' | 'graduated';
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

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionVStack = motion(VStack);
const MotionCard = motion(Card);
const MotionButton = motion(Button);

export default function Home() {
  const [folders, setFolders] = useState<CatFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFolderData, setSelectedFolderData] = useState<CatFolder | null>(null);
  const [uploadingFolder, setUploadingFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'graduated'>('enrolled');
  const [currentPage, setCurrentPage] = useState(1);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;
  const detailUploadRef = useRef<HTMLInputElement>(null);

  const bgGradient = useColorModeValue(
    'linear(to-br, slate.900, purple.900, slate.900)',
    'linear(to-br, slate.900, purple.900, slate.900)'
  );

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
    const savedLikedPhotos = localStorage.getItem('nekosama_liked_photos');
    if (savedLikedPhotos) {
      try {
        const likedPhotoIds = JSON.parse(savedLikedPhotos);
        setLikedPhotos(new Set(likedPhotoIds));
      } catch (error) {
        console.error('Failed to parse liked photos from localStorage:', error);
      }
    }
    fetchFolders();
  }, []);

  const saveLikedPhotos = (likedPhotoSet: Set<string>) => {
    try {
      localStorage.setItem('nekosama_liked_photos', JSON.stringify(Array.from(likedPhotoSet)));
    } catch (error) {
      console.error('Failed to save liked photos to localStorage:', error);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastUpdate = localStorage.getItem('nekosama_data_updated');
        
        if (lastUpdate && parseInt(lastUpdate) > (Date.now() - 60000)) {
          localStorage.removeItem('nekosama_data_updated');
          fetchFolders();
        } else {
          fetchFolders();
        }
      }
    };

    const handleFocus = () => {
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
        const updatedFolder = {
          ...data.folder,
          photos: data.folder.photos.map((photo: CatPhoto) => ({
            ...photo,
            likes: photo.likes || 0
          }))
        };
        setSelectedFolderData(updatedFolder);
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
    setCurrentPage(1);
    fetchFolderDetails(folderId);
  };

  const handleLikePhoto = async (photoId: string) => {
    if (!selectedFolderData) return;
    
    const isLiked = likedPhotos.has(photoId);

    try {
      if (isLiked) {
        const response = await fetch(`/api/photos/${photoId}/like`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to unlike photo');
        }

        const data = await response.json();
        
        const newLikedPhotos = new Set(likedPhotos);
        newLikedPhotos.delete(photoId);
        setLikedPhotos(newLikedPhotos);
        saveLikedPhotos(newLikedPhotos);
        
        setSelectedFolderData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: prev.photos.map(photo =>
              photo.id === photoId 
                ? { ...photo, likes: data.likes || Math.max(0, photo.likes - 1) }
                : photo
            )
          };
        });
      } else {
        const response = await fetch(`/api/photos/${photoId}/like`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to like photo');
        }

        const data = await response.json();
        
        const newLikedPhotos = new Set(likedPhotos);
        newLikedPhotos.add(photoId);
        setLikedPhotos(newLikedPhotos);
        saveLikedPhotos(newLikedPhotos);
        
        setSelectedFolderData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: prev.photos.map(photo =>
              photo.id === photoId 
                ? { ...photo, likes: data.likes || (photo.likes + 1) }
                : photo
            )
          };
        });
      }
    } catch (error) {
      console.error('Error handling like/unlike photo:', error);
    }
  };

  const handleFileUpload = async (folderId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploadingFolder(folderId);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`);
        }

        let processedFile = file;
        try {
          processedFile = await compressImage(file, COMPRESSION_PRESETS.low);
        } catch (compressionError) {
          console.warn('Image compression failed, using original file:', compressionError);
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
      
      const hasAutoDeletion = results.some(result => result.message?.includes('古い写真を自動削除'));
      if (hasAutoDeletion) {
        setSuccessMessage('写真をアップロードしました。古い写真を自動削除して最大100枚を維持しています。');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
      
      await fetchFolders();
      
      if (selectedFolder === folderId) {
        await fetchFolderDetails(folderId);
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploadingFolder(null);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={bgGradient} position="relative">
        <Box position="absolute" inset={0} overflow="hidden">
          <Box className="stars" />
          <Box className="twinkling" />
        </Box>
        <Center minH="100vh" zIndex={10} position="relative">
          <MotionVStack
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            spacing={6}
          >
            <MotionBox
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity },
                scale: { duration: 1.5, repeat: Infinity }
              }}
              position="relative"
            >
              <Box color="blue.400" fontSize="4xl">
                <Rocket />
              </Box>
              <MotionBox
                position="absolute"
                inset="-4"
                border="2px solid"
                borderColor="blue.400"
                borderRadius="full"
                opacity={0.3}
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </MotionBox>
            <MotionBox
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Text color="blue.300" fontSize="lg" fontWeight="medium">
                宇宙船システム起動中...
              </Text>
            </MotionBox>
          </MotionVStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgGradient} position="relative">
      <Box position="absolute" inset={0} overflow="hidden">
        <Box className="stars" />
        <Box className="twinkling" />
      </Box>
      
      {/* Header */}
      <MotionFlex
        as="header"
        bg="slate.800"
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="blue.500"
        borderBottomWidth="1px"
        borderBottomStyle="solid"
        borderBottomColor="rgba(59, 130, 246, 0.3)"
        zIndex={10}
        position="relative"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Container maxW="6xl" p={4}>
          <Flex justify="space-between" align="center">
            <MotionFlex
              align="center"
              gap={4}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <MotionBox
                position="relative"
                w={14} h={14}
                bg="linear(to-br, blue.600, purple.600)"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="1px solid"
                borderColor="blue.400"
                borderOpacity={0.3}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Box color="white" fontSize="xl">
                  <Rocket />
                </Box>
                <MotionBox
                  position="absolute"
                  inset={0}
                  borderRadius="lg"
                  bg="blue.400"
                  opacity={0}
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </MotionBox>
              <VStack align="start" spacing={0}>
                <Heading 
                  size="xl"
                  bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
                  bgClip="text"
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <Stars />
                  Space Cat Station
                </Heading>
                <Text color="blue.300" fontSize="sm" display={{ base: "none", sm: "flex" }} alignItems="center" gap={1}>
                  <Sparkles />
                  Presented by 拝啓ねこ様
                </Text>
              </VStack>
            </MotionFlex>
            <MotionButton
              as={Link}
              href="/admin"
              bg="slate.700"
              color="blue.200"
              borderColor="slate.600"
              borderOpacity={0.5}
              _hover={{
                bg: "slate.600",
                color: "white",
                borderColor: "slate.500"
              }}
              leftIcon={<Zap />}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Text display={{ base: "none", sm: "block" }}>Control Center</Text>
              <Text display={{ base: "block", sm: "none" }}>管理</Text>
            </MotionButton>
          </Flex>
        </Container>
      </MotionFlex>

      <Container maxW="7xl" py={8} zIndex={10} position="relative">
        <AnimatePresence>
          {error && (
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              mb={6}
            >
              <Alert status="error" borderRadius="lg" backdropFilter="blur(10px)">
                <AlertIcon />
                <Box flex="1">
                  {error}
                </Box>
                <CloseButton
                  onClick={() => setError(null)}
                  position="absolute"
                  right={2}
                  top={2}
                />
              </Alert>
            </MotionBox>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {successMessage && (
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              mb={6}
            >
              <Alert status="success" borderRadius="lg" backdropFilter="blur(10px)">
                <AlertIcon />
                <Box flex="1">
                  {successMessage}
                </Box>
                <CloseButton
                  onClick={() => setSuccessMessage(null)}
                  position="absolute"
                  right={2}
                  top={2}
                />
              </Alert>
            </MotionBox>
          )}
        </AnimatePresence>

        {!selectedFolder ? (
          <MotionVStack
            spacing={8}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <MotionVStack
              spacing={4}
              textAlign="center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Heading
                size="2xl"
                bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
                bgClip="text"
                display="flex"
                alignItems="center"
                gap={3}
                flexWrap="wrap"
              >
                <FolderOpen />
                拝啓ねこ様フォトギャラリー
              </Heading>
              <Text color="blue.300" fontSize="lg" display="flex" alignItems="center" gap={2} flexWrap="wrap">
                阿佐ヶ谷の誇る名所、拝啓ねこ様のねこちゃん達の活き活きした姿をご覧あれ！
              </Text>
            </MotionVStack>

            <MotionBox
              w="full"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Tabs
                index={activeTab === 'enrolled' ? 0 : 1}
                onChange={(index) => setActiveTab(index === 0 ? 'enrolled' : 'graduated')}
                variant="enclosed"
                colorScheme={activeTab === 'enrolled' ? 'green' : 'yellow'}
              >
                <TabList justifyContent="center" mb={6}>
                  <MotionButton
                    as={Tab}
                    leftIcon={<Stars />}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    在籍生 ({folders.filter(f => f.status === 'enrolled').length})
                  </MotionButton>
                  <MotionButton
                    as={Tab}
                    leftIcon={<Sparkles />}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    卒業生 ({folders.filter(f => f.status === 'graduated').length})
                  </MotionButton>
                </TabList>
                
                <TabPanels>
                  <TabPanel>
                    <FolderGrid 
                      folders={folders.filter(f => f.status === 'enrolled')}
                      onSelectFolder={handleFolderSelect}
                      onFileUpload={handleFileUpload}
                      uploadingFolder={uploadingFolder}
                      status="enrolled"
                    />
                  </TabPanel>
                  <TabPanel>
                    <FolderGrid 
                      folders={folders.filter(f => f.status === 'graduated')}
                      onSelectFolder={handleFolderSelect}
                      onFileUpload={handleFileUpload}
                      uploadingFolder={uploadingFolder}
                      status="graduated"
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </MotionBox>
          </MotionVStack>
        ) : (
          <FolderDetailView
            selectedFolderData={selectedFolderData}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            likedPhotos={likedPhotos}
            onLikePhoto={handleLikePhoto}
            onBack={async () => {
              setSelectedFolder(null);
              setSelectedFolderData(null);
              await fetchFolders();
            }}
            onFileUpload={handleFileUpload}
            uploadingFolder={uploadingFolder}
            triggerFileUpload={triggerFileUpload}
          />
        )}
      </Container>

      {/* Footer */}
      <MotionFlex
        as="footer"
        bg="slate.800"
        backdropFilter="blur(10px)"
        borderTop="1px solid"
        borderColor="blue.500"
        borderTopWidth="1px"
        borderTopStyle="solid"
        borderTopColor="rgba(59, 130, 246, 0.3)"
        mt={4}
        zIndex={10}
        position="relative"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <Container maxW="7xl" p={4}>
          <VStack spacing={6}>
            <HStack spacing={6} flexWrap="wrap" justify="center">
              <MotionButton
                as="a"
                href="https://x.com/haikeinekosama"
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<Twitter />}
                bg="slate.700"
                color="blue.200"
                size="sm"
                _hover={{ bg: "blue.600", color: "white" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                X (Twitter)
              </MotionButton>
              
              <MotionButton
                as="a"
                href="https://www.instagram.com/haikeinekosama/"
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<Instagram />}
                bg="slate.700"
                color="blue.200"
                size="sm"
                _hover={{ bg: "pink.600", color: "white" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Instagram
              </MotionButton>
              
              <MotionButton
                as="a"
                href="https://aboutme.style/haikeinekosama"
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<Globe />}
                bg="slate.700"
                color="blue.200"
                size="sm"
                _hover={{ bg: "purple.600", color: "white" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                HP
              </MotionButton>
            </HStack>
            
            <Text color="blue.300" fontSize="sm" textAlign="center" flexWrap="wrap">
              Presented by{' '}
              <MotionBox
                as="a"
                href="https://x.com/kilomake0607"
                target="_blank"
                rel="noopener noreferrer"
                color="cyan.400"
                textDecoration="underline"
                _hover={{ color: "cyan.300" }}
                whileHover={{ scale: 1.05 }}
              >
                きろめいく里親
              </MotionBox>
            </Text>
          </VStack>
        </Container>
      </MotionFlex>
    </Box>
  );
}

// Folder Grid Component
function FolderGrid({ 
  folders, 
  onSelectFolder, 
  onFileUpload, 
  uploadingFolder,
  status 
}: {
  folders: CatFolder[];
  onSelectFolder: (folderId: string) => void;
  onFileUpload: (folderId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingFolder: string | null;
  status: 'enrolled' | 'graduated';
}) {
  if (folders.length === 0) {
    return (
      <MotionBox
        textAlign="center"
        py={16}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <MotionBox
          w={20} h={20}
          mx="auto"
          mb={6}
          bg="slate.700"
          borderRadius="2xl"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="2px dashed"
          borderColor="blue.400"
          borderOpacity={0.3}
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {status === 'enrolled' ? (
            <Stars size="2rem" color="white" />
          ) : (
            <Sparkles size="2rem" color="white" />
          )}
        </MotionBox>
        <Text color="blue.300">
          {status === 'enrolled' ? '在籍生の宇宙領域がありません' : '卒業生の宇宙領域がありません'}
        </Text>
      </MotionBox>
    );
  }

  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={8}>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onSelectFolder={onSelectFolder}
          onFileUpload={onFileUpload}
          uploadingFolder={uploadingFolder}
        />
      ))}
    </Grid>
  );
}

// Folder Card Component
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
    <MotionCard
      bg="slate.800"
      backdropFilter="blur(10px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="blue.500"
      borderOpacity={0.3}
      h={72}
      cursor="pointer"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        borderColor: "purple.400",
        borderOpacity: 0.5
      }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center">
          <Heading size="md" color="white" isTruncated flex={1} mr={2}>
            {folder.name}
          </Heading>
          <Badge
            colorScheme={folder.status === 'enrolled' ? 'green' : 'yellow'}
            display="flex"
            alignItems="center"
            gap={1}
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
          >
            {folder.status === 'enrolled' ? <Stars size="1rem" /> : <Sparkles size="1rem" />}
            {folder.status === 'enrolled' ? '在籍' : '卒業'}
          </Badge>
        </Flex>
      </CardHeader>
      
      <CardBody pt={0} onClick={() => onSelectFolder(folder.id)}>
        <VStack spacing={3}>
          <Text color="blue.300" fontSize="sm" display="flex" alignItems="center" gap={2}>
            <Sparkles size="1rem" />
            {folder.photoCount}枚の写真
          </Text>
          
          <Grid templateColumns="repeat(3, 1fr)" gap={2} w="full" h={24}>
            {folder.photos.slice(0, 3).map((photo) => (
              <MotionBox
                key={photo.id}
                position="relative"
                aspectRatio={1}
                bg="slate.700"
                borderRadius="lg"
                overflow="hidden"
                border="1px solid"
                borderColor="blue.400"
                borderOpacity={0.3}
                whileHover={{ scale: 1.08 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image 
                  src={photo.url} 
                  alt={`${folder.name}の写真`} 
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 33vw, (max-width: 1200px) 16vw, 10vw"
                  unoptimized
                />
              </MotionBox>
            ))}
            {folder.photoCount === 0 && (
              <GridItem colSpan={3} h={24}>
                <Center h="full" bg="slate.700" borderRadius="lg" border="2px dashed" borderColor="blue.400" borderOpacity={0.3}>
                  <VStack>
                    <Camera size="1.5rem" color="rgba(59, 130, 246, 0.7)" />
                    <Text color="blue.300" fontSize="xs" fontWeight="medium">写真がありません</Text>
                  </VStack>
                </Center>
              </GridItem>
            )}
          </Grid>
        </VStack>
      </CardBody>
      
      <Flex justify="center" px={4} pb={2}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onFileUpload(folder.id, e)}
          style={{ display: 'none' }}
          disabled={uploadingFolder === folder.id}
        />
        <MotionButton
          size="sm"
          bg={uploadingFolder === folder.id ? "slate.600" : "linear(to-r, blue.600, purple.600)"}
          color="white"
          isDisabled={uploadingFolder === folder.id}
          leftIcon={
            uploadingFolder === folder.id ? (
              <Spinner size="sm" />
            ) : (
              <Upload size="1rem" />
            )
          }
          onClick={(e) => {
            e.stopPropagation();
            if (uploadingFolder !== folder.id) {
              triggerFolderFileUpload(folder.id);
            }
          }}
          whileHover={uploadingFolder !== folder.id ? { scale: 1.02 } : {}}
          whileTap={uploadingFolder !== folder.id ? { scale: 0.98 } : {}}
        >
          {uploadingFolder === folder.id ? (
            <Text display={{ base: "block", sm: "none" }}>転送中</Text>
          ) : (
            <>
              <Text display={{ base: "none", sm: "block" }}>写真をアップロード</Text>
              <Text display={{ base: "block", sm: "none" }}>アップロード</Text>
            </>
          )}
        </MotionButton>
      </Flex>
    </MotionCard>
  );
}

// Folder Detail View Component  
function FolderDetailView({
  selectedFolderData,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  likedPhotos,
  onLikePhoto,
  onBack,
  onFileUpload,
  uploadingFolder,
  triggerFileUpload
}: {
  selectedFolderData: CatFolder | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  likedPhotos: Set<string>;
  onLikePhoto: (photoId: string) => void;
  onBack: () => void;
  onFileUpload: (folderId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingFolder: string | null;
  triggerFileUpload: (folderId: string) => void;
}) {
  if (!selectedFolderData) return null;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPhotos = selectedFolderData.photos.slice(startIndex, endIndex);
  const totalPages = Math.ceil(selectedFolderData.photos.length / itemsPerPage);

  return (
    <MotionVStack
      spacing={8}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box alignSelf="flex-start">
        <MotionButton
          onClick={onBack}
          leftIcon={<ArrowLeft />}
          bg="linear(to-r, blue.600, purple.600)"
          color="white"
          border="1px solid"
          borderColor="blue.400"
          borderOpacity={0.3}
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Text display={{ base: "none", sm: "block" }}>宇宙ステーションに戻る</Text>
          <Text display={{ base: "block", sm: "none" }}>戻る</Text>
        </MotionButton>
      </Box>

      <MotionVStack
        spacing={4}
        textAlign="center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <Heading
          size="2xl"
          bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
          bgClip="text"
        >
          {selectedFolderData.status === 'graduated' 
            ? `${selectedFolderData.name}の惑星探索` 
            : `${selectedFolderData.name}の宇宙航海`
          }
        </Heading>
        <Text color="blue.300" fontSize="md" display="flex" alignItems="center" gap={2}>
          <Sparkles />
          {selectedFolderData.photos.length}枚の写真
        </Text>
      </MotionVStack>

      {selectedFolderData.photos.length === 0 ? (
        <MotionBox
          textAlign="center"
          py={16}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <MotionBox
            w={24} h={24}
            bg="linear(to-br, blue.500, purple.500)"
            borderRadius="2xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
            mb={6}
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Camera size="3rem" color="white" />
          </MotionBox>
          <VStack spacing={4}>
            <Heading size="xl" color="white">宇宙船には誰もいないぞ！</Heading>
            <Text color="blue.300" maxW="md" mx="auto">
              この宇宙領域にはまだねこ様の写真が存在しません。最初の写真をアップロードして探査を開始しましょう！
            </Text>
            <MotionButton
              size="lg"
              bg={uploadingFolder === selectedFolderData.id ? "slate.600" : "linear(to-r, blue.600, purple.600)"}
              color="white"
              isDisabled={uploadingFolder === selectedFolderData.id}
              leftIcon={
                uploadingFolder === selectedFolderData.id ? (
                  <Spinner />
                ) : (
                  <Rocket />
                )
              }
              onClick={() => {
                if (uploadingFolder !== selectedFolderData.id) {
                  triggerFileUpload(selectedFolderData.id);
                }
              }}
              whileHover={uploadingFolder !== selectedFolderData.id ? { scale: 1.05 } : {}}
              whileTap={uploadingFolder !== selectedFolderData.id ? { scale: 0.95 } : {}}
            >
              {uploadingFolder === selectedFolderData.id ? '宇宙転送中...' : '写真をアップロード'}
            </MotionButton>
          </VStack>
        </MotionBox>
      ) : (
        <>
          {totalPages > 1 && (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <HStack justify="center" spacing={2}>
                <MotionButton
                  onClick={() => {
                    setCurrentPage(Math.max(1, currentPage - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  isDisabled={currentPage === 1}
                  size="sm"
                  whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                  whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
                >
                  前へ
                </MotionButton>
                
                <HStack spacing={1}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <MotionButton
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      size="sm"
                      bg={currentPage === pageNum ? "linear(to-r, blue.600, purple.600)" : "slate.600"}
                      color="white"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {pageNum}
                    </MotionButton>
                  ))}
                </HStack>
                
                <MotionButton
                  onClick={() => {
                    setCurrentPage(Math.min(totalPages, currentPage + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  isDisabled={currentPage === totalPages}
                  size="sm"
                  whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
                  whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
                >
                  次へ
                </MotionButton>
              </HStack>
            </MotionBox>
          )}

          <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(4, 1fr)", xl: "repeat(5, 1fr)" }} gap={{ base: 4, sm: 5, lg: 6 }}>
            {currentPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isLiked={likedPhotos.has(photo.id)}
                onLike={() => onLikePhoto(photo.id)}
              />
            ))}
          </Grid>

          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <MotionButton
              size="lg"
              bg={uploadingFolder === selectedFolderData.id ? "slate.600" : "linear(to-r, blue.600, purple.600)"}
              color="white"
              isDisabled={uploadingFolder === selectedFolderData.id}
              leftIcon={
                uploadingFolder === selectedFolderData.id ? (
                  <Spinner />
                ) : (
                  <Upload />
                )
              }
              onClick={() => {
                if (uploadingFolder !== selectedFolderData.id) {
                  triggerFileUpload(selectedFolderData.id);
                }
              }}
              whileHover={uploadingFolder !== selectedFolderData.id ? { scale: 1.05 } : {}}
              whileTap={uploadingFolder !== selectedFolderData.id ? { scale: 0.95 } : {}}
            >
              {uploadingFolder === selectedFolderData.id ? '転送中...' : '追加アップロード'}
            </MotionButton>
          </MotionBox>
        </>
      )}
    </MotionVStack>
  );
}

// Photo Card Component
function PhotoCard({
  photo,
  isLiked,
  onLike
}: {
  photo: CatPhoto;
  isLiked: boolean;
  onLike: () => void;
}) {
  return (
    <MotionCard
      bg="slate.800"
      backdropFilter="blur(10px)"
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor="blue.500"
      borderOpacity={0.3}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ 
        y: -5, 
        scale: 1.02,
        borderColor: "purple.400",
        borderOpacity: 0.5
      }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Box position="relative" aspectRatio={1} overflow="hidden">
        <Image 
          src={photo.url} 
          alt={photo.originalName} 
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          unoptimized
        />
        <MotionBox
          position="absolute"
          inset={0}
          bg="blue.400"
          opacity={0}
          _groupHover={{ opacity: 0.1 }}
          transition="opacity 0.2s"
        />
      </Box>
      
      <CardBody p={3} bg="slate.800" backdropFilter="blur(10px)">
        <Flex justify="space-between" align="center" fontSize="xs">
          <Text color="blue.300" isTruncated display="flex" alignItems="center" gap={1}>
            📅 {new Date(photo.uploadedAt).toLocaleDateString('ja-JP')}
          </Text>
          <HStack spacing={1}>
            <MotionButton
              size="xs"
              bg="slate.700"
              color={isLiked ? "red.500" : "gray.400"}
              _hover={{ bg: "slate.600", color: isLiked ? "red.400" : "red.300" }}
              onClick={onLike}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Heart size="0.75rem" fill={isLiked ? "currentColor" : "none"} />
              <Text fontSize="2xs" fontWeight="medium">{photo.likes || 0}</Text>
            </MotionButton>
            <MotionButton
              as="a"
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              bg="slate.700"
              color="blue.400"
              _hover={{ bg: "slate.600", color: "blue.300" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ExternalLink size="0.75rem" />
            </MotionButton>
          </HStack>
        </Flex>
      </CardBody>
    </MotionCard>
  );
}