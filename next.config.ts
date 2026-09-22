import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Catalog imagery comes from the dummyjson product API — see D14.
    // Configured at M1 so M2 never builds against placeholders.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
        pathname: "/product-images/**",
      },
    ],
  },
};

export default nextConfig;
