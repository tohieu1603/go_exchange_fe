import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output produces a self-contained `.next/standalone` server
  // bundle so the runtime image only needs node + the bundle (no full
  // node_modules copy). Required by the multi-stage Dockerfile.
  output: 'standalone',
};

export default nextConfig;
