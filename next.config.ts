import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone",
  compress: true, // Gzip compression
  poweredByHeader: false, // Security/Size
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'], // Modern formats
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Matches all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // CHANGE THIS if using standard browser, but for native app we need robust handling or specific logic. 
          // However, 'Allow-Credentials: true' + 'Allow-Origin: *' is disallowed by spec. 
          // We need to either reflect origin or strict origin.
          // Since app origin varies, we might rely on the fact it's not a browser enforcing it the same way? 
          // NO, Axios in RN effectively behaves like a browser regarding network stack sometimes, but mostly the SERVER rejects it if it doesn't like it.
          // Actually, 'Network Error' often means the Preflight OPTIONS failed.
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Cookie" },
        ]
      }
    ]
  }
};

export default nextConfig;
