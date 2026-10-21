import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/resumes/*/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
