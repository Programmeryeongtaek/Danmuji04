import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  images: {
    domains: ['hcqusfewtyxmpdvzpeor.supabase.co']
  }
};

export default nextConfig;