import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export",  // ← COMMENTE CETTE LIGNE pour l'instant
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
