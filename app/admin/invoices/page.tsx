export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import InvoicesView, { type InvoiceRow } from './components/InvoicesView';

export default async function InvoicesPage() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: outstanding }, { data: recent }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id,created_at,project_id,amount,type,stripe_payment_url,status,due_date,projects(title,clients(name))')
      .eq('status', 'unpaid')
      .order('created_at', { ascending: true }),
    supabase
      .from('invoices')
      .select('id,created_at,project_id,amount,type,stripe_payment_url,status,due_date,projects(title,clients(name))')
      .eq('status', 'paid')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Invoices</span>
      </div>
      <div className="admin-content">
        <InvoicesView
          outstanding={(outstanding ?? []) as unknown as InvoiceRow[]}
          recent={(recent ?? []) as unknown as InvoiceRow[]}
        />
      </div>
    </>
  );
}
