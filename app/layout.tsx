import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3DT App',
  description: '3rd Davids Technology — Client Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
