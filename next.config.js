/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable output file tracing to work around Next.js 15 build issues
  outputFileTracingExcludes: {
    '*': ['**/*'],
  },
}

module.exports = nextConfig
