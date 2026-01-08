/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // External packages for server components (moved from experimental in Next.js 15)
  serverExternalPackages: ['@upstash/redis'],
}

module.exports = nextConfig
