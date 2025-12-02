import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    devIndicators: false,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "media.licdn.com",
            },
            {
                protocol: "https",
                hostname: "loremflickr.com",
                port: "",
                pathname: "/**",
            },
        ],
    },
};

export default nextConfig;
