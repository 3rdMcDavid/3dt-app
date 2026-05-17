'use client';

export default function SigningLink({ url }: { url: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="text"
        readOnly
        value={url}
        style={{ flex: 1, background: 'var(--bg)', fontSize: 12, minWidth: 200 }}
        onClick={e => (e.target as HTMLInputElement).select()}
      />
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
        Preview ↗
      </a>
    </div>
  );
}
