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
  const [loading, setLoading] = useState(false);

  // 초기 로드 및 백그라운드 업데이트
  const initApp = async () => {
    if (typeof window === "undefined") return;

    // 1. 로컬 데이터 즉시 로드
    const localRaw = localStorage.getItem("dowon_videos");
    const localData: VideoItem[] | null = localRaw ? JSON.parse(localRaw) : null;
    
    if (localData && localData.length > 0) {
      setVideos(localData);
      pickRandom(localData);
    } else {
      setLoading(true);
    }

    // 2. 백그라운드 개수 대조 (1 유닛 소모)
    try {
      const countRes = await fetch('/api/youtube?type=checkCount');
      const { count } = await countRes.json();

      if (!localData || localData.length !== count) {
        console.log("🔄 새 영상 감지됨: 리스트 갱신 중...");
        const listRes = await fetch('/api/youtube?type=fetchAll');
        const newList: VideoItem[] = await listRes.json();
        
        localStorage.setItem("dowon_videos", JSON.stringify(newList));
        setVideos(newList);
        if (!localData || localData.length === 0) pickRandom(newList);
      }
    } catch (e) {
      console.error("동기화 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const pickRandom = (list: VideoItem[]) => {
    if (!list || list.length === 0) return;
    const ratio = Math.floor(Math.random() * 10);
    let selected: VideoItem[];

    if (ratio < 6) { 
      const startIndex = Math.floor(list.length * 0.3);
      const oldPart = list.slice(startIndex);
      selected = [...oldPart].sort(() => 0.5 - Math.random()).slice(0, 5);
    } else { 
      const endIndex = Math.floor(list.length * 0.3);
      const newPart = list.slice(0, endIndex);
      selected = [...newPart].sort(() => 0.5 - Math.random()).slice(0, 5);
    }
    setDisplayVideos(selected);
  };

  useEffect(() => {
    initApp();
  }, []);

  // 최신 영상 제목 (리스트의 가장 첫 번째 항목)
  const latestVideoTitle = videos.length > 0 ? videos[0].title : "확인 중...";

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20 text-gray-900">
      <div className="w-full max-w-md mt-6 space-y-6">
        
        <header className="text-center space-y-1">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter">이도원 랜덤 피커</h1>
          {/* 최신 영상 확인용 UI (이름만 표시) */}
          <div className="mt-2 p-2 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Latest Video</p>
            <p className="text-[11px] font-bold text-gray-600 truncate px-2">
              {latestVideoTitle}
            </p>
          </div>
        </header>

        {loading && videos.length === 0 ? (
          <div className="flex flex-col items-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-xs">DB 수신 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <button 
              onClick={() => pickRandom(videos)}
              className="w-full bg-red-600 text-white p-4 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform"
            >
              다른 영상
            </button>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Recommended Mix</p>
              
              {displayVideos.map((vid) => (
                <div 
                  key={vid.id} 
                  onClick={() => window.location.href=`https://www.youtube.com/watch?v=${vid.id}`}
                  className="bg-white rounded-2xl flex overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all hover:bg-gray-50"
                >
                  <div className="relative w-1/3 flex-shrink-0">
                    <img src={vid.thumb} className="w-full h-full object-cover aspect-[4/3]" alt="thumb" />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                      {new Date(vid.date).getFullYear()}
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-center justify-start flex-1 overflow-hidden">
                    <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-sm">
                      {vid.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}