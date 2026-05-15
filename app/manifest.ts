import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '3rd Davids Technology Admin',
    short_name: '3DT Admin',
    description: 'Admin dashboard for 3rd Davids Technology',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#0F1117',
    theme_color: '#1A5C38',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
