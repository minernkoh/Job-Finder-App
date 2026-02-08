import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ui/components", "@schemas"],
  devIndicators: false,
};

export default nextConfig;
