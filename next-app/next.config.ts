import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ui/components", "@schemas"],
};

export default nextConfig;
