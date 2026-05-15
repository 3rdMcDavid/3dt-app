'use client';

import { deleteDocumentAction } from '@/app/admin/projects/actions';

export default function DeleteDocumentButton({ documentId, projectId, fileUrl }: { documentId: string; projectId: string; fileUrl: string }) {
  return (
    <form action={deleteDocumentAction} style={{ display: 'inline' }}>
      <input type="hidden" name="document_id" value={documentId} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="file_url" value={fileUrl} />
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--red)' }}
        onClick={e => { if (!confirm('Delete this file?')) e.preventDefault(); }}
      >
        Delete
      </button>
    </form>
  );
}
