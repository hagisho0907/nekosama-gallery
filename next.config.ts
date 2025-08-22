import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages configuration with static export + functions
  // Disable static export in development to enable API routes
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: {
    unoptimized: true, // Required for Cloudflare Pages
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
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app", "*.pages.dev"],
    },
  },
};

export default nextConfig;
