'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PortalNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/portal/${token}`;

  const tabs = [
    { label: 'Home', href: base },
    { label: 'Intake', href: `${base}/intake` },
    { label: 'Contract', href: `${base}/contract` },
    { label: 'Invoice', href: `${base}/invoice` },
  ];

  return (
    <nav className="portal-nav">
      <div className="portal-nav-inner">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`portal-nav-tab${pathname === tab.href ? ' active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
