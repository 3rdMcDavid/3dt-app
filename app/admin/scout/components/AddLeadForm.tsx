'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AddLeadForm() {
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [source, setSource]   = useState<'referral' | 'manual'>('referral');
  const [saving, setSaving]   = useState(false);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const router = useRouter();

  async function handleAdd() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setErrMsg(null);

    const supabase = createClient();
    const { error } = await supabase.from('leads').insert({
      business_name: name.trim(),
      phone: phone.trim() || null,
      source,
      pipeline_state: 'approved',
      outreach_approved: true,
    });

    if (error) {
      setErrMsg(`Failed to add lead: ${error.message}`);
    } else {
      setName('');
      setPhone('');
      setOpen(false);
      router.refresh();
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(true)}
        style={{ alignSelf: 'flex-start' }}
      >
        ＋ Add lead
      </button>
    );
  }

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)' }}>
        Add Lead
      </div>

      <input
        type="text"
        placeholder="Business or person name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ fontSize:13 }}
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        style={{ fontSize:13 }}
      />

      <div style={{ display:'flex', gap:6 }}>
        {(['referral', 'manual'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            style={{
              flex:1, fontSize:12, fontWeight:600, padding:'6px 0', borderRadius:6,
              background: source === s ? 'var(--accent)' : 'var(--surface)',
              color:      source === s ? '#fff' : 'var(--muted)',
              border: `1px solid ${source === s ? 'var(--accent)' : 'var(--border)'}`,
              cursor:'pointer', textTransform:'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {errMsg && (
        <div style={{ fontSize:12, color:'var(--red)' }}>{errMsg}</div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { setOpen(false); setErrMsg(null); }}
          style={{ flex:1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleAdd}
          disabled={saving || !name.trim()}
          style={{ flex:1 }}
        >
          {saving ? 'Adding…' : 'Add →'}
        </button>
      </div>
    </div>
  );
}
