import { sendPushNotification } from '@/lib/push';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await sendPushNotification(
      '🔔 Test Notification',
      'Push notifications are working!',
      '/admin'
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
