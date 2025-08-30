import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages configuration
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
  // Optimize build for Cloudflare Pages file size limits
  webpack: (config, { dev }) => {
    if (!dev) {
      // Disable caching in production to reduce file sizes
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
