import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Nothing imports data/exercises.csv — the seed route reads it from disk — so
   * Next's dependency tracing wouldn't otherwise ship it into the serverless
   * function, and seeding would fail with ENOENT in production.
   */
  outputFileTracingIncludes: {
    "/api/admin/seed-exercises": ["./data/exercises.csv"],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // Exercise photos from free-exercise-db (see scripts/build-exercise-csv.ts).
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "192.168.1.12" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "www.facebook.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "**.vercel.app" },
    ],
  },
};

export default nextConfig;
