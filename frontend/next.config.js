/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '/socket.io',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:10101/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://backend:10101/socket.io/:path*',
      },
      {
        source: '/terminal',
        destination: 'http://backend:10101/terminal',
      },
      {
        source: '/ws/:path*',
        destination: 'http://backend:10101/ws/:path*',
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
