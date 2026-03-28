"use client";

import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState(""); 
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [loading, setLoading] = useState(false);

  const quickSearches = ["이도원", "침착맨", "슈카월드"];

  const handleSearch = async (searchName: string) => {
    const targetQuery = searchName || query;
    if (!targetQuery.trim()) return alert("검색어를 입력하세요!");
    setQuery(targetQuery);
    setLoading(true);
    setVideos([]);
    setSelectedChannelId(""); 
    try {
      const res = await fetch(`/api/youtube?type=searchChannel&q=${encodeURIComponent(targetQuery)}`);
      const data = await res.json();
      setChannels(data);
    } catch (error) {
      alert("채널 검색 오류");
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">6:4 Retro & Trendy Mix</p>
        </header>

        {/* 퀵 버튼 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {quickSearches.map((name) => (
            <button key={name} onClick={() => handleSearch(name)} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 shadow-sm hover:text-red-600 active:scale-95 transition-all">
              # {name}
            </button>
          ))}
        </div>

        {/* 검색바 */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-lg border border-gray-100">
          <input
            type="text"
            className="flex-1 p-2 outline-none text-gray-700 font-medium"
            placeholder="유튜버 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
          />
          <button onClick={() => handleSearch(query)} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold">검색</button>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-10 space-y-3">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-xs tracking-widest uppercase animate-pulse">Scanning Archive...</p>
          </div>
        )}

        {/* 채널 리스트 */}
        {!loading && channels.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">Target Channel</p>
            {channels.map((ch: any) => (
              <div key={ch.id.channelId} onClick={() => handleGetRandomVideos(ch.id.channelId)}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl cursor-pointer shadow-sm border border-gray-100 hover:ring-2 hover:ring-red-500 transition-all active:bg-gray-50">
                <img src={ch.snippet.thumbnails.default.url} className="w-12 h-12 rounded-full border shadow-inner" alt="ch" />
                <p className="font-bold text-gray-800 truncate">{ch.snippet.channelTitle}</p>
              </div>
            ))}
          </div>
        )}

        {/* 영상 리스트 */}
        {!loading && videos.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recommended Mix</p>
              <div className="flex gap-4">
                <button onClick={() => handleGetRandomVideos(selectedChannelId)} className="text-xs text-blue-600 font-black hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">새로운 믹스</button>
                <button onClick={() => { setVideos([]); setChannels([]); }} className="text-xs text-gray-400 font-black hover:bg-gray-100 px-2 py-1 rounded-md transition-colors">닫기</button>
              </div>
            </div>
            {videos.map((vid: any) => (
              <div key={vid.id.videoId} onClick={() => (window.location.href = `https://www.youtube.com/watch?v=${vid.id.videoId}`)}
                className="group bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 cursor-pointer active:scale-[0.97] transition-all">
                <div className="relative aspect-video">
                  <img src={vid.snippet.thumbnails.medium.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="thumb" />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg font-bold backdrop-blur-sm">
                    {new Date(vid.snippet.publishedAt).getFullYear()}년
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">{vid.snippet.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}