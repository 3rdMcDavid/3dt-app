'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentUpload({ projectId }: { projectId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    fd.set('project_id', projectId);

    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Upload failed');
      setLoading(false);
    } else {
      (e.currentTarget as HTMLFormElement).reset();
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div className="form-group" style={{ flex: '2 1 200px', margin: 0 }}>
        <label className="form-label">File</label>
        <input ref={fileRef} type="file" name="file" required />
      </div>
      <div className="form-group" style={{ flex: '1 1 140px', margin: 0 }}>
        <label className="form-label">Type</label>
        <select name="type">
          <option value="deliverable">Deliverable</option>
          <option value="contract">Contract</option>
          <option value="proposal">Proposal</option>
          <option value="other">Other</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? 'Uploading…' : 'Upload'}
      </button>
      {error && <p className="error-msg" style={{ width: '100%', marginTop: 4 }}>{error}</p>}
    </form>
  );
}
