import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import Sidebar from '@/app/admin/components/Sidebar';
import MobileNav from '@/app/admin/components/MobileNav';
import PushSubscribe from '@/app/admin/components/PushSubscribe';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">{children}</main>
      <MobileNav />
      <PushSubscribe />
      <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="lazyOnload" />
    </div>
  );
}
