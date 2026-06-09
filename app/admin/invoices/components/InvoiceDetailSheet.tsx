'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InvoiceRow } from './InvoicesView';

type Props = {
  invoice: InvoiceRow;
  onClose: () => void;
  onMarkPaid: (id: string) => void;
  onDueDateChange: (id: string, date: string | null) => void;
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

export default function InvoiceDetailSheet({ invoice, onClose, onMarkPaid, onDueDateChange }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [copied, setCopied]         = useState(false);
  const [errMsg, setErrMsg]         = useState<string | null>(null);
  const touchY = useRef(0);
  const supabase = createClient();

  const overdue = isOverdue(invoice);
  const invoiceNum = `INV-${invoice.id.slice(0, 6).toUpperCase()}`;
  const clientName = invoice.projects?.clients?.name ?? '—';
  const projectTitle = invoice.projects?.title ?? '—';

  async function handleMarkPaid() {
    if (!confirming) { setConfirming(true); return; }
    setSaving(true);
    setErrMsg(null);
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoice.id);
    if (error) {
      setErrMsg(error.message);
      setConfirming(false);
    } else {
      onMarkPaid(invoice.id);
      onClose();
    }
    setSaving(false);
  }

  async function handleDueDate(val: string) {
    const date = val || null;
    await supabase.from('invoices').update({ due_date: date }).eq('id', invoice.id);
    onDueDateChange(invoice.id, date);
  }

  async function handleCopy() {
    if (!invoice.stripe_payment_url) return;
    await navigator.clipboard.writeText(invoice.stripe_payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.5)' }} />
      <div
        onTouchStart={e => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 72) onClose(); }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 211,
          height: '92dvh',
          background: 'var(--surface)',
          borderRadius: '16px 16px 0 0',
          display: 'flex', flexDirection: 'column',
          animation: 'sheet-up 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '8px 20px 14px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{invoiceNum}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: 'var(--border)', color: 'var(--muted)',
              }}>
                {TYPE_LABEL[invoice.type] ?? invoice.type}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{clientName} · {projectTitle}</div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 22, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Amount */}
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {fmtAmount(invoice.amount)}
            </div>
            <div style={{ marginTop: 8 }}>
              {invoice.status === 'paid' ? (
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(34,197,94,0.15)', color: 'var(--green)',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>✓ Paid</span>
              ) : overdue ? (
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(239,68,68,0.12)', color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}>Overdue</span>
              ) : (
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(240,165,0,0.12)', color: 'var(--orange)',
                  border: '1px solid rgba(240,165,0,0.3)',
                }}>Unpaid</span>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Created</span>
              <span>{fmtDate(invoice.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Client</span>
              <span>{clientName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Project</span>
              <span style={{ maxWidth: '60%', textAlign: 'right' }}>{projectTitle}</span>
            </div>
          </div>

          {/* Due date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: 8 }}>
              Due Date
            </div>
            <input
              type="date"
              defaultValue={invoice.due_date ?? ''}
              style={{ fontSize: 13, width: '100%' }}
              onChange={e => handleDueDate(e.target.value)}
            />
          </div>

          {/* Payment link */}
          {invoice.stripe_payment_url && (
            <button type="button" className="btn btn-ghost btn-sm btn-full" onClick={handleCopy}>
              {copied ? '✓ Link Copied' : '🔗 Copy Payment Link'}
            </button>
          )}

          {/* Mark as paid */}
          {invoice.status === 'unpaid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {errMsg && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)',
                }}>
                  {errMsg}
                </div>
              )}
              <button
                type="button"
                className={`btn btn-full ${confirming ? 'btn-primary' : 'btn-ghost'}`}
                onClick={handleMarkPaid}
                disabled={saving}
                style={confirming ? {} : { color: 'var(--green)', borderColor: 'rgba(34,197,94,0.4)' }}
              >
                {saving ? 'Saving…' : confirming ? 'Tap again to confirm payment' : '✓ Mark as Paid'}
              </button>
              {confirming && (
                <button type="button" className="btn btn-ghost btn-sm btn-full"
                  onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
