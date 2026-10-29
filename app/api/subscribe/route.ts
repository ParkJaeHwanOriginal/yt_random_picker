import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(request: Request) {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  
  try {
    const { subscription } = await request.json();
    // 'subscribers'라는 Set에 구독권 정보를 중복 없이 저장
    await client.sAdd('subscribers', JSON.stringify(subscription));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  } finally {
    await client.disconnect();
  }
}
