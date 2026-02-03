import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization for Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bgtgxtnduftnxmzyzojt.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // Modern formats for better compression
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs in production
    } : false,
  },

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression

  // React optimizations
  reactStrictMode: true,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr'],
  },
};

export default nextConfig;
