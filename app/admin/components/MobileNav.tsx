'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Dashboard', href: '/admin', icon: '⊞' },
  { label: 'Clients', href: '/admin/clients', icon: '👤' },
  { label: 'Projects', href: '/admin/projects', icon: '📁' },
  { label: 'Settings', href: '/admin/settings/contract', icon: '⚙️' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-mobile-nav">
      {tabs.map((tab) => {
        const active = tab.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`admin-mobile-tab${active ? ' active' : ''}`}
          >
            <span className="admin-mobile-tab-icon">{tab.icon}</span>
            <span className="admin-mobile-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
