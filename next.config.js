/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'admin.grownmenonly.com',
          },
        ],
        destination: '/admin/login',
        permanent: false,
      },
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'admin.dev.grownmenonly.com',
          },
        ],
        destination: '/admin/login',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.PROJECT_ID}.supabase.co`,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
