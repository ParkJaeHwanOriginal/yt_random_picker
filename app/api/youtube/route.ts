import { NextResponse } from 'next/server';

const API_KEY = process.env.YOUTUBE_API_KEY;
const DOWON_INFO = {
  channelId: "UCWq9wRjQXYC8i486uVLysUA",
  uploadsId: "UUWq9wRjQXYC8i486uVLysUA"
};

// --- [서버 메모리 캐시 변수] ---
let cachedVideos: any[] = [];
let lastVideoCount = 0;
let lastFetchTime = 0;

async function fetchAllVideos(playlistId: string) {
  let allVideos: any[] = [];
  let nextPageToken = "";
  
  // 최대 20페이지(1000개)까지 스캔
  for (let i = 0; i < 20; i++) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Next.js 자체 캐시 활용
    const data = await res.json();
    
    if (!data.items || data.items.length === 0) break;
    
    allVideos = [...allVideos, ...data.items];
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }
  
  return allVideos.map((item: any) => ({
    id: { videoId: item.snippet.resourceId.videoId },
    snippet: item.snippet
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const q = searchParams.get('q');
  const channelId = searchParams.get('channelId');

  try {
    // 1. 채널 검색 (이도원 고정 시 0유닛)
    if (type === 'searchChannel' && q) {
      if (q === "이도원") {
        return NextResponse.json([{
          id: { channelId: DOWON_INFO.channelId },
          snippet: { 
            channelTitle: "이도원",
            thumbnails: { default: { url: "https://yt3.googleusercontent.com/ytc/AIdro_n4..." } } 
          }
        }]);
      }
      // 일반 검색 로직 생략 (기존 코드 유지)
    }

    // 2. 스마트 캐싱 랜덤 영상 추출
    if (type === 'getRandomVideo' && channelId === DOWON_INFO.channelId) {
      // 현재 채널의 실제 영상 개수 확인 (단 1유닛)
      const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${DOWON_INFO.channelId}&key=${API_KEY}`);
      const chData = await chRes.json();
      const currentVideoCount = parseInt(chData.items[0].statistics.videoCount);

      // 데이터가 없거나, 개수가 변했거나, 마지막 호출 후 1시간이 지났다면 새로고침
      const isCacheInvalid = cachedVideos.length === 0 || currentVideoCount !== lastVideoCount || (Date.now() - lastFetchTime > 3600000);

      if (isCacheInvalid) {
        console.log("🔄 영상 리스트 새로고침 중... (개수 변동 감지)");
        cachedVideos = await fetchAllVideos(DOWON_INFO.uploadsId);
        lastVideoCount = currentVideoCount;
        lastFetchTime = Date.now();
      } else {
        console.log("⚡ 캐시된 리스트 사용 중");
      }

      // --- [6:4 비율 랜덤 믹스] ---
      const ratioPicker = Math.floor(Math.random() * 10);
      let selected;

      if (ratioPicker < 6) {
        // 과거 위주: 전체 리스트의 뒤쪽 70% 영역에서 랜덤 추출
        const startIndex = Math.floor(cachedVideos.length * 0.3);
        const oldSection = cachedVideos.slice(startIndex);
        selected = oldSection.sort(() => 0.5 - Math.random()).slice(0, 5);
      } else {
        // 최신 위주: 전체 리스트의 앞쪽 30% 영역에서 랜덤 추출
        const endIndex = Math.floor(cachedVideos.length * 0.3);
        const newSection = cachedVideos.slice(0, endIndex);
        selected = newSection.sort(() => 0.5 - Math.random()).slice(0, 5);
      }

      return NextResponse.json(selected);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}