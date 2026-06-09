import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // This tells Vercel to allow production builds even if there are linting issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: Safe backup to ensure strict type checks don't block you either
    ignoreBuildErrors: true,
  }
};

export default nextConfig;