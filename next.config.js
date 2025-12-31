/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use standalone output mode for better compatibility
  output: 'standalone',
  // Increase build worker memory and reduce parallelism to avoid race conditions
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
}

module.exports = nextConfig
