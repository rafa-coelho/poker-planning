import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { optimizeCss: true },
}

export default nextConfig


