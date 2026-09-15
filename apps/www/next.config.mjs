import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX({
  outDir: "src/.source",
});

/** @type {import('next').NextConfig} */
const config = {
  // @aws-lite/client uses dynamic import(path) at runtime which Turbopack cannot statically analyze
  serverExternalPackages: ["@aws-lite/client", "@aws-lite/s3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "seo-heist.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ansubkhan.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default withMDX(config);
