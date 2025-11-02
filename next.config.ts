import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Point frontend requests to Laravel's API prefix
    // Set via environment variable: NEXT_PUBLIC_API_URL
    // Local: http://127.0.0.1:8000/api
    // Production: https://your-api-domain.com/api
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  },
  // Remove console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn for production debugging
    } : false,
  },
  // Disable Turbopack untuk sementara karena ada issue dengan react-leaflet
  // Untuk production, bisa enable kembali setelah fix
  // webpack: (config) => config,
};

export default nextConfig;
