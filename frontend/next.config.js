/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10101/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:10101',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:10101/api/:path*',
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
