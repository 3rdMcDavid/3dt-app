'use client';

import { useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { addScopeItemsAction } from '@/app/admin/projects/actions';
import { SCOPE_CATALOG } from '@/lib/catalog';

type SelectedMap = Record<string, number>;
type CustomItem = { id: number; name: string; price: string };

function fmt(n: number) {
  return `$${n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(2)}`;
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending || disabled}>
      {pending ? 'Adding…' : 'Add to Project →'}
    </button>
  );
}

export default function AddScopeItems({ projectId, existingNames }: {
  projectId: string;
  existingNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedMap>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [note, setNote] = useState('');
  const nextId = useRef(0);

  // Reset state when panel closes
  function close() {
    setOpen(false);
    setSelected({});
    setCustomItems([]);
    setNote('');
    nextId.current = 0;
  }

  function toggle(name: string, defaultPrice: number) {
    setSelected(prev => {
      if (name in prev) {
        const { [name]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [name]: defaultPrice };
    });
  }

  function updatePrice(name: string, val: string) {
    setSelected(prev => ({ ...prev, [name]: parseFloat(val) || 0 }));
  }

  function addCustom() {
    setCustomItems(prev => [...prev, { id: nextId.current++, name: '', price: '' }]);
  }

  function updateCustom(id: number, field: 'name' | 'price', val: string) {
    setCustomItems(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  }

  function removeCustom(id: number) {
    setCustomItems(prev => prev.filter(c => c.id !== id));
  }

  const catalogTotal = Object.values(selected).reduce((a, b) => a + b, 0);
  const customTotal  = customItems.reduce((a, c) => a + (parseFloat(c.price) || 0), 0);
  const total        = catalogTotal + customTotal;

  const scopeItems = [
    ...Object.entries(selected).map(([name, price]) => ({ name, price })),
    ...customItems
      .filter(c => c.name.trim() && parseFloat(c.price) > 0)
      .map(c => ({ name: c.name.trim(), price: parseFloat(c.price) })),
  ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 4 }}
      >
        + Add Scope Items
      </button>
    );
  }

  return (
    <div style={{
      marginTop: 16,
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '16px 18px',
      background: 'var(--surface)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Add Scope Items</span>
        <button
          type="button"
          onClick={close}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--muted)', padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      <form action={addScopeItemsAction}>
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="scope" value={JSON.stringify(scopeItems)} />

        {/* Catalog */}
        {SCOPE_CATALOG.map(cat => (
          <div key={cat.label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 5, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              {cat.label}
            </div>
            {cat.items.map(item => {
              const alreadyOnProject = existingNames.includes(item.name);
              const isChecked = item.name in selected;
              return (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', opacity: alreadyOnProject ? 0.4 : 1 }}>
                  <input
                    type="checkbox"
                    id={`addon-${item.name}`}
                    checked={isChecked}
                    disabled={alreadyOnProject}
                    onChange={() => toggle(item.name, item.price)}
                    style={{ width: 'auto', accentColor: 'var(--green)', flexShrink: 0, cursor: alreadyOnProject ? 'not-allowed' : 'pointer' }}
                  />
                  <label
                    htmlFor={`addon-${item.name}`}
                    style={{ flex: 1, fontSize: 13, color: isChecked ? 'var(--text)' : 'var(--muted)', cursor: alreadyOnProject ? 'not-allowed' : 'pointer', userSelect: 'none' }}
                  >
                    {item.name}
                    {alreadyOnProject && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--muted)', fontStyle: 'italic' }}>already on project</span>
                    )}
                  </label>
                  {isChecked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>$</span>
                      <input
                        type="number"
                        value={selected[item.name]}
                        onChange={e => updatePrice(item.name, e.target.value)}
                        min={0}
                        step={1}
                        style={{ width: 72, fontSize: 13, padding: '3px 6px', textAlign: 'right' }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 50, textAlign: 'right' }}>
                      {fmt(item.price)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Custom items */}
        {customItems.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 5, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              Custom
            </div>
            {customItems.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Item name"
                  value={c.name}
                  onChange={e => updateCustom(c.id, 'name', e.target.value)}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={c.price}
                    onChange={e => updateCustom(c.id, 'price', e.target.value)}
                    min={0}
                    step={1}
                    style={{ width: 72, fontSize: 13, padding: '3px 6px', textAlign: 'right' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCustom(c.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={addCustom} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          + Add Custom Item
        </button>

        {/* Note */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Note <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
          <input
            type="text"
            name="note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Client requested during revision 2 call"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Summary */}
        {total > 0 && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Add-On Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{fmt(total)}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Creates a new add-on invoice for {fmt(total)} and appends a dated amendment to the contract.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <SubmitButton disabled={total === 0} />
          <button type="button" onClick={close} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
