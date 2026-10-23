import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Banners servidos pelo Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  experimental: {
    // Banner de até 4 MB enviado pelo formulário do evento (o padrão é 1 MB).
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;
