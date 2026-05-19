export async function sendPushNotification(title: string, body: string, url = '/admin') {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    console.error('[push] Missing OneSignal env vars');
    return;
  }

  const fullUrl = url.startsWith('http')
    ? url
    : `${process.env.NEXT_PUBLIC_APP_URL}${url}`;

  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: body },
        url: fullUrl,
      }),
    });
    if (!res.ok) {
      console.error('[push] OneSignal error', res.status, await res.text());
    }
  } catch (err) {
    console.error('[push] fetch failed', err);
  }
}
