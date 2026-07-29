import React, { useState, useEffect } from "react";
import { Music, Youtube, Settings, Disc, Volume2, Database, HelpCircle } from "lucide-react";
import { AppMode, Track } from "./types";
import { getTracks } from "./lib/db";
import Extractor from "./components/Extractor";
import Player from "./components/Player";
import BackupRestore from "./components/BackupRestore";
import soundBoxIcon from "./assets/images/soundbox_app_icon_flat_1783522740605.jpg";

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.Play);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTracks = async () => {
    try {
      const dbTracks = await getTracks();
      setTracks(dbTracks);
    } catch (err) {
      console.error("Failed to load tracks from IndexedDB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] radial-glow text-[#e0e0e0] font-sans selection:bg-[#FF5F1F]/20 selection:text-[#FF5F1F] relative">
      
      {/* Upper subtle glass header bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-md px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & title from Design HTML */}
          <div className="flex items-center gap-3">
            <img 
              src={soundBoxIcon} 
              alt="SoundBox Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-[#FF5F1F]/20 border border-white/10" 
            />
            <div>
              <h1 className="text-2xl font-light tracking-tighter text-white">
                SOUND<span className="text-[#FF5F1F] font-bold">BOX</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40">
                Hybrid Extraction & Playback Engine
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs based on design HTML */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-full border border-white/10">
            <button
              onClick={() => setActiveMode(AppMode.Play)}
              className={`px-6 py-2 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                activeMode === AppMode.Play
                  ? "bg-[#FF5F1F] text-black shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              PLAYBACK
            </button>
            <button
              onClick={() => setActiveMode(AppMode.Extract)}
              className={`px-6 py-2 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                activeMode === AppMode.Extract
                  ? "bg-[#FF5F1F] text-black shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              EXTRACTION
            </button>
          </div>

          {/* Actions / Settings Toggle with Orange highlight */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                showSettings
                  ? "bg-[#FF5F1F]/20 border-[#FF5F1F]/40 text-[#FF5F1F] glow-orange"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-[#FF5F1F] hover:bg-white/10"
              }`}
              title="バックアップ管理"
            >
              <Database className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Disc className="w-12 h-12 text-[#FF5F1F] animate-spin" />
            <p className="text-xs font-mono tracking-widest text-[#FF5F1F]/60">LOADING STORAGE_CACHE...</p>
          </div>
        ) : (
          <>
            {/* Conditional Mode Rendering */}
            {activeMode === AppMode.Extract ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <Extractor onRefresh={fetchTracks} />
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-[#FF5F1F] tracking-widest flex items-center gap-2 uppercase">
                    <HelpCircle className="w-4 h-4 text-[#FF5F1F]" />
                    <span>抽出モードの使い方・仕様</span>
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed font-sans opacity-80">
                    <li>YouTube動画の共有リンクまたはURLを貼り付けて「音声を抽出」をクリックします。</li>
                    <li>変換が完了すると曲名確認画面が表示されます。お好みの名前にクリーンアップしてキャッシュへ保存してください。</li>
                    <li>保存された音声は最高音質なM4A形式として安全にブラウザ内部にのみキャッシュ（保存）されます。パケットを消費せず、オフライン環境でも再生可能です。</li>
                  </ul>
                </div>
              </div>
            ) : (
              <Player
                tracks={tracks}
                onRefresh={fetchTracks}
                currentTrack={currentTrack}
                onSelectTrack={setCurrentTrack}
              />
            )}

            {/* Slide-out or collapsible Backup Management Panel */}
            {showSettings && (
              <div className="max-w-3xl mx-auto mt-6 pt-4 border-t border-white/10">
                <BackupRestore tracks={tracks} onRefresh={fetchTracks} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer matching Design HTML */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 text-[10px] font-mono text-white/30 gap-4">
        <div>SYSTEM_V2.1.2 // CACHE_STATUS: NOMINAL</div>
        <div className="flex gap-6">
          <span className="uppercase hover:text-[#FF5F1F] transition-colors cursor-pointer">Privacy</span>
          <span className="uppercase hover:text-[#FF5F1F] transition-colors cursor-pointer">Support</span>
          <span className="uppercase text-[#FF5F1F] font-bold">Premium Audio Engine</span>
        </div>
      </footer>

      {/* Floating global playback banner when in Extract Mode */}
      {currentTrack && activeMode === AppMode.Extract && (
        <div className="fixed bottom-4 right-4 max-w-sm w-full bg-[#050505]/95 backdrop-blur-md border border-[#FF5F1F]/30 p-4 rounded-xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-fade-in glow-orange">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#FF5F1F]/10 text-[#FF5F1F] flex items-center justify-center flex-shrink-0 animate-spin-slow">
              <Disc className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#FF5F1F] font-bold">NOW PLAYING</p>
              <p className="text-sm font-semibold text-slate-100 truncate mt-0.5">
                {currentTrack.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveMode(AppMode.Play)}
            className="bg-white hover:bg-[#FF5F1F] text-black text-xs font-bold py-1.5 px-3 rounded-lg flex-shrink-0 transition cursor-pointer"
          >
            PLAYER
          </button>
        </div>
      )}
    </div>
  );
}
