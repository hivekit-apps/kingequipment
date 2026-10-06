/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    // Allow Supabase Storage public URLs for admin-uploaded equipment photos
    // (cycle 9). Any <Image> src must match one of these patterns.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gcnuflfxckmmnscgptpb.supabase.co',
        pathname: '/storage/v1/object/public/equipment-photos/**',
      },
    ],
  },
};

export default nextConfig;
