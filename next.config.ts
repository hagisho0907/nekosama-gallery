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
        hostname: 'pub-3d4bbef223274292bcf071320a564028.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // R2画像の最適化を無効化
  },
};

export default nextConfig;
