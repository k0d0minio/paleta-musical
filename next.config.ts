import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Off: on Vercel the restored Turbopack build cache gave the Tailwind
    // loader the old globals.css (no tokens, no note colours) while it scanned
    // the new sources. A full build takes about 20 s, so the cache saves little.
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    // F006 is ticket 2; the app opens on the Paleta module.
    return [{ source: "/", destination: "/palette", permanent: false }];
  },
};

export default nextConfig;
