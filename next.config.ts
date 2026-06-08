import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    ignoreIssue: [
      // spawn() arguments in the Scout run route are runtime paths,
      // not modules — suppress Turbopack's false-positive resolve error.
      {
        path: '**/api/scout/run/**',
        title: 'Module not found',
      },
    ],
  },
};

export default nextConfig;
