'use client';

import { deleteClientAction } from '@/app/admin/clients/actions';

export default function DeleteClientButton({ id }: { id: string }) {
  return (
    <form action={deleteClientAction} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-danger btn-sm"
        onClick={e => { if (!confirm('Delete this client and all their data?')) e.preventDefault(); }}
      >
        Delete
      </button>
    </form>
  );
}
