import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "docx"],
  transpilePackages: ["@ui/components", "@schemas"],
  devIndicators: false,
};

export default nextConfig;
