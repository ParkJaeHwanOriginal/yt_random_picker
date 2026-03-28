"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [displayVideos, setDisplayVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // 초기 로드: LocalStorage 확인 및 업데이트 체크
  const initApp = async () => {
    setLoading(true);
    const localData = JSON.parse(localStorage.getItem("dowon_videos") || "null");
    
    try {
      // 1. 서버에 현재 영상 개수 물어보기 (1유닛)
      const countRes = await fetch('/api/youtube?type=checkCount');
      const { count } = await countRes.json();

      // 2. 로컬 데이터가 없거나 개수가 다르면 전체 새로고침 (14유닛)
      if (!localData || localData.length !== count) {
        const listRes = await fetch('/api/youtube?type=fetchAll');
        const newList = await listRes.json();
        localStorage.setItem("dowon_videos", JSON.stringify(newList));
        setVideos(newList);
        pickRandom(newList);
      } else {
        // 데이터가 정확하면 로컬 것 그대로 사용 (0유닛!)
        setVideos(localData);
        pickRandom(localData);
      }
    } catch (e) { console.error("Update failed", e); }
    setLoading(false);
  };

  const pickRandom = (list) => {
    const ratio = Math.floor(Math.random() * 10);
    let selected;
    if (ratio < 6) { // 과거 60%
      const oldPart = list.slice(Math.floor(list.length * 0.3));
      selected = oldPart.sort(() => 0.5 - Math.random()).slice(0, 5);
    } else { // 최신 40%
      const newPart = list.slice(0, Math.floor(list.length * 0.3));
      selected = newPart.sort(() => 0.5 - Math.random()).slice(0, 5);
    }
    setDisplayVideos(selected);
  };

  useEffect(() => { initApp(); }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* UI 부분은 이전과 동일, 버튼 클릭 시 pickRandom(videos)만 실행하면 유닛 소모 0! */}
      <h1 className="text-center text-2xl font-bold text-red-600 mb-6">이도원 랜덤 픽커</h1>
      
      {loading ? <p className="text-center">데이터 동기화 중...</p> : (
        <div className="max-w-md mx-auto space-y-4">
          <button onClick={() => pickRandom(videos)} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">
            새로운 믹스로 뽑기 (유닛 소모 0)
          </button>
          
          {displayVideos.map(vid => (
            <div key={vid.id} onClick={() => window.location.href=`https://www.youtube.com/watch?v=${vid.id}`} className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer">
              <img src={vid.thumb} className="w-full aspect-video object-cover" />
              <div className="p-4"><p className="font-bold line-clamp-2">{vid.title}</p></div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}