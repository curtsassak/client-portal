/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ["mammoth", "unpdf", "html-to-docx"] },
};
export default nextConfig;
