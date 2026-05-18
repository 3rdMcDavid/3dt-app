'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(os: any) => void>;
    OneSignal?: any;
  }
}

export default function PushSubscribe() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });
      if (!OneSignal.User.PushSubscription.optedIn) {
        setShowPrompt(true);
      }
    });
  }, []);

  async function enable() {
    await window.OneSignal?.Notifications.requestPermission();
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

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
