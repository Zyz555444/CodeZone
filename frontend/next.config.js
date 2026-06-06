/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['3000-59975477b751a376.monkeycode-ai.online'],
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL,
    WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  reactStrictMode: true,
};

export default nextConfig;
