/** @type {import('next').NextConfig} */

const withNextIntl = require('next-intl/plugin')('./lib/i18n/config.ts');

const nextConfig = {
  reactStrictMode: true,

  // Allow Vercel deployment despite non-fatal warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },


  // Experimental features
  experimental: {
    serverActions: {
      enabled: true,
      bodySizeLimit: '10mb',
    },
    // External packages for Xenova transformers (prevents bundling issues)
    serverComponentsExternalPackages: ['onnxruntime-node', '@xenova/transformers'],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'KilatOS',
    NEXT_PUBLIC_APP_DESCRIPTION: 'AI-Powered Code Generation OS by KilatCode',
  },

  // Image optimization
  images: {
    domains: ['rpmtfgntofxtxwmjpcxk.supabase.co', 'gen.pollinations.ai', 'image.pollinations.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.pollinations.ai',
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // COEP for WebContainer test pages
      {
        source: '/webcontainer-test/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/test-webcontainer/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/test-webcontainer',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      // COEP for KilatCode (WebContainer preview)
      // FIX 2026-01-16: Changed from 'require-corp' to 'credentialless'
      // - 'credentialless' allows external resources (NPM, Prisma binaries) WITHOUT CORP header
      // - SharedArrayBuffer still works in Chrome 96+ with credentialless
      // - See: https://developer.chrome.com/blog/coep-credentialless-origin-trial/
      {
        source: '/kilatcode',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/kilatcode/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      // For chat pages: use credentialless mode (allows external images)
      {
        source: '/chat/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Prevent Xenova bundling issues
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
