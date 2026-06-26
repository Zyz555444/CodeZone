/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  experimental: {
    turbo: !process.env.CI,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '/socket.io',
  },
  allowedHosts: ['.monkeycode-ai.online'],
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
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
