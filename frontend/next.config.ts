const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  output: "standalone",
};

export default nextConfig;
