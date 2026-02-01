/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    // In production, leave empty to use Vercel rewrites proxy
    // In development, set NEXT_PUBLIC_API_URL=http://localhost:3000 in .env.local
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
}

module.exports = nextConfig
