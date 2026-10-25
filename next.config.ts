import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server.js + traced deps for the Docker image (see Dockerfile).
  // Use `npm run dev` locally; production runs `node server.js`, not `next start`.
  output: "standalone",
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ['192.168.0.6']
};

export default nextConfig;
