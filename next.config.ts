import type { NextConfig } from "next";

// Ensure the nvm-managed node binary is on PATH so that Turbopack can
// spawn its PostCSS / Tailwind CSS v4 worker subprocess without failing.
const nvmBin = "/Users/nihalkhan/.nvm/versions/node/v24.14.0/bin";
if (process.env.PATH && !process.env.PATH.includes(nvmBin)) {
  process.env.PATH = `${nvmBin}:${process.env.PATH}`;
} else if (!process.env.PATH) {
  process.env.PATH = nvmBin;
}

const nextConfig: NextConfig = {};

export default nextConfig;
