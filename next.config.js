/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@libsql/client', 'pdfjs-dist'] },
}
module.exports = nextConfig
