'use client';

import { useState } from 'react';
import InvoiceDetailSheet from './InvoiceDetailSheet';

export type InvoiceRow = {
  id: string;
  created_at: string;
  project_id: string;
  amount: number;
  type: 'deposit' | 'final' | 'addon';
  stripe_payment_url: string | null;
  status: 'unpaid' | 'paid';
  due_date: string | null;
  projects: {
    title: string;
    clients: { name: string } | null;
  } | null;
};

type Props = {
  outstanding: InvoiceRow[];
  recent: InvoiceRow[];
};

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  final: 'Final',
  addon: 'Add-on',
};

function fmtAmount(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(inv: InvoiceRow) {
  return inv.status === 'unpaid' && !!inv.due_date && new Date(inv.due_date) < new Date();
}

function StatusBadge({ invoice }: { invoice: InvoiceRow }) {
  if (invoice.status === 'paid') {
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
        border: '1px solid rgba(34,197,94,0.25)', flexShrink: 0,
      }}>Paid</span>
    );
  }
  if (isOverdue(invoice)) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(239,68,68,0.12)', color: 'var(--red)',
        border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0,
      }}>Overdue</span>
    );
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
      background: 'rgba(240,165,0,0.12)', color: 'var(--orange)',
      border: '1px solid rgba(240,165,0,0.25)', flexShrink: 0,
    }}>Unpaid</span>
  );
}

function InvoiceCard({ invoice, onTap }: { invoice: InvoiceRow; onTap: () => void }) {
  const clientName = invoice.projects?.clients?.name ?? '—';
  const invoiceNum = `INV-${invoice.id.slice(0, 6).toUpperCase()}`;

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '13px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{clientName}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: 'var(--border)', color: 'var(--muted)', flexShrink: 0,
          }}>
            {TYPE_LABEL[invoice.type] ?? invoice.type}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {invoiceNum} · {fmtDate(invoice.created_at)}
          {invoice.due_date && invoice.status === 'unpaid' && (
            <span style={{ color: isOverdue(invoice) ? 'var(--red)' : 'var(--muted)' }}>
              {' '}· Due {fmtDate(invoice.due_date)}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtAmount(invoice.amount)}</span>
        <StatusBadge invoice={invoice} />
      </div>
      <span style={{ color: 'var(--muted)', fontSize: 12, flexShrink: 0 }}>›</span>
    </button>
  );
}

function SectionHeader({ label, count, total }: { label: string; count: number; total?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)' }}>
          {label}
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, background: 'var(--accent)', color: '#fff',
            borderRadius: 10, padding: '1px 7px',
          }}>{count}</span>
        )}
      </div>
      {total != null && total > 0 && (
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {fmtAmount(total)}
        </span>
      )}
    </div>
  );
}

export default function InvoicesView({ outstanding, recent }: Props) {
  const [outstandingList, setOutstandingList] = useState(outstanding);
  const [recentList, setRecentList]           = useState(recent);
  const [selectedId, setSelectedId]           = useState<string | null>(null);

  const allInvoices = [...outstandingList, ...recentList];
  const selected = selectedId ? allInvoices.find(i => i.id === selectedId) ?? null : null;

  const outstandingTotal = outstandingList.reduce((s, i) => s + i.amount, 0);

  function handleMarkPaid(id: string) {
    const inv = outstandingList.find(i => i.id === id);
    if (inv) {
      setOutstandingList(prev => prev.filter(i => i.id !== id));
      setRecentList(prev => [{ ...inv, status: 'paid' as const }, ...prev]);
    }
  }

  function handleDueDateChange(id: string, date: string | null) {
    setOutstandingList(prev => prev.map(i => i.id === id ? { ...i, due_date: date } : i));
  }

  return (
    <>
      {/* Outstanding */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader label="Outstanding" count={outstandingList.length} total={outstandingTotal} />
        {outstandingList.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            No outstanding invoices.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {outstandingList.map(inv => (
              <InvoiceCard key={inv.id} invoice={inv} onTap={() => setSelectedId(inv.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Recent paid */}
      <div>
        <SectionHeader label="Recent (30 days)" count={recentList.length} />
        {recentList.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            No paid invoices in the last 30 days.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentList.map(inv => (
              <InvoiceCard key={inv.id} invoice={inv} onTap={() => setSelectedId(inv.id)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <InvoiceDetailSheet
          invoice={selected}
          onClose={() => setSelectedId(null)}
          onMarkPaid={handleMarkPaid}
          onDueDateChange={handleDueDateChange}
        />
      )}
    </>
  );
}
