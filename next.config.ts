import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@ajentify/chat', '@ajentify/voice'],
};

export default nextConfig;
