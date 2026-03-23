import type { NextConfig } from "next";

const bunnyCdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL;
const bunnyCdnHostname = bunnyCdnUrl
  ? new URL(bunnyCdnUrl).hostname
  : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/adapter-pg", "pg", "nodemailer"],
  images: {
    remotePatterns: [
      ...(bunnyCdnHostname
        ? [{ protocol: "https" as const, hostname: bunnyCdnHostname }]
        : []),
    ],
  },
};

export default nextConfig;
