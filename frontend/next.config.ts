import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The frontend is exported as static files and served by the FastAPI
  // backend. trailingSlash makes the export emit nda/index.html (a
  // directory), which the backend's StaticFiles(html=True) mount resolves.
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
