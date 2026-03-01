import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure we are not using the problematic Turbopack for builds in this environment
  experimental: {
    workerThreads: false,
    cpus: 1
  }
};

export default nextConfig;
