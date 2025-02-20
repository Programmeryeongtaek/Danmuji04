import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'hcqusfewtyxmpdvzpeor.supabase.co',
      port: '',
      pathname: '/storage/v1/object/public/avatars/**',
    },
    {
      protocol: 'https',
      hostname: 'hcqusfewtyxmpdvzpeor.supabase.co',
      port: '',
      pathname: '/storage/v1/object/public/videos/**',
    },
    {
      protocol: 'https',
      hostname: 'picsum.photos',
      port: '',
      pathname: '/**',
    },
  ]
  }
};

export default nextConfig;