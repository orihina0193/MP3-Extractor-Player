import React, { useState, useRef } from "react";
import { Youtube, Search, ArrowRight, CheckCircle2, AlertCircle, Loader2, Music4, X } from "lucide-react";
import { saveTrack, getTracks } from "../lib/db";
import { Track } from "../types";
import { detectMimeType } from "../lib/audioHelper";

interface ExtractorProps {
  onRefresh: () => void;
}

export default function Extractor({ onRefresh }: ExtractorProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // Staging extracted track data before saving
  const [stagedData, setStagedData] = useState<{
    id: string;
    title: string;
    artist?: string;
    youtubeUrl: string;
    streamUrl: string;
  } | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedArtist, setEditedArtist] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedGenre, setEditedGenre] = useState<"邦楽" | "洋楽">("邦楽");
  const format = "mp3";
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to extract YouTube video ID
  const getYoutubeId = (youtubeUrl: string): string | null => {
    const cleanUrl = youtubeUrl.trim();
    
    // 1. Check for youtu.be
    if (cleanUrl.includes("youtu.be/")) {
      const parts = cleanUrl.split("youtu.be/");
      if (parts[1]) {
        const idPart = parts[1].split(/[?#&]/)[0];
        if (idPart.length === 11) return idPart;
      }
    }
    
    // 2. Check for watch?v= or shorts/ or live/ or embed/ or v/
    const match = cleanUrl.match(/(?:v=|shorts\/|live\/|embed\/|v\/)([^"&?\/\s]{11})/);
    if (match && match[1]) {
      return match[1];
    }
    
    // 3. Fallback regex
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const matchFallback = cleanUrl.match(regExp);
    if (matchFallback && matchFallback[2] && matchFallback[2].length === 11) {
      return matchFallback[2];
    }
    
    return null;
  };

  // Parse YouTube title into title and artist
  const parseTitleAndArtist = (rawTitle: string): { title: string; artist: string } => {
    let clean = rawTitle
      .replace(/\[(MV|Music Video|Official\s*Video|公式|Audio|Official\s*Audio)\]/gi, "")
      .replace(/\((MV|Music Video|Official\s*Video|公式|Audio|Official\s*Audio)\)/gi, "")
      .replace(/【(MV|Music Video|Official\s*Video|公式)】/gi, "")
      .trim();

    const separators = [" - ", " — ", " / ", " | "];
    for (const sep of separators) {
      if (clean.includes(sep)) {
        const parts = clean.split(sep);
        if (parts.length >= 2) {
          const part1 = parts[0].trim();
          const part2 = parts.slice(1).join(sep).trim();
          return { artist: part1, title: part2 };
        }
      }
    }
    return { title: clean, artist: "" };
  };

  const handleSwap = () => {
    const temp = editedTitle;
    setEditedTitle(editedArtist);
    setEditedArtist(temp);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setStagedData(null);
    
    const isSuno = url.includes("suno.com");
    const maxRetries = 3;
    let attempt = 0;
    
    // Create new AbortController for this session
    const controller = new AbortController();
    abortControllerRef.current = controller;

    while (attempt < maxRetries) {
      attempt++;
      setStep(
        isSuno 
          ? `Suno楽曲の情報を取得しています... ${attempt > 1 ? `(自動リトライ中 ${attempt}/${maxRetries}回目)` : ""}`
          : `YouTube動画の情報を取得しています... ${attempt > 1 ? `(自動リトライ中 ${attempt}/${maxRetries}回目)` : ""}`
      );

      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: url.trim(), format }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `エラーが発生しました（コード: ${response.status}）`);
        }

        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        setStep(isSuno ? "Sunoの音楽データを準備中..." : `サーバー側で${format.toUpperCase()}音声ストリームを変換・生成中...`);
        const data = await response.json();

        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        if (!data.success || !data.streamUrl) {
          throw new Error(data.error || "音声ファイルの生成に失敗しました。");
        }

        const videoId = isSuno ? `suno_${Date.now()}` : (getYoutubeId(url.trim()) || `audio_${Date.now()}`);
        
        let title = "";
        let artist = "";
        
        if (data.artist) {
          title = data.title;
          artist = data.artist;
        } else {
          const parsed = parseTitleAndArtist(data.title || "YouTube Audio Track");
          title = parsed.title;
          artist = parsed.artist;
        }

        // Stage for title verification / editing
        setStagedData({
          id: videoId,
          title: title,
          artist: artist,
          youtubeUrl: url.trim(),
          streamUrl: data.streamUrl,
        });
        setEditedTitle(title);
        setEditedArtist(artist);
        setStep("音楽の解析が完了しました！タイトルとアーティスト名を確認して保存してください。");
        break; // Success! Exit retry loop.

      } catch (err: any) {
        if (err.name === "AbortError" || controller.signal.aborted) {
          setError("抽出処理がキャンセルされました。");
          setStep("");
          break; // Stop immediately on cancel
        }

        console.warn(`Attempt ${attempt} failed:`, err);
        
        if (attempt >= maxRetries) {
          setError(err.message || "予期せぬエラーが発生しました。時間を置いて再度お試しください。");
          setStep("");
        } else {
          // Alert user and wait before retry, support abort during wait
          setStep(`サーバーが応答しません。1.5秒後に自動リトライします... (${attempt}/${maxRetries}回目)`);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, 1500);
            controller.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }
      }
    }

    abortControllerRef.current = null;
    setLoading(false);
  };

  const handleSave = async () => {
    if (!stagedData) return;

    setIsSaving(true);
    setError(null);

    const maxSaveRetries = 3;
    let saveAttempt = 0;
    let success = false;
    let blobToSave: Blob | null = null;

    // Create abort controller for downloading phase
    const controller = new AbortController();
    abortControllerRef.current = controller;

    while (saveAttempt < maxSaveRetries) {
      saveAttempt++;
      setStep(
        `高音質な${format.toUpperCase()}ファイルをダウンロード中... ` +
        (saveAttempt > 1 ? `(自動リトライ中 ${saveAttempt}/${maxSaveRetries}回目)` : "")
      );

      try {
        const fileRes = await fetch(stagedData.streamUrl, {
          signal: controller.signal
        });

        if (!fileRes.ok) {
          throw new Error(`音声ファイルのダウンロードに失敗しました（ステータス: ${fileRes.status}）`);
        }

        const rawBlob = await fileRes.blob();

        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        // Check if the returned data is HTML or JSON error instead of audio binary
        const contentType = fileRes.headers.get("content-type") || rawBlob.type || "";
        if (contentType.includes("html") || contentType.includes("json") || contentType.includes("text")) {
          const text = await rawBlob.text().catch(() => "");
          console.error("Downloaded non-audio data. Content-Type:", contentType, "Content:", text);
          try {
            const parsed = JSON.parse(text);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (_) {}
          throw new Error("音声データの取得に失敗しました。変換サーバーからエラーが返されました。");
        }

        // Verify size
        if (rawBlob.size < 50000) {
          throw new Error("取得された音声ファイルが極端に小さい（50KB未満）ため、不完全または破損しています。");
        }

        // Detect and use correct MIME type
        const detectedType = await detectMimeType(rawBlob);
        blobToSave = new Blob([rawBlob], { type: detectedType });
        success = true;
        break; // Success! Exit loop

      } catch (err: any) {
        if (err.name === "AbortError" || controller.signal.aborted) {
          setError("ダウンロードがキャンセルされました。");
          setStep("");
          setIsSaving(false);
          abortControllerRef.current = null;
          return;
        }

        console.warn(`Download attempt ${saveAttempt} failed:`, err);

        if (saveAttempt >= maxSaveRetries) {
          setError(err.message || "音声ファイルのダウンロードに失敗しました。時間を置いて再度お試しください。");
          setStep("");
        } else {
          setStep(`ダウンロードに失敗しました。1.5秒後に自動リトライします... (${saveAttempt}/${maxSaveRetries}回目)`);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, 1500);
            controller.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }
      }
    }

    abortControllerRef.current = null;

    if (!success || !blobToSave) {
      setIsSaving(false);
      return;
    }

    try {
      setStep("ブラウザの安全なキャッシュ（IndexedDB）に書き込み中...");

      const existingTracks = await getTracks();
      const isDuplicate = existingTracks.some((t) => t.id === stagedData.id);
      const trackId = isDuplicate ? `${stagedData.id}_${Date.now()}` : stagedData.id;

      const newTrack: Track = {
        id: trackId,
        title: editedTitle.trim() || stagedData.title,
        artist: editedArtist.trim() || stagedData.artist || "不明なアーティスト",
        genre: editedGenre,
        youtubeUrl: stagedData.youtubeUrl,
        blob: blobToSave,
        addedAt: Date.now(),
      };

      await saveTrack(newTrack);

      setStep("");
      setUrl("");
      setStagedData(null);
      setEditedTitle("");
      setEditedArtist("");
      onRefresh();
      
      // Temporary success feedback
      alert("ブラウザキャッシュに保存されました！「再生モード」でいつでも再生可能です。");

    } catch (err: any) {
      console.error(err);
      setError("キャッシュ保存に失敗しました: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FF5F1F]/10 rounded-xl text-[#FF5F1F]">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#FF5F1F] uppercase block mb-0.5">SOURCE INPUT</span>
            <h2 className="text-lg font-bold text-white tracking-tight">YouTube / Suno から高音質音声を抽出</h2>
          </div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F1F] glow-orange-dot animate-pulse"></div>
      </div>

      <form onSubmit={handleExtract} className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="YouTubeの動画リンク、またはSunoの楽曲リンク（https://suno.com/...）"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading || isSaving}
              className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-4 pl-12 pr-4 outline-none text-base md:text-sm transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isSaving || !url.trim()}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-[#FF5F1F] hover:text-black transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>サーバー処理中...</span>
              </>
            ) : (
              <>
                <span>音声を MP3 に変換</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Progress & Info State */}
      {(loading || step) && (
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {(loading || isSaving) ? (
              <Loader2 className="w-5 h-5 text-[#FF5F1F] animate-spin mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#FF5F1F] mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-bold text-[#FF5F1F] tracking-wider uppercase">
                {loading || isSaving ? "CONVERTING AUDIO" : "CONVERSION SUCCESSFUL"}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed font-mono break-all">{step}</p>
            </div>
          </div>
          {(loading || isSaving) && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded-lg border border-rose-500/20 transition active:scale-95 cursor-pointer flex-shrink-0"
              title="キャンセル"
            >
              <X className="w-3.5 h-3.5" />
              <span>キャンセル</span>
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">Extraction Failed</p>
            <p className="text-xs text-rose-300 leading-relaxed font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Staged Data Preview & Save Confirmation */}
      {stagedData && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FF5F1F]/20 rounded-xl text-[#FF5F1F] flex-shrink-0 font-bold uppercase">
              {format}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF5F1F] bg-[#FF5F1F]/15 px-2.5 py-0.5 rounded-full">
                READY TO CACHE
              </span>
              <h4 className="text-sm font-medium text-slate-200 truncate mt-1.5 font-mono">
                {stagedData.title}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block">
                曲名
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                disabled={isSaving}
                className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-lg py-3 px-4 outline-none text-base md:text-sm transition font-medium"
                placeholder="曲名を入力してください"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block">
                  アーティスト名
                </label>
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={isSaving}
                  className="text-[9px] text-[#FF5F1F] hover:underline flex items-center gap-1 cursor-pointer"
                  title="曲名とアーティスト名を入れ替える"
                >
                  ⇄ 入れ替え
                </button>
              </div>
              <input
                type="text"
                value={editedArtist}
                onChange={(e) => setEditedArtist(e.target.value)}
                disabled={isSaving}
                className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-lg py-3 px-4 outline-none text-base md:text-sm transition font-medium"
                placeholder="アーティスト名を入力してください"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block">
                ジャンル選択
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-lg border border-white/10 h-[46px] items-center">
                <button
                  type="button"
                  onClick={() => setEditedGenre("邦楽")}
                  disabled={isSaving}
                  className={`h-full rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    editedGenre === "邦楽"
                      ? "bg-[#FF5F1F] text-black shadow font-extrabold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  邦楽 (J-POP)
                </button>
                <button
                  type="button"
                  onClick={() => setEditedGenre("洋楽")}
                  disabled={isSaving}
                  className={`h-full rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    editedGenre === "洋楽"
                      ? "bg-[#FF5F1F] text-black shadow font-extrabold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  洋楽 (Western)
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !editedTitle.trim()}
            className="w-full bg-[#FF5F1F] hover:bg-[#FF5F1F]/80 text-black font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>ローカルに書き込み中...</span>
              </>
            ) : (
              <span>この内容で安全にキャッシュ保存</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
