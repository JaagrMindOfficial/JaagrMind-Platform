import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/internal-ops",
        destination: "/internal-ops/signin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
