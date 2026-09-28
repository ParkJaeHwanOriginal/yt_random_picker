import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const API_KEY = process.env.YOUTUBE_API_KEY;
const DOWON_INFO = {
  channelId: "UCWq9wRjQXYC8i486uVLysUA",
  uploadsId: "UUWq9wRjQXYC8i486uVLysUA"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  try {
    // 1. 단순 영상 개수 대조
    if (type === 'checkCount') {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${DOWON_INFO.channelId}&key=${API_KEY}`);
      const data = await res.json();
      return NextResponse.json({ count: parseInt(data.items[0].statistics.videoCount) });
    }

    // 2. 전체 리스트 생성
    if (type === 'fetchAll') {
      let allVideos: any[] = [];
      let nextPageToken = "";
      
      for (let i = 0; i < 40; i++) {
        // 백틱 구문 오류 해결: 삼항 연산자 내부를 일반 문자열 결합으로 변경
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

    // 3. 특정 영상 클릭 시 조회수 1 증가
    if (type === 'increment') {
      const videoId = searchParams.get('videoId');
      if (videoId) {
        await kv.zincrby('video_clicks', 1, videoId);
      }
      return NextResponse.json({ success: true });
    }

    // 4. Top 3 영상 ID 조회
    if (type === 'getTop') {
      const topIds = await kv.zrange('video_clicks', 0, 2, { rev: true });
      return NextResponse.json(topIds);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error(`[API ERROR] Type: ${type}, Message:`, error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
