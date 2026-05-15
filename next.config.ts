/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  staticPageGenerationTimeout: 120,
  
  // Redirections pour les anciennes URLs (après fusions)
  async redirects() {
    return [
      // Agenda (Calendar + Tasks)
      { source: '/tasks', destination: '/agenda', permanent: true },
      { source: '/calendar', destination: '/agenda', permanent: true },
      { source: '/tasks/new', destination: '/agenda', permanent: true },
      
      // Money & Opportunities
      { source: '/money', destination: '/money-opportunities', permanent: true },
      { source: '/opportunities', destination: '/money-opportunities', permanent: true },
      
      // Content Studio
      { source: '/content', destination: '/content-studio', permanent: true },
      { source: '/content-calendar', destination: '/content-studio', permanent: true },
      
      // Vision & Stratégie (Life Map + Weekly CEO)
      { source: '/life-map', destination: '/vision-strategy', permanent: true },
      { source: '/weekly-ceo', destination: '/vision-strategy', permanent: true },
      
      // Family (avec Motherhood)
      { source: '/motherhood', destination: '/family', permanent: true },
      
      // Missions & Business
      { source: '/missions', destination: '/missions-business', permanent: true },
      { source: '/business', destination: '/missions-business', permanent: true },
      
      // Communications (Documents + Email)
      { source: '/documents', destination: '/communications', permanent: true },
      { source: '/email', destination: '/communications', permanent: true },
      
      // Rescue & Wins
      { source: '/rescue', destination: '/rescue-wins', permanent: true },
      { source: '/wins', destination: '/rescue-wins', permanent: true },
    ];
  },
};

export default nextConfig;
