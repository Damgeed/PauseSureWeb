import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static brand assets are bundled with the worker. Bypassing the runtime
  // optimizer prevents broken /_next/image responses on the production edge.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
