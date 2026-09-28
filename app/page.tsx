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

  const initApp = async () => {
    if (typeof window === "undefined") return;

    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const mode = isPWA ? "pwa" : "browser";

    const localRaw = localStorage.getItem("dowon_videos");
    const localData: VideoItem[] | null = localRaw ? JSON.parse(localRaw) : null;
    
    if (localData && localData.length > 0) {
      setVideos(localData);
      pickRandom(localData);
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
        if (!localData || localData.length === 0) pickRandom(newList);
      }
    } catch (e) {
      console.error("Sync Error:", e);
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
      selected = [...oldPart].sort(() => 0.5 - Math.random()).slice(0, 6);
    } else { 
      const endIndex = Math.floor(list.length * 0.3);
      const newPart = list.slice(0, endIndex);
      selected = [...newPart].sort(() => 0.5 - Math.random()).slice(0, 6);
    }
    setDisplayVideos(selected);
  };

  useEffect(() => {
    initApp();
  }, []);

  // 전체 영상이 로드되었을 때 첫 번째(가장 최근) 영상을 가져옴
  const latestVideo = videos.length > 0 ? videos[0] : null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20 text-gray-900">
      <div className="w-full max-w-md mt-6 space-y-6">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter italic">이도원 랜덤 피커</h1>
          
          {/* 최신 영상 카드 UI */}
          {latestVideo ? (
            <div 
              onClick={() => window.location.href=`https://www.youtube.com/watch?v=${latestVideo.id}`}
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
          <div className="space-y-6">
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
                    onClick={() => window.location.href=`https://www.youtube.com/watch?v=${vid.id}`}
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
        )}
      </div>
    </main>
  );
}
