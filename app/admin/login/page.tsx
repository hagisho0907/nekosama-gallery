'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Input,
  Button,
  Flex,
  IconButton,
  InputGroup,
  InputRightElement,
  FormControl,
  FormLabel,
  Link,
} from '@chakra-ui/react';
import { Rocket, Shield, ArrowLeft, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionButton = motion(Button);

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to admin page
    if (isAuthenticated()) {
      router.push('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, cookies:', document.cookie);
        // Force page refresh after login to ensure cookies are recognized
        window.location.href = '/admin';
      } else {
        console.log('Login failed:', data);
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, slate.900, purple.900, slate.900)"
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {/* Space stars background */}
      <Box position="absolute" inset={0} overflow="hidden">
        <Box className="stars" />
        <Box className="twinkling" />
      </Box>

      <Container maxW="md" p={4} position="relative" zIndex={10}>
        <MotionBox
          bg="rgba(30, 41, 59, 0.6)"
          backdropFilter="blur(12px)"
          borderRadius="xl"
          boxShadow="2xl"
          p={8}
          w="full"
          border="1px solid"
          borderColor="rgba(59, 130, 246, 0.3)"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <MotionVStack
            spacing={8}
            textAlign="center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Header */}
            <VStack spacing={4}>
              <MotionBox
                w={16}
                h={16}
                bgGradient="linear(to-br, blue.600, purple.600)"
                borderRadius="xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="lg"
                border="1px solid"
                borderColor="rgba(59, 130, 246, 0.3)"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <Shield size="2rem" color="white" />
              </MotionBox>
              <VStack spacing={2}>
                <Heading
                  size="xl"
                  bgGradient="linear(to-r, blue.400, purple.400, cyan.400)"
                  bgClip="text"
                  color="transparent"
                >
                  宇宙船管理センター
                </Heading>
                <Text color="blue.300" fontSize="sm">
                  管理者認証が必要です
                </Text>
              </VStack>
            </VStack>

            {/* Error Alert */}
            {error && (
              <MotionBox
                w="full"
                bg="rgba(127, 29, 29, 0.3)"
                backdropFilter="blur(10px)"
                border="1px solid rgba(248, 113, 113, 0.5)"
                color="rgba(252, 165, 165, 1)"
                borderRadius="lg"
                p={4}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
              >
                <Flex align="center" gap={2}>
                  <AlertTriangle size="1rem" />
                  <Text fontSize="sm">{error}</Text>
                </Flex>
              </MotionBox>
            )}

            {/* Form */}
            <MotionBox
              as="form"
              onSubmit={handleLogin}
              w="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <VStack spacing={6}>
                <FormControl>
                  <FormLabel color="blue.300" fontSize="sm" fontWeight="medium">
                    アクセスコード
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="セキュリティコードを入力..."
                      bg="rgba(71, 85, 105, 0.5)"
                      border="1px solid"
                      borderColor="rgba(59, 130, 246, 0.3)"
                      color="rgba(255, 255, 255, 0.9)"
                      _placeholder={{ color: "rgba(147, 197, 253, 0.5)" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)"
                      }}
                      isDisabled={loading}
                      required
                      size="lg"
                    />
                    <InputRightElement h="full">
                      <IconButton
                        aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                        icon={showPassword ? <EyeOff size="1.25rem" /> : <Eye size="1.25rem" />}
                        onClick={() => setShowPassword(!showPassword)}
                        size="sm"
                        variant="ghost"
                        color="rgba(147, 197, 253, 0.7)"
                        _hover={{ color: "blue.300" }}
                        isDisabled={loading}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <MotionButton
                  type="submit"
                  w="full"
                  size="lg"
                  bg={loading || !password.trim() ? "rgba(71, 85, 105, 1)" : "linear-gradient(to right, #2563eb, #7c3aed)"}
                  color={loading || !password.trim() ? "rgba(148, 163, 184, 1)" : "white"}
                  isDisabled={loading || !password.trim()}
                  whileHover={loading || !password.trim() ? {} : { scale: 1.02 }}
                  whileTap={loading || !password.trim() ? {} : { scale: 0.98 }}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  {loading ? (
                    <>
                      <Box
                        w={4}
                        h={4}
                        border="2px solid"
                        borderColor="blue.300"
                        borderTopColor="transparent"
                        borderRadius="full"
                        css={{
                          animation: 'spin 1s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          },
                        }}
                      />
                      認証中...
                    </>
                  ) : (
                    <>
                      <Rocket size="1rem" />
                      管理センターにアクセス
                    </>
                  )}
                </MotionButton>
              </VStack>
            </MotionBox>

            {/* Back Link */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <Link href="/" style={{ textDecoration: 'none' }}>
                <MotionBox
                  color="blue.400"
                  _hover={{ color: "blue.300" }}
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2}
                  css={{ transition: "color 0.2s" }}
                  whileHover={{ x: -5 }}
                >
                  <ArrowLeft size="1rem" />
                  宇宙船に戻る
                </MotionBox>
              </Link>
            </MotionBox>
          </MotionVStack>
        </MotionBox>
      </Container>
    </Box>
  );
}