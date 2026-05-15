'use client';

import { deleteProjectAction } from '@/app/admin/projects/actions';

export default function DeleteProjectButton({ id }: { id: string }) {
  return (
    <form action={deleteProjectAction} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-danger btn-sm"
        onClick={e => { if (!confirm('Delete this project and all its data?')) e.preventDefault(); }}
      >
        Delete
      </button>
    </form>
  );
}
