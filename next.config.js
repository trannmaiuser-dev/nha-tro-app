const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // face-api.js / tensorflow use Node-only modules — stub them for browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false, fs: false, path: false, crypto: false,
      }
      // Suppress optional 'encoding' require inside tensorflow's node-fetch (server-only)
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource, context) {
            return resource === 'encoding' && /node-fetch/.test(context)
          },
        })
      )
    }
    return config
  },
}

module.exports = nextConfig
