import type { NextConfig } from "next";
import { APP_CONFIG } from './src/lib/config';

const nextConfig: NextConfig = {
  env: {
    APP_NAME: APP_CONFIG.APP_NAME,
    APP_VERSION: APP_CONFIG.APP_VERSION,
  },
  
  // Otimizações de Performance
  compress: true, // Habilitar compressão gzip
  
  // Otimização de imagens
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dias
  },
  
  // Otimização de bundle
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons', '@heroicons/react'],
  },
  
  // Headers de cache para assets estáticos
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Otimização de webpack
  webpack: (config, { dev, isServer }) => {
    // Otimizações apenas para produção
    if (!dev && !isServer) {
      // Habilitar tree shaking mais agressivo
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
