import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const nextConfig: NextConfig = {
  basePath: isProd ? "/n-ups" : "",
  assetPrefix: isProd ? "/n-ups/" : "",
  sassOptions: {
    implementation: "sass-embedded",
  },
};

export default nextConfig;
