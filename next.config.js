/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'via.placeholder.com',
      'res.cloudinary.com',
      'api.cricapi.com',
      'cdn.sportmonks.com',
    ],
    // Allow loading local images without domain restrictions
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: process.env.VERCEL_URL || 'example.com',
      },
    ],
    // Disable the need for remote patterns for local files in /public directory
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Disable telemetry
  telemetry: { enabled: false },
  // Completely disable tracing to avoid the file permission errors
  experimental: {
    outputStandalone: true,
    disableTracing: true,
    // Enable server actions (required for 'use server' directive)
    serverActions: true,
    // Memory optimization
    memoryBasedWorkersCount: true,
    // CSS optimization with critters package
    optimizeCss: {
      inlineThreshold: 5000,
      polyfill: false,
    },
    // Ensure tracing is completely disabled
    trace: false,
  },
  // Webpack configuration to optimize memory usage
  webpack: (config, { dev, isServer }) => {
    // Optimize only in production
    if (!dev) {
      config.optimization.minimize = true;
    }

    // Reduce memory usage for development
    if (dev) {
      config.optimization.runtimeChunk = false;
      config.optimization.splitChunks = {
        cacheGroups: {
          default: false,
        },
      };
    }

    return config;
  },
  // Add headers to resolve router state parsing issues
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          {
            key: 'x-middleware-cache',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
