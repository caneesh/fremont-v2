/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Reduce build parallelism to avoid race conditions in Vercel
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
}

module.exports = nextConfig
