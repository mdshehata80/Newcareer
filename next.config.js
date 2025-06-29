<<<<<<<< HEAD:next.config.js
========
// This file is deprecated. Please use next.config.js instead.
// Keeping it to avoid breaking changes, but it is not used by Next.js.

>>>>>>>> 84be54b3 (The NextJS app server is having trouble starting. Please identify what c):next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
