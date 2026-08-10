/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Keep Prisma out of the webpack bundle: @prisma/client loads a native query
  // engine at runtime and should be required from node_modules, not bundled.
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
};
export default nextConfig;
