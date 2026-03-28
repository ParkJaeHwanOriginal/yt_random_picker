import { NextResponse } from 'next/server';

const API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 
  const query = searchParams.get('q');
  const channelId = searchParams.get('channelId');

  try {
    // 1. 채널 검색: 입력한 키워드로 채널 리스트 5개 가져오기
    if (type === 'searchChannel' && query) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(query)}&key=${API_KEY}`
      );
      const data = await res.json();
      return NextResponse.json(data.items || []);
    }

    // 2. 랜덤 영상 추출: 선택된 채널의 영상 중 50개를 가져와 랜덤하게 5개 섞기
    if (type === 'getRandomVideo' && channelId) {
      // 정렬 순서를 랜덤하게 섞어 다양한 영상을 노출 (최신순, 조회수순, 평점순)
      const orders = ['date', 'viewCount', 'rating'];
      const randomOrder = orders[Math.floor(Math.random() * orders.length)];

      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=${randomOrder}&type=video&key=${API_KEY}`
      );
      const videoData = await videoRes.json();
      const items = videoData.items || [];

      if (items.length === 0) {
        return NextResponse.json({ error: "No videos found" }, { status: 404 });
      }

      // 50개 리스트를 랜덤하게 셔플 후 상위 5개 선택
      const shuffled = items.sort(() => 0.5 - Math.random());
      const selectedVideos = shuffled.slice(0, 5);

      return NextResponse.json(selectedVideos);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("YouTube API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}