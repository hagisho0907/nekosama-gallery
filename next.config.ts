import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '6cd645a137d7c4b4b83226e2bbb973e3.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // R2画像の最適化を無効化
  },
};

export default nextConfig;
