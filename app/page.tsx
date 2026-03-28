"use client";

import { useState, useEffect } from "react";

// 영상 데이터의 타입 정의
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

  // 앱 초기화 및 백그라운드 동기화 로직
  const initApp = async () => {
    if (typeof window === "undefined") return;

    // 1. [즉시 실행] 로컬에 데이터가 있으면 바로 화면에 표시 (0.1초)
    const localRaw = localStorage.getItem("dowon_videos");
    const localData: VideoItem[] | null = localRaw ? JSON.parse(localRaw) : null;
    
    if (localData && localData.length > 0) {
      setVideos(localData);
      pickRandom(localData);
      setLoading(false); // 로컬 데이터가 있으면 로딩창 안 보여줌
    } else {
      setLoading(true); // 데이터가 아예 없는 최초 접속시에만 로딩 노출
    }

    // 2. [백그라운드 실행] 화면은 띄워둔 채로 조용히 개수 확인
    try {
      const countRes = await fetch('/api/youtube?type=checkCount');
      const { count } = await countRes.json();

      // 로컬 데이터가 없거나, 유튜브 서버상의 개수와 다를 때만 업데이트
      if (!localData || localData.length !== count) {
        console.log("🔄 새 영상 감지: 백그라운드 업데이트 시작");
        const listRes = await fetch('/api/youtube?type=fetchAll');
        const newList: VideoItem[] = await listRes.json();
        
        localStorage.setItem("dowon_videos", JSON.stringify(newList));
        setVideos(newList);
        
        // 만약 최초 접속이라 화면에 아무것도 없었다면 여기서 뽑아줌
        if (!localData || localData.length === 0) {
          pickRandom(newList);
        }
      } else {
        console.log("✅ 데이터 최신 상태 (업데이트 불필요)");
      }
    } catch (e) {
      console.error("백그라운드 동기화 중 오류:", e);
    } finally {
      setLoading(false);
    }
  };

  // 랜덤 선택 로직 (기존 6:4 비율 유지)
  const pickRandom = (list: VideoItem[]) => {
    if (!list || list.length === 0) return;

    const ratio = Math.floor(Math.random() * 10);
    let selected: VideoItem[];

    if (ratio < 6) { 
      // 과거 60% (전체 리스트의 뒤쪽 70% 영역)
      const startIndex = Math.floor(list.length * 0.3);
      const oldPart = list.slice(startIndex);
      selected = [...oldPart].sort(() => 0.5 - Math.random()).slice(0, 5);
    } else { 
      // 최신 40% (전체 리스트의 앞쪽 30% 영역)
      const endIndex = Math.floor(list.length * 0.3);
      const newPart = list.slice(0, endIndex);
      selected = [...newPart].sort(() => 0.5 - Math.random()).slice(0, 5);
    }
    setDisplayVideos(selected);
  };

  useEffect(() => {
    initApp();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-md mt-6 space-y-6">
        
        <header className="text-center space-y-1">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter">이도원 랜덤 피커</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Background Sync Mode</p>
        </header>

        {/* 로딩창은 데이터가 아예 없는 최초 1회만 노출됨 */}
        {loading && videos.length === 0 ? (
          <div className="flex flex-col items-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-xs tracking-widest uppercase animate-pulse">최초 데이터 수신 중...</p>
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