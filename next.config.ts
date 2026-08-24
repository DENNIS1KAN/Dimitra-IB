import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production image (DEPLOY.md): trace the server and its dependencies into
  // .next/standalone so the runtime stage carries no npm install and no dev
  // toolchain, just node and the files this app actually reaches.
  output: "standalone",
  // Nothing in this app renders next/image (grep: zero imports), so sharp and
  // its 44 MB of platform binaries are dead weight in the runtime image. The
  // server only require()s sharp to optimize an image, which never happens
  // here. Delete both lines the day a page does use next/image.
  images: { unoptimized: true },
  outputFileTracingExcludes: { "*": ["node_modules/@img/**", "node_modules/sharp/**"] },
  // PGlite (embedded dev database) loads its WASM from node_modules at
  // runtime; bundling it breaks that resolution.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
