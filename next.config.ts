import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true, // Gzip compression
  poweredByHeader: false, // Security/Size
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'], // Modern formats
  },
};

export default nextConfig;
