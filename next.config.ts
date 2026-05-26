import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite hot reload desde el celu en la misma red local
  allowedDevOrigins: ['192.168.0.241'],
};

export default nextConfig;
