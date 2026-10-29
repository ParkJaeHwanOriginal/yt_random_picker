import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from 'redis';

export async function POST(request: Request) {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  
  try {
    const { title, body } = await request.json();
    
    // 이메일은 본인 것으로 수정 필수
    webpush.setVapidDetails(
      'mailto:vegas51230@gmail.com', 
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    // Redis에서 전체 구독권 명단 가져오기
    const subs = await client.sMembers('subscribers');
    
    // 전체 발송 및 만료 구독권(410 에러) DB에서 자동 삭제 처리
    const pushPromises = subs.map(async (subStr) => {
      const sub = JSON.parse(subStr);
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title, body }));
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await client.sRem('subscribers', subStr);
        }
      }
    });

    await Promise.all(pushPromises);
    return NextResponse.json({ success: true, count: subs.length });
  } catch (error) {
    console.error('Push Error:', error);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  } finally {
    await client.disconnect();
  }
}
