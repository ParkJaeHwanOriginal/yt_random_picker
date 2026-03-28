import { NextResponse } from 'next/server';

const API_KEY = process.env.YOUTUBE_API_KEY;

// [고정 데이터] 이도원 님 채널 정보 - 검색 비용 0원을 위한 설정
const DOWON_INFO = {
  channelId: "UCWq9wRjQXYC8i486uVLysUA",
  uploadsId: "UUWq9wRjQXYC8i486uVLysUA" // UC를 UU로 변경
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const q = searchParams.get('q');
  const channelId = searchParams.get('channelId');

  try {
    // 1. 채널 검색 로직
    if (type === 'searchChannel' && q) {
      // "이도원" 검색 시 API 호출 없이 즉시 반환 (0 유닛)
      if (q === "이도원") {
        return NextResponse.json([{
          id: { channelId: DOWON_INFO.channelId },
          snippet: { 
            channelTitle: "이도원",
            thumbnails: { default: { url: "https://yt3.googleusercontent.com/ytc/AIdro_nOaWvR0vB8N_Q..." } } // 실제 썸네일 주소로 대체 가능
          }
        }]);
      }
      
      // 일반 검색은 기존대로 100 유닛 사용
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(q)}&key=${API_KEY}`);
      const data = await res.json();
      return NextResponse.json(data.items || []);
    }

    // 2. 랜덤 영상 추출 로직 (1 유닛 최적화)
    if (type === 'getRandomVideo' && channelId) {
      let playlistId = "";

      // 이도원 채널이면 고정 ID 사용 (1 유닛)
      if (channelId === DOWON_INFO.channelId) {
        playlistId = DOWON_INFO.uploadsId;
      } else {
        // 타 채널은 업로드 ID 조회를 위해 1 유닛 추가 소모
        const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`);
        const chData = await chRes.json();
        if (!chData.items?.length) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        playlistId = chData.items[0].contentDetails.relatedPlaylists.uploads;
      }

      // playlistItems API로 영상 목록 조회 (단 1 유닛!)
      // 50개를 가져와서 클라이언트에서 랜덤하게 섞습니다.
      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}`
      );
      const videoData = await videoRes.json();
      const items = videoData.items || [];

      // 프론트엔드와 호환되는 데이터 구조로 매핑
      const formattedVideos = items.map((item: any) => ({
        id: { videoId: item.snippet.resourceId.videoId },
        snippet: item.snippet
      }));

      // 랜덤 셔플 후 5개 반환
      const shuffled = formattedVideos.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);

      return NextResponse.json(selected);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}