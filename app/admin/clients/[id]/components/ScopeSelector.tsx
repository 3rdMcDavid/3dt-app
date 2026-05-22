'use client';

import { useState, useRef } from 'react';

type SelectedMap = Record<string, number>;
type CustomItem = { id: number; name: string; price: string };

const CATALOG = [
  { label: 'Website', items: [
    { name: 'Website Development', price: 500 },
  ]},
  { label: 'Lead & Sales', items: [
    { name: 'Instant Lead Follow-Up', price: 300 },
    { name: 'Quote Generator', price: 400 },
    { name: 'Referral Tracker', price: 450 },
  ]},
  { label: 'Client & Projects', items: [
    { name: 'Client Onboarding Portal', price: 600 },
    { name: 'Appointment Booking System', price: 400 },
    { name: 'Project Status Page', price: 350 },
    { name: 'Retainer Dashboard', price: 400 },
    { name: 'Feedback & Testimonial Collector', price: 300 },
  ]},
  { label: 'Operations', items: [
    { name: 'Job / Order Tracker', price: 600 },
    { name: 'Document Generator', price: 500 },
    { name: 'Expense Logger', price: 350 },
    { name: 'Inventory Tracker', price: 400 },
  ]},
  { label: 'Local Business', items: [
    { name: 'Review Request Automation', price: 300 },
    { name: 'Loyalty Points Tracker', price: 450 },
    { name: 'Event Registration System', price: 400 },
    { name: 'Service Catalog Manager', price: 350 },
    { name: 'Before / After Showcase', price: 350 },
  ]},
];

function fmt(n: number) {
  return `$${n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(2)}`;
}

export default function ScopeSelector({ projectType = 'website' }: { projectType?: string }) {
  const [selected, setSelected] = useState<SelectedMap>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [carePlan, setCarePlan] = useState(false);
  const nextId = useRef(0);

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
  const customTotal = customItems.reduce((a, c) => a + (parseFloat(c.price) || 0), 0);
  const total = catalogTotal + customTotal;
  const deposit = Math.round((total / 2) * 100) / 100;

  const scopeItems = [
    ...Object.entries(selected).map(([name, price]) => ({ name, price })),
    ...customItems
      .filter(c => c.name.trim() && parseFloat(c.price) > 0)
      .map(c => ({ name: c.name.trim(), price: parseFloat(c.price) })),
  ];

  return (
    <div>
      {/* Hidden form values — inside the parent <form> */}
      <input type="hidden" name="scope" value={JSON.stringify(scopeItems)} />
      <input type="hidden" name="care_plan" value={carePlan ? 'true' : 'false'} />

      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 12 }}>
        Scope of Work
      </div>

      {/* Catalog */}
      {CATALOG.map(cat => (
        <div key={cat.label} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
            {cat.label}
          </div>
          {cat.items.map(item => {
            const isChecked = item.name in selected;
            return (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id={`scope-${item.name}`}
                  checked={isChecked}
                  onChange={() => toggle(item.name, item.price)}
                  style={{ width: 'auto', accentColor: 'var(--green)', flexShrink: 0, cursor: 'pointer' }}
                />
                <label
                  htmlFor={`scope-${item.name}`}
                  style={{ flex: 1, fontSize: 13, color: isChecked ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}
                >
                  {item.name}
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
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
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

      <button type="button" onClick={addCustom} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
        + Add Custom Item
      </button>

      {/* Care Plan */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={carePlan}
            onChange={e => setCarePlan(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--green)', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Monthly Care Plan — $75/mo</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Added to contract. Begins 30 days post-launch. Set up recurring billing in Stripe separately.
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>$75/mo</span>
        </label>
      </div>

      {/* Summary */}
      {total > 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Project Total</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Deposit (50%) — due at signing</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{fmt(deposit)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Final (50%) — due before {projectType === 'tool' || projectType === 'website_tool' ? 'delivery' : 'launch'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{fmt(total - deposit)}</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 4 }}>
          Select at least one service to see the total.
        </div>
      )}
    </div>
  );
}
