/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable experimental features that may cause build issues
  experimental: {
    // Ensure middleware is handled correctly
    serverComponentsExternalPackages: ['@upstash/redis'],
  },
}

module.exports = nextConfig
