"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [query, setQuery] = useState(""); 
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [loading, setLoading] = useState(false);

  // 퀵 버튼용 추천 목록
  const quickSearches = ["이도원", "침착맨", "슈카월드"];

  // 1단계: 유튜버(채널) 검색 함수
  const handleSearch = async (searchName: string) => {
    const targetQuery = searchName || query;
    if (!targetQuery.trim()) return alert("검색어를 입력하세요!");
    
    setQuery(targetQuery); // 입력창에도 반영
    setLoading(true);
    setVideos([]);
    setSelectedChannelId(""); 
    
    try {
      const res = await fetch(`/api/youtube?type=searchChannel&q=${encodeURIComponent(targetQuery)}`);
      const data = await res.json();
      setChannels(data);
    } catch (error) {
      alert("채널 검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 랜덤 영상 5개 가져오기
  const handleGetRandomVideos = async (channelId: string) => {
    setLoading(true);
    setChannels([]); 
    setSelectedChannelId(channelId);
    try {
      const res = await fetch(`/api/youtube?type=getRandomVideo&channelId=${channelId}`);
      const data = await res.json();
      setVideos(data);
    } catch (error) {
      alert("영상을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-md mt-8 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black text-red-600 tracking-tighter italic">YT PICKER</h1>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">Random Video Selector</p>
        </header>

        {/* 퀵 버튼 섹션 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {quickSearches.map((name) => (
            <button
              key={name}
              onClick={() => handleSearch(name)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95"
            >
              # {name}
            </button>
          ))}
        </div>

        {/* 검색바 */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-lg border border-gray-100">
          <input
            type="text"
            className="flex-1 p-2 outline-none text-gray-700 font-medium bg-transparent"
            placeholder="유튜버 이름 직접 입력..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
          />
          <button
            onClick={() => handleSearch(query)}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold active:scale-95 transition-transform"
          >
            검색
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-10 space-y-3">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-sm">FETCHING DATA...</p>
          </div>
        )}

        {/* 채널 목록 (1단계) */}
        {!loading && channels.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
            <p className="text-xs font-black text-gray-400 px-1 uppercase tracking-widest">Select Channel</p>
            {channels.map((ch: any) => (
              <div
                key={ch.id.channelId}
                onClick={() => handleGetRandomVideos(ch.id.channelId)}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl cursor-pointer shadow-sm border border-gray-100 hover:ring-2 hover:ring-red-500 transition-all active:bg-gray-50"
              >
                <img src={ch.snippet.thumbnails.default.url} className="w-12 h-12 rounded-full shadow-inner" alt="ch" />
                <p className="font-bold text-gray-800 truncate">{ch.snippet.channelTitle}</p>
              </div>
            ))}
          </div>
        )}

        {/* 랜덤 영상 목록 (2단계) */}
        {!loading && videos.length > 0 && (
          <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4">
            <div className="flex justify-between items-center px-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Recommended</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleGetRandomVideos(selectedChannelId)} 
                  className="text-xs text-blue-600 font-black hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                >
                  다른 영상 뽑기
                </button>
                <button 
                  onClick={() => { setVideos([]); setChannels([]); }} 
                  className="text-xs text-gray-400 font-black hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
            {videos.map((vid: any) => (
              <div
                key={vid.id.videoId}
                onClick={() => (window.location.href = `https://www.youtube.com/watch?v=${vid.id.videoId}`)}
                className="group bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 cursor-pointer active:scale-[0.97] transition-all"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img src={vid.snippet.thumbnails.medium.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="thumb" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 p-3 rounded-full shadow-lg text-red-600 font-bold">WATCH NOW</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                    {vid.snippet.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}