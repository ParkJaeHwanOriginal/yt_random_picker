// app/api/push/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { subscription, title, body } = await request.json();

    // VAPID 설정 (mailto는 임의의 이메일)
    webpush.setVapidDetails(
      'mailto:test@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    // 해당 기기(subscription)로 푸시 발송
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push Error:', error);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}
