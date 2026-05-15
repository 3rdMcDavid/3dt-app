import webpush from 'web-push';
import { createServiceClient } from './supabase/service';

webpush.setVapidDetails(
  'mailto:3rddavidstechnology@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(title: string, body: string, url = '/admin') {
  const supabase = createServiceClient();
  const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
  if (!subscriptions || subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, body, url });

  await Promise.all(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    })
  );
}
