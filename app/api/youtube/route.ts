import { NextResponse } from 'next/server';

const API_KEY = process.env.YOUTUBE_API_KEY;
const DOWON_INFO = {
  channelId: "UCWq9wRjQXYC8i486uVLysUA",
  uploadsId: "UUWq9wRjQXYC8i486uVLysUA"
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // 1. 단순 개수 확인 API (1유닛)
  if (type === 'checkCount') {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${DOWON_INFO.channelId}&key=${API_KEY}`);
    const data = await res.json();
    return NextResponse.json({ count: parseInt(data.items[0].statistics.videoCount) });
  }

  // 2. 전체 리스트 호출 API (약 14유닛)
  if (type === 'fetchAll') {
    let allVideos: any[] = [];
    let nextPageToken = "";
    for (let i = 0; i < 20; i++) {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${DOWON_INFO.uploadsId}&maxResults=50&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.items) break;
      allVideos = [...allVideos, ...data.items];
      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
    }
    return NextResponse.json(allVideos.map(v => ({ id: v.snippet.resourceId.videoId, title: v.snippet.title, thumb: v.snippet.thumbnails.medium.url, date: v.snippet.publishedAt })));
  }
  
  return NextResponse.json({ error: "Invalid type" });
}