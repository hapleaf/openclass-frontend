import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/teachers", destination: "/speakers", permanent: true },
    ];
  },
};

export default nextConfig;
