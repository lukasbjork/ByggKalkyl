/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs och @react-pdf/renderer ska köras på serversidan i API-routes.
  experimental: {
    serverComponentsExternalPackages: ["exceljs", "@react-pdf/renderer"],
  },
};

export default nextConfig;
