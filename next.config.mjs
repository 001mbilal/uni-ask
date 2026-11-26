/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native module, must not be bundled
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
