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
      hostname: 'hcqusfewtyxmpdvzpeor.supabase.co',
      port: '',
      pathname: '/storage/v1/object/public/books/**',
    },
    {
      protocol: 'https',
      hostname: 'hcqusfewtyxmpdvzpeor.supabase.co',
      port: '',
      pathname: '/storage/v1/object/public/community/**',
    },
    {
      protocol: 'https',
      hostname: 'picsum.photos',
      port: '',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'image.aladin.co.kr',
      port: '',
      pathname: '/**',
    }
  ]
  }, domains: ['images.unsplash.com'],
};

export default nextConfig;