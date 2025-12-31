/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip output file tracing to avoid race condition in build
  outputFileTracingExcludes: {
    '*': ['**/*'],
  },
}

module.exports = nextConfig
