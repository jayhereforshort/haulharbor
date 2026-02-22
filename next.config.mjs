/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fixes "__webpack_require__.n is not a function" with lucide-react and other barrel imports
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
