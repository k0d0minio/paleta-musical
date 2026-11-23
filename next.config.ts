import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
