import { resend } from '@/lib/resend';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: 'wideoutinfootball@gmail.com',
    subject: 'Test email from 3DT App',
    html: '<p>If you received this, Resend is working correctly.</p>',
  });

  return NextResponse.json({
    from: process.env.RESEND_FROM_EMAIL,
    result,
  });
}
