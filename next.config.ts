/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // <--- AJOUTE CECI
  images: {
    unoptimized: true,
  },
  // Important pour éviter les timeouts sur Render
  staticPageGenerationTimeout: 120,
};

module.exports = nextConfig;
