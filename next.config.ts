import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    'seyedcaffe.abzarmohamadi.localhost',
    'seyedcaffe.abzarmohamadi.localhost:3000',
    '*.localhost',
    '*.localhost:3000',
    '*.abzarmohamadi.localhost',
    '*.abzarmohamadi.localhost:3000',
    '*.localho.st',
    '*.localho.st:3000',
    '*.lvh.me',
    '*.lvh.me:3000'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
