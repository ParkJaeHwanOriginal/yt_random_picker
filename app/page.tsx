"use client";

import { useState, useEffect } from "react";

interface VideoItem {
  id: string;
  title: string;
  thumb: string;
  date: string;
}

export default function Home() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [displayVideos, setDisplayVideos] = useState<VideoItem[]>([]);
  const [topVideos, setTopVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const initApp = async () => {
    if (typeof window === "undefined") return;

    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const mode = isPWA ? "pwa" : "browser";

    const localRaw = localStorage.getItem("dowon_videos");
    const localData: VideoItem[] | null = localRaw ? JSON.parse(localRaw) : null;
    
    if (localData && localData.length > 0) {
      setVideos(localData);
      pickRandom(localData);
      fetchTopVideos(localData); // 로컬 데이터로 바로 Top 3 계산
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const countRes = await fetch(`/api/youtube?type=checkCount&mode=${mode}`);
      const { count } = await countRes.json();

      if (!localData || localData.length !== count) {
        const listRes = await fetch(`/api/youtube?type=fetchAll&mode=${mode}`);
        const newList: VideoItem[] = await listRes.json();
        
        localStorage.setItem("dowon_videos", JSON.stringify(newList));
        setVideos(newList);
        
        if (!localData || localData.length === 0) {
          pickRandom(newList);
          fetchTopVideos(newList);
        }
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // 서버에서 Top 3 ID를 가져와서 전체 리스트와 매칭
  const fetchTopVideos = async (fullList: VideoItem[]) => {
    try {
      const res = await fetch('/api/youtube?type=getTop');
      const topIds: string[] = await res.json();

      if (topIds.length > 0) {
        // 서버에서 받아온 ID 순서대로 실제 영상 데이터 매핑
        const matchedTop = topIds
          .map(id => fullList.find(v => v.id === id))
          .filter(v => v !== undefined) as VideoItem[];
        
        // 만약 DB 기록이 3개가 안 된다면, 모자란 만큼 최신 영상으로 채움
        if (matchedTop.length < 3) {
          const needed = 3 - matchedTop.length;
          const fallback = fullList.filter(v => !topIds.includes(v.id)).slice(0, needed);
          setTopVideos([...matchedTop, ...fallback]);
        } else {
          setTopVideos(matchedTop);
        }
      } else {
        // 기록이 아예 없으면 가장 최신 영상 3개로 대체
        setTopVideos(fullList.slice(0, 3));
      }
    } catch (e) {
      // 통신 실패 시에도 최신 영상 3개 대체
      setTopVideos(fullList.slice(0, 3));
    }
  };

  const pickRandom = (list: VideoItem[]) => {
    if (!list || list.length === 0) return;
    const ratio = Math.floor(Math.random() * 10);
    let selected: VideoItem[];

    if (ratio < 6) { 
      const startIndex = Math.floor(list.length * 0.3);
      const oldPart = list.slice(startIndex);
      selected = [...oldPart].sort(() => 0.5 - Math.random()).slice(0, 6);
    } else { 
      const endIndex = Math.floor(list.length * 0.3);
      const newPart = list.slice(0, endIndex);
      selected = [...newPart].sort(() => 0.5 - Math.random()).slice(0, 6);
    }
    setDisplayVideos(selected);
  };

  // 영상 클릭 시 서버에 클릭 수를 1 증가시키고 유튜브로 이동
  const handleVideoClick = (videoId: string) => {
    // 배경에서 조용히 API 호출 (사용자는 기다리지 않음)
    fetch(`/api/youtube?type=increment&videoId=${videoId}`).catch(console.error);
    window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
  };

  useEffect(() => {
    initApp();
  }, []);

  const latestVideo = videos.length > 0 ? videos[0] : null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20 text-gray-900">
      <div className="w-full max-w-md mt-6 space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter italic">이도원 랜덤 피커</h1>
          
          {latestVideo ? (
            <div 
              onClick={() => handleVideoClick(latestVideo.id)}
              className="mt-4 text-left bg-white rounded-2xl flex overflow-hidden shadow-sm border border-red-100 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md hover:border-red-200"
            >
              <div className="relative w-1/3 flex-shrink-0">
                <img src={latestVideo.thumb} className="w-full h-full object-cover aspect-video" alt="latest video" />
                <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest shadow-sm">
                  LATEST
                </div>
              </div>
              <div className="p-3 flex flex-col justify-center flex-1 overflow-hidden">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">새로 올라온 영상</p>
                <p className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">{latestVideo.title}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 animate-pulse">최신 영상 확인 중...</p>
            </div>
          )}
        </header>

        {loading && videos.length === 0 ? (
          <div className="flex flex-col items-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-xs uppercase animate-pulse tracking-widest">Database Syncing...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 랜덤 믹스 섹션 */}
            <div className="space-y-4">
              <button 
                onClick={() => pickRandom(videos)}
                className="w-full bg-red-600 text-white p-4 rounded-full font-black text-xl shadow-lg active:scale-95 transition-all hover:bg-red-700"
              >
                다른 영상
              </button>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Recommended Mix</p>
                <div className="grid grid-cols-2 gap-3">
                  {displayVideos.map((vid) => (
                    <div 
                      key={vid.id} 
                      onClick={() => handleVideoClick(vid.id)}
                      className="bg-white rounded-2xl flex flex-col overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md"
                    >
                      <div className="relative w-full aspect-video flex-shrink-0">
                        <img src={vid.thumb} className="w-full h-full object-cover" alt="thumb" />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                          {new Date(vid.date).getFullYear()}
                        </div>
                      </div>
                      <div className="p-3 flex items-start justify-start flex-1 overflow-hidden">
                        <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-sm">{vid.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* 명예의 전당 (Top 3) 섹션 */}
            {topVideos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">🏆 Most Picked Top 3</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {topVideos.map((vid, index) => (
                    <div 
                      key={vid.id} 
                      onClick={() => handleVideoClick(vid.id)}
                      className="bg-white rounded-2xl flex overflow-hidden shadow-sm border border-orange-100 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md hover:border-orange-200"
                    >
                      <div className="relative w-1/3 flex-shrink-0">
                        <img src={vid.thumb} className="w-full h-full object-cover aspect-video" alt="thumb" />
                        <div className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black shadow-sm">
                          {index + 1}
                        </div>
                      </div>
                      <div className="p-3 flex flex-col justify-center flex-1 overflow-hidden bg-orange-50/30">
                        <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-sm">{vid.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
