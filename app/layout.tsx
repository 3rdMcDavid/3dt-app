import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3DT App',
  description: '3rd Davids Technology — Client Management',
  // icons are handled by app/icon.png and app/apple-icon.png (Next.js file-based metadata)
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '3DT App',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
