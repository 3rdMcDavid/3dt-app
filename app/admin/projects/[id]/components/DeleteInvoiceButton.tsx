'use client';

import { deleteInvoiceAction } from '@/app/admin/projects/actions';

export default function DeleteInvoiceButton({ invoiceId, projectId }: { invoiceId: string; projectId: string }) {
  return (
    <form action={deleteInvoiceAction} style={{ display: 'inline' }}>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="hidden" name="project_id" value={projectId} />
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--red)' }}
        onClick={e => { if (!confirm('Delete this invoice?')) e.preventDefault(); }}
      >
        Delete
      </button>
    </form>
  );
}
