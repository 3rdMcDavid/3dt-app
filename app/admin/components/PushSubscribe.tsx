'use client';

import { useEffect, useState } from 'react';

export default function PushSubscribe() {
  const [state, setState] = useState<'loading' | 'unsupported' | 'prompt' | 'subscribed' | 'denied'>('loading');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setState('denied'); return; }
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            // Always sync current subscription to DB — handles rotated endpoints
            fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sub.toJSON()),
            }).catch(() => {});
            setState('subscribed');
          } else {
            setState('prompt');
          }
        })
      );
    } else {
      setState('prompt');
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setState('denied'); return; }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });

    setState('subscribed');
  }

  if (state !== 'prompt') return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 18px', display: 'flex',
      alignItems: 'center', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      maxWidth: 300,
    }}>
      <span style={{ fontSize: 20 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Enable Notifications</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Get alerted on new leads & paid invoices</div>
      </div>
      <button onClick={enable} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
        Enable
      </button>
    </div>
  );
}
