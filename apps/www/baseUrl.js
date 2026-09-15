const baseURL =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8801"
    : `https://${
        process.env.VERCEL_ENV === "production"
          ? process.env.VERCEL_PROJECT_PRODUCTION_URL
          : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
      }`;

module.exports = { baseURL };
