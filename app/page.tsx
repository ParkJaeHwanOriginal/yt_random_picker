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

  // 초기 로드: LocalStorage 확인 및 업데이트 체크
  const initApp = async () => {
    if (typeof window === "undefined") return; // SSR 방지

    setLoading(true);
    const localRaw = localStorage.getItem("dowon_videos");
    const localData: VideoItem[] | null = localRaw ? JSON.parse(localRaw) : null;
    
    try {
      // 1. 서버에 현재 영상 개수 확인 (1유닛)
      const countRes = await fetch('/api/youtube?type=checkCount');
      const { count } = await countRes.json();

      // 2. 데이터가 없거나 개수가 다르면 전체 새로고침 (약 14유닛)
      if (!localData || localData.length !== count) {
        const listRes = await fetch('/api/youtube?type=fetchAll');
        const newList: VideoItem[] = await listRes.json();
        
        localStorage.setItem("dowon_videos", JSON.stringify(newList));
        setVideos(newList);
        pickRandom(newList);
      } else {
        // 데이터가 일치하면 로컬 데이터 사용 (0유닛)
        setVideos(localData);
        pickRandom(localData);
      }
    } catch (e) {
      console.error("데이터 동기화 실패:", e);
      if (localData) {
        setVideos(localData);
        pickRandom(localData);
      }
    } finally {
      setLoading(false);
    }
  };

  // 랜덤 선택 로직 (6:4 비율)
  const pickRandom = (list: VideoItem[]) => {
    if (!list || list.length === 0) return;

    const ratio = Math.floor(Math.random() * 10);
    let selected: VideoItem[];

    if (ratio < 6) { 
      // 과거 60%
      const startIndex = Math.floor(list.length * 0.3);
      const oldPart = list.slice(startIndex);
      selected = [...oldPart].sort(() => 0.5 - Math.random()).slice(0, 5);
    } else { 
      // 최신 40%
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
        
        {/* 헤더: 명칭 수정 */}
        <header className="text-center space-y-1">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter">이도원 랜덤 피커</h1>
        </header>

        {loading ? (
          <div className="flex flex-col items-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-xs tracking-widest uppercase animate-pulse">Syncing Database...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 버튼: 명칭 수정 및 스타일링 */}
            <button 
              onClick={() => pickRandom(videos)}
              className="w-full bg-red-600 text-white p-4 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform"
            >
              다른 영상
            </button>

            {/* 영상 리스트: 가로형 디자인으로 썸네일 축소 */}
            <div className="space-y-3">
              
              {displayVideos.map((vid) => (
                <div 
                  key={vid.id} 
                  onClick={() => window.location.href=`https://www.youtube.com/watch?v=${vid.id}`}
                  className="bg-white rounded-2xl flex overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all hover:bg-gray-50"
                >
                  {/* 썸네일 영역 축소 (w-1/3로 고정) */}
                  <div className="relative w-1/3 flex-shrink-0">
                    <img src={vid.thumb} className="w-full h-full object-cover aspect-[4/3]" alt="thumb" />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                      {new Date(vid.date).getFullYear()}
                    </div>
                  </div>
                  
                  {/* 제목 영역 */}
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