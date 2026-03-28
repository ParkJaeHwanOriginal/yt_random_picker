import { NextResponse } from 'next/server';

const API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 
  const query = searchParams.get('q');
  const channelId = searchParams.get('channelId');

  try {
    // 1. 채널 검색
    if (type === 'searchChannel' && query) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(query)}&key=${API_KEY}`
      );
      const data = await res.json();
      return NextResponse.json(data.items || []);
    }

    // 2. 랜덤 영상 추출 (6:4 비율 적용)
    if (type === 'getRandomVideo' && channelId) {
      const ratioPicker = Math.floor(Math.random() * 10); // 0~9 사이 난수
      let fetchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&type=video&key=${API_KEY}`;

      if (ratioPicker < 6) {
        // [60% 확률]: 과거 영상 타겟팅 (2년 전 ~ 8년 전 사이 랜덤 시점 이전 데이터)
        const yearsAgo = Math.floor(Math.random() * 7) + 2; 
        const randomPastDate = new Date();
        randomPastDate.setFullYear(randomPastDate.getFullYear() - yearsAgo);
        fetchUrl += `&publishedBefore=${randomPastDate.toISOString()}&order=date`;
      } else {
        // [40% 확률]: 최신 및 인기 영상 (조회수순 혹은 최신순 랜덤)
        const orderIdx = Math.floor(Math.random() * 2);
        const orders = ['viewCount', 'date'];
        fetchUrl += `&order=${orders[orderIdx]}`;
      }

      const videoRes = await fetch(fetchUrl);
      const videoData = await videoRes.json();
      let items = videoData.items || [];

      // 결과가 없으면 (과거 데이터 부족 등) 최신순으로 강제 리턴
      if (items.length === 0) {
        const fallbackRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${API_KEY}`);
        const fallbackData = await fallbackRes.json();
        items = fallbackData.items || [];
      }

      // 랜덤 셔플 후 5개 추출
      const shuffled = items.sort(() => 0.5 - Math.random());
      const selectedVideos = shuffled.slice(0, 5);

      return NextResponse.json(selectedVideos);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}