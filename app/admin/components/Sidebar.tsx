'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/admin',                    label: 'Dashboard', icon: '⬛' },
  { href: '/admin/clients',            label: 'Clients',   icon: '👤' },
  { href: '/admin/projects',           label: 'Projects',  icon: '📁' },
  { href: '/admin/settings/contract',  label: 'Settings',  icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <em>3DT</em> App
        <span>Client Management</span>
      </div>

      <nav>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${
              item.href === '/admin'
                ? pathname === '/admin' ? ' active' : ''
                : pathname.startsWith(item.href) ? ' active' : ''
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="btn btn-ghost btn-sm btn-full" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
