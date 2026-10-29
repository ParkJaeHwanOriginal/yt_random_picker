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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'random' | 'top3'>('random');
  
  // 알림 구독 상태 관리
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [pushStatus, setPushStatus] = useState<string>("알림 권한 확인 중...");

  // VAPID 키 변환 함수
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

const initApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        setPushStatus("알림 수신 중 🔔");
        
        // 기존 구독권이 발견되면 무조건 서버 DB로 전송 (Redis Set 구조라 중복 저장은 알아서 방지됨)
        fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        }).catch(console.error);
      }
    }
  };

    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const mode = isPWA ? "pwa" : "browser";

    const localRaw = localStorage.getItem("dowon_videos");
    const localData: VideoItem[] | null = localRaw ? JSON.parse(localRaw) : null;
    
    if (localData && localData.length > 0) {
      setVideos(localData);
      pickRandom(localData);
      fetchTopVideos(localData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const countRes = await fetch(`/api/youtube?type=checkCount&mode=${mode}`, { cache: 'no-store' });
      const { count } = await countRes.json();

      if (!localData || localData.length !== count) {
        const listRes = await fetch(`/api/youtube?type=fetchAll&mode=${mode}`, { cache: 'no-store' });
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
      setIsRefreshing(false);
    }
  };

const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });
      
      // 1. 발급받은 구독권을 우리 Redis 서버 API로 전송하여 명단에 저장
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      setSubscription(sub);
      setPushStatus("알림 수신 중 🔔");
      alert("알림 설정이 완료되어 서버 명단에 등록되었습니다!");
    } catch (error) {
      console.error("Subscription error:", error);
      alert("알림 권한을 허용해야 합니다.");
    }
  };

  const sendTestPush = async () => {
    try {
      // 2. 이제 개별 구독권(subscription)을 넘기지 않음. 서버가 DB에서 다 꺼내서 발송함.
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "🚀 DB 연동 전체 발송 테스트",
          body: "이 알림은 명단에 있는 모든 기기로 동시에 발송됩니다!"
        }),
      });
      
      const data = await res.json();
      if(data.success) {
        alert(`총 ${data.count}대의 기기로 알림을 쐈습니다!`);
      }
    } catch (error) {
      console.error("Push test error:", error);
    }
  };

  const fetchTopVideos = async (fullList: VideoItem[]) => {
    try {
      const res = await fetch('/api/youtube?type=getTop', { cache: 'no-store' });
      const topIds: string[] = await res.json();

      if (topIds.length > 0) {
        const matchedTop = topIds
          .map(id => fullList.find(v => v.id === id))
          .filter(v => v !== undefined) as VideoItem[];
        
        if (matchedTop.length < 3) {
          const needed = 3 - matchedTop.length;
          const fallback = fullList.filter(v => !topIds.includes(v.id)).slice(0, needed);
          setTopVideos([...matchedTop, ...fallback]);
        } else {
          setTopVideos(matchedTop);
        }
      } else {
        setTopVideos(fullList.slice(0, 3));
      }
    } catch (e) {
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

  const handleVideoClick = async (videoId: string) => {
    try {
      await fetch(`/api/youtube?type=increment&videoId=${videoId}`);
    } catch (error) {
      console.error("카운트 증가 에러:", error);
    } finally {
      window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    initApp();
  };

  useEffect(() => {
    initApp();
  }, []);

  const latestVideo = videos.length > 0 ? videos[0] : null;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-8 text-gray-900 overflow-hidden">
      <div className="w-full max-w-md mt-4 space-y-5 relative">
        <header className="text-center space-y-1 pt-1">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter italic">이도원 랜덤 피커</h1>
          
          {latestVideo ? (
            <div 
              onClick={() => handleVideoClick(latestVideo.id)}
              className="mt-2 text-left bg-white rounded-2xl flex overflow-hidden shadow-sm border border-red-100 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md hover:border-red-200"
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
            <div className="mt-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 animate-pulse">최신 영상 확인 중...</p>
            </div>
          )}
        </header>

        {loading && videos.length === 0 ? (
          <div className="flex flex-col items-center py-10 space-y-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-xs uppercase animate-pulse tracking-widest">Database Syncing...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full bg-red-600 text-white py-3 rounded-full font-black text-lg shadow-lg active:scale-95 transition-all hover:bg-red-700 disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>갱신 중...</span>
                </>
              ) : (
                <span>{activeTab === 'random' ? '다른 영상' : '최신 순위 갱신'}</span>
              )}
            </button>

            <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveTab('random')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ease-in-out ${
                  activeTab === 'random' ? 'bg-white text-red-600 shadow-sm transform scale-100' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎲 랜덤 추천
              </button>
              <button
                onClick={() => setActiveTab('top3')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ease-in-out ${
                  activeTab === 'top3' ? 'bg-white text-orange-500 shadow-sm transform scale-100' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🏆 Top 3 랭킹
              </button>
            </div>

            <div>
              {activeTab === 'random' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              )}

              {activeTab === 'top3' && topVideos.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
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

            {/* 🌟 알림 테스트 UI 섹션 */}
            <div className="mt-6 p-4 bg-gray-100 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-gray-600">🔔 알림 상태</p>
                <span className="text-xs text-red-500 font-bold">{pushStatus}</span>
              </div>
              <div className="flex gap-2">
                {!subscription && (
                  <button 
                    onClick={subscribeToPush}
                    className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-xs font-bold active:scale-95 transition-all"
                  >
                    알림 설정 허용
                  </button>
                )}
                <button 
                  onClick={sendTestPush}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                  disabled={!subscription}
                >
                  테스트 발송
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
