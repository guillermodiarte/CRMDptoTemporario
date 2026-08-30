import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true, // Gzip compression
  poweredByHeader: false, // Security/Size
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 86400,
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/guia/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
