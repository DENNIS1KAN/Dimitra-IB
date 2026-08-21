import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (embedded dev database) loads its WASM from node_modules at
  // runtime; bundling it breaks that resolution.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
