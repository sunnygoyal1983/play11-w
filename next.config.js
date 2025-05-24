/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: [
      'via.placeholder.com',
      'res.cloudinary.com',
      'api.cricapi.com',
      'cdn.sportmonks.com',
    ],
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
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === 'development',
  },

  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.optimization.minimize = true;
    }

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
