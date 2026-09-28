import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.YOUTUBE_API_KEY;
const DOWON_INFO = {
  channelId: "UCWq9wRjQXYC8i486uVLysUA",
  uploadsId: "UUWq9wRjQXYC8i486uVLysUA"
};

// 🌟 REDIS_URL 환경변수를 사용하는 표준 Redis 클라이언트 연결
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'checkCount') {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${DOWON_INFO.channelId}&key=${API_KEY}`);
      const data = await res.json();
      return NextResponse.json({ count: parseInt(data.items[0].statistics.videoCount) });
    }

    if (type === 'fetchAll') {
      let allVideos: any[] = [];
      let nextPageToken = "";
      
      for (let i = 0; i < 40; i++) {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${DOWON_INFO.uploadsId}&maxResults=50&key=${API_KEY}${nextPageToken ? '&pageToken=' + nextPageToken : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.items || data.items.length === 0) break;
        
        allVideos = [...allVideos, ...data.items];
        nextPageToken = data.nextPageToken;
        
        if (!nextPageToken) break;
      }
      
      const formattedVideos = allVideos.map((v: any) => ({
        id: v.snippet.resourceId.videoId,
        title: v.snippet.title,
        thumb: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default?.url,
        date: v.snippet.publishedAt
      }));
      
      return NextResponse.json(formattedVideos);
    }

    // ⭐ DB 작업이 필요할 때만 연결 (서버리스 환경 최적화)
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    if (type === 'increment') {
      const videoId = searchParams.get('videoId');
      if (videoId) {
        // 특정 영상의 조회수(점수) 1 증가
        await redisClient.zIncrBy('video_clicks', 1, videoId);
      }
      return NextResponse.json({ success: true });
    }

    if (type === 'getTop') {
      // 내림차순(REV)으로 점수가 가장 높은 3개 추출
      const topIds = await redisClient.zRange('video_clicks', 0, 2, { REV: true });
      return NextResponse.json(topIds);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error(`[API ERROR] Type: ${type}, Message:`, error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
