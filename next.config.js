/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // External packages for server components (moved from experimental in Next.js 15)
  serverExternalPackages: ['@upstash/redis'],

  // Fix for dev server race condition with manifest files in Next.js 15
  // See: https://github.com/vercel/next.js/issues/63318
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable filesystem caching in development to prevent race conditions
      config.cache = {
        type: 'memory',
      }
    }
    return config
  },
}

module.exports = nextConfig
