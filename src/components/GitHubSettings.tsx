import React, { useState, useEffect } from "react";
import {
  Github,
  Key,
  Folder,
  User,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Sun
} from "lucide-react";
import {
  getGitHubConfig,
  saveGitHubConfig,
  testGitHubConnection,
  fetchTracksFromGitHub,
  uploadTrackToGitHub,
  uploadSourceCodeToGitHub,
  isGitHubConfigured,
  getGitHubRemoteTrackIds,
  fetchGitHubFileBlob,
  rebuildAndUploadMasterIndex
} from "../lib/githubSync";

import { getTracks, saveTrack, findDuplicateTrack, clearAllTracks } from "../lib/db";
import { Track, GitHubConfig } from "../types";
import { requestWakeLock, releaseWakeLock } from "../lib/wakeLock";

interface GitHubSettingsProps {
  onRefresh: () => void;
}

export default function GitHubSettings({ onRefresh }: GitHubSettingsProps) {
  const [config, setConfig] = useState<GitHubConfig>(getGitHubConfig());
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [skipDuplicatesOnPush, setSkipDuplicatesOnPush] = useState(true);
  const [forceOverwriteOnPull, setForceOverwriteOnPull] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<string>("");
  const [syncingSource, setSyncingSource] = useState(false);
  const [sourceProgress, setSourceProgress] = useState<string>("");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    saveGitHubConfig(config);
  }, [config]);

  const showMsg = (text: string, type: "success" | "error" | "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8000);
  };

  const handleSyncAppSource = async () => {
    if (!isGitHubConfigured(config)) {
      showMsg("先にGitHub PAT、ユーザー名、リポジトリ名を設定・保存してください。", "error");
      return;
    }

    setSyncingSource(true);
    setSourceProgress("スリープ防止を設定中...");
    await requestWakeLock();

    try {
      setSourceProgress("ソースコードを準備中...");
      // Collect current raw source code files via API to avoid Vite dev-server transformation
      const sourceFiles = [
        "package.json",
        "index.html",
        "vite.config.ts",
        "tsconfig.json",
        "src/App.tsx",
        "src/main.tsx",
        "src/types.ts",
        "src/index.css",
        "src/lib/db.ts",
        "src/lib/audioHelper.ts",
        "src/lib/backup.ts",
        "src/lib/githubSync.ts",
        "src/lib/wakeLock.ts",
        "src/components/Player.tsx",
        "src/components/Extractor.tsx",
        "src/components/BackupRestore.tsx",
        "src/components/GitHubSettings.tsx",
        ".github/workflows/deploy.yml",
        "README.md",
      ];

      const validFiles: Record<string, string> = {};
      for (const filePath of sourceFiles) {
        try {
          const res = await fetch(`/api/raw-source?file=${encodeURIComponent(filePath)}`);
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim()) {
              validFiles[filePath] = text;
            }
          }
        } catch (_) {}
      }

      // Target MP3-Extractor-Player for app source code sync
      const targetRepo = config.repo === "Extractor-Player-storage" ? "MP3-Extractor-Player" : (config.repo || "MP3-Extractor-Player");

      const res = await uploadSourceCodeToGitHub(validFiles, config, (msg) => {
        setSourceProgress(msg);
      }, targetRepo);

      showMsg(res.message, "success");
    } catch (err: any) {
      showMsg("ソースコードの同期中にエラーが発生しました: " + err.message, "error");
    } finally {
      await releaseWakeLock();
      setSyncingSource(false);
      setSourceProgress("");
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGitHubConnection(config);
      setTestResult(res);
      if (res.success) {
        showMsg("GitHubリポジトリへの接続を正常に確認しました！", "success");
      } else {
        showMsg(res.message, "error");
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "接続テスト中にエラーが発生しました。" });
      showMsg("接続テスト失敗: " + err.message, "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncAllToGitHub = async () => {
    if (!isGitHubConfigured(config)) {
      showMsg("先にGitHub PAT、ユーザー名、リポジトリ名を設定・保存してください。", "error");
      return;
    }

    setSyncing(true);
    setSyncProgress("スリープ防止を設定中...");
    await requestWakeLock();

    try {
      const localTracks = await getTracks();
      if (localTracks.length === 0) {
        showMsg("同期するローカル楽曲がありません。", "info");
        setSyncing(false);
        return;
      }

      setSyncProgress("GitHub上の既存データを確認中...");
      const remoteTrackIds = await getGitHubRemoteTrackIds(config);
      const remoteSet = new Set(remoteTrackIds);

      let successCount = 0;
      let skippedCount = 0;
      let failCount = 0;

      for (let i = 0; i < localTracks.length; i++) {
        const track = localTracks[i];
        
        // 重複スキップが有効かつ、すでにGitHub上に存在する場合
        if (skipDuplicatesOnPush && remoteSet.has(track.id)) {
          setSyncProgress(`[${i + 1}/${localTracks.length}] スキップ (GitHub保存済み): 「${track.title}」`);
          skippedCount++;
          // UIプログレスの更新を見やすくするため極小ディレイ
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }

        setSyncProgress(`[${i + 1}/${localTracks.length}] 「${track.title}」をGitHubへアップロード中...`);
        try {
          await uploadTrackToGitHub(track, config, (stepMsg) => {
            setSyncProgress(`[${i + 1}/${localTracks.length}] ${stepMsg}`);
          });
          remoteSet.add(track.id);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to sync track ${track.id}:`, err);
          failCount++;
        }
      }

      // 最後に全楽曲のマスターインデックス (tracks.json) をGitHubへ作成・上書き更新
      try {
        const allMetas = localTracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist || "不明なアーティスト",
          genre: t.genre || "邦楽",
          youtubeUrl: t.youtubeUrl || "",
          addedAt: t.addedAt || Date.now(),
          audioFileName: `${t.id}.m4a`,
          audioUrl: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch || "main"}/audio/${t.id}.m4a`
        }));
        await rebuildAndUploadMasterIndex(config, allMetas, (m) => setSyncProgress(m));
      } catch (indexErr) {
        console.warn("マスターインデックスの更新失敗:", indexErr);
      }

      showMsg(
        `一括同期完了: 全${localTracks.length}曲中 ${successCount}曲をGitHubに保管・更新しました！${
          skippedCount > 0 ? ` (${skippedCount}曲は同期済みのためスキップ)` : ""
        }${failCount > 0 ? ` (${failCount}曲エラー)` : ""}`,
        successCount > 0 || skippedCount > 0 ? "success" : "error"
      );
      onRefresh();
    } catch (err: any) {
      showMsg("GitHub一括同期中にエラーが発生しました: " + err.message, "error");
    } finally {
      await releaseWakeLock();
      setSyncing(false);
      setSyncProgress("");
    }
  };

  const handleFetchFromGitHub = async () => {
    if (!isGitHubConfigured(config)) {
      showMsg("先にGitHub PAT、ユーザー名、リポジトリ名を設定・保存してください。", "error");
      return;
    }

    setFetching(true);
    setFetchProgress("スリープ防止を設定中...");
    await requestWakeLock();

    try {
      const cloudTracks = await fetchTracksFromGitHub(config, (stepMsg) => {
        setFetchProgress(stepMsg);
      });

      if (cloudTracks.length === 0) {
        showMsg("指定のGitHubフォルダに保存された楽曲データが見つかりませんでした。", "info");
        setFetching(false);
        return;
      }

      const existingTracks = await getTracks();
      let importedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < cloudTracks.length; i++) {
        const item = cloudTracks[i];
        const meta = item.meta;

        if (!meta || !meta.id) {
          skippedCount++;
          continue;
        }

        if (!forceOverwriteOnPull) {
          const duplicate = findDuplicateTrack(
            {
              id: meta.id,
              title: meta.title || "GitHub Audio",
              artist: meta.artist,
              youtubeUrl: meta.youtubeUrl,
            },
            existingTracks
          );

          if (duplicate) {
            setFetchProgress(`[${i + 1}/${cloudTracks.length}] スキップ (ローカル保存済み): 「${meta.title || meta.id}」`);
            skippedCount++;
            await new Promise((r) => setTimeout(r, 10));
            continue;
          }
        }

        setFetchProgress(`[${i + 1}/${cloudTracks.length}] 「${meta.title || meta.id}」の音声をGitHubからダウンロード中...`);

        const audioFilePath = item.audioFilePath || `audio/${meta.id}.m4a`;

        try {
          // GitHub PATヘッダー & SHA付きで安全に音声Blobを取得 (プライベートリポジトリ＆1MB超のバイナリにも完全対応)
          let blob: Blob | null = null;
          try {
            blob = await fetchGitHubFileBlob(config, audioFilePath, item.audioFileSha);
          } catch (blobErr) {
            if (item.audioBlobUrl) {
              try {
                const res = await fetch(item.audioBlobUrl, {
                  headers: config.pat ? { Authorization: `Bearer ${config.pat.trim()}` } : {},
                });
                if (res.ok) {
                  blob = await res.blob();
                }
              } catch (_) {}
            }
          }

          // 1000バイト以上の有効な音声バイナリか検証 (404エラーテキスト等の破損ファイルの混入を遮断)
          if (blob && blob.size > 1000) {
            const newTrack: Track = {
              id: meta.id,
              title: meta.title || "GitHub Audio",
              artist: meta.artist || "不明なアーティスト",
              genre: meta.genre || "邦楽",
              youtubeUrl: meta.youtubeUrl || "",
              addedAt: meta.addedAt || Date.now(),
              blob: new Blob([blob], { type: "audio/mp4" }),
              githubUrl: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch || "main"}/${audioFilePath}`,
            };
            await saveTrack(newTrack);
            existingTracks.push(newTrack);
            importedCount++;
          } else {
            console.warn(`無効な音声データ(サイズ: ${blob?.size || 0} bytes)のためスキップ: ${meta.id}`);
            failedCount++;
          }
        } catch (dlErr) {
          console.warn(`Failed to download audio for track ${meta.id}:`, dlErr);
          failedCount++;
        }
      }

      showMsg(
        `クラウドからの取り込み完了: 全${cloudTracks.length}曲中 ${importedCount}曲をローカルへ保存・復元しました！${
          skippedCount > 0 ? ` (${skippedCount}曲は保存済みのためスキップ)` : ""
        }${failedCount > 0 ? ` (${failedCount}曲音声ダウンロード失敗)` : ""}`,
        importedCount > 0 || skippedCount > 0 ? "success" : "error"
      );
      onRefresh();
    } catch (err: any) {
      showMsg("GitHubからの読み込み中にエラーが発生しました: " + err.message, "error");
    } finally {
      await releaseWakeLock();
      setFetching(false);
      setFetchProgress("");
    }
  };

  const handleClearAndFetchFromGitHub = async () => {
    if (!window.confirm("ローカルに保存されている楽曲を全て削除し、GitHub上の全171+曲をキレイに再ダウンロードして完全同期しますか？")) {
      return;
    }
    try {
      setFetchProgress("ローカルデータベースをクリア中...");
      await clearAllTracks();
      onRefresh();
      setForceOverwriteOnPull(true);
      await handleFetchFromGitHub();
    } catch (err: any) {
      showMsg("ローカルデータベースのクリアに失敗しました: " + err.message, "error");
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FF5F1F]/10 rounded-xl text-[#FF5F1F]">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#FF5F1F] uppercase block mb-0.5">
              CLOUD STORAGE INTEGRATION
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              GitHub クラウドストレージ設定
            </h3>
          </div>
        </div>
        
        {isGitHubConfigured(config) ? (
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>設定完了</span>
          </span>
        ) : (
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            未設定
          </span>
        )}
      </div>

      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        SoundBoxの音声データ（.m4a）と曲情報（JSON）を、ご自身のGitHubリポジトリへ1曲ずつ直接アップロード・保管できます。
        iPhone（Safari）のメモリ制限によるZIPクラッシュを完全に回避し、クラウド上の自分専用音楽ライブラリとして活用できます。
      </p>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-mono border leading-relaxed ${
            message.type === "success"
              ? "bg-[#FF5F1F]/10 border-[#FF5F1F]/30 text-[#FF5F1F]"
              : message.type === "error"
              ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* GitHub Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PAT */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#FF5F1F]" />
              GitHub Personal Access Token (PAT)
            </span>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=SoundBox%20Music%20Storage"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#FF5F1F] hover:underline flex items-center gap-1 font-mono"
            >
              <span>PAT新規発行</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <div className="relative">
            <input
              type={showPat ? "text" : "password"}
              value={config.pat}
              onChange={(e) => setConfig({ ...config, pat: e.target.value })}
              placeholder="github_pat_xxxx または ghp_xxxx"
              className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 pl-4 pr-10 outline-none text-xs font-mono transition"
            />
            <button
              type="button"
              onClick={() => setShowPat(!showPat)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            ※スコープは <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300">repo</code> (Full control of private repositories) を許可してください。
          </p>
        </div>

        {/* Username / Owner */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#FF5F1F]" />
            GitHub ユーザー名 / オーナー名
          </label>
          <input
            type="text"
            value={config.owner}
            onChange={(e) => setConfig({ ...config, owner: e.target.value.trim() })}
            placeholder="例: your-username"
            className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          />
        </div>

        {/* Repository Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-[#FF5F1F]" />
              リポジトリ名
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfig({ ...config, repo: "Extractor-Player-storage", folder: "audio" })}
                className="text-[9px] bg-white/10 hover:bg-[#FF5F1F]/20 hover:text-[#FF5F1F] text-slate-300 px-2 py-0.5 rounded font-mono transition cursor-pointer"
                title="音楽データ保管用リポジトリにセット"
              >
                🎵 音声用
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, repo: "MP3-Extractor-Player", folder: "src" })}
                className="text-[9px] bg-white/10 hover:bg-[#FF5F1F]/20 hover:text-[#FF5F1F] text-slate-300 px-2 py-0.5 rounded font-mono transition cursor-pointer"
                title="アプリソースコード管理リポジトリにセット"
              >
                💻 アプリコード用
              </button>
            </div>
          </div>
          <input
            type="text"
            value={config.repo}
            onChange={(e) => setConfig({ ...config, repo: e.target.value.trim() })}
            placeholder="例: Extractor-Player-storage または MP3-Extractor-Player"
            className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          />
        </div>


        {/* Folder Path */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-[#FF5F1F]" />
            保存フォルダ名
          </label>
          <input
            type="text"
            value={config.folder || "audio"}
            onChange={(e) => setConfig({ ...config, folder: e.target.value.trim() || "audio" })}
            placeholder="audio"
            className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          />
          <p className="text-[10px] text-emerald-400 font-mono">
            ※ 音声データはリポジトリ内の <code className="bg-white/10 px-1 py-0.5 rounded text-emerald-300">audio/</code> フォルダへ統一してコミットされます。
          </p>
        </div>

        {/* Branch Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-[#FF5F1F]" />
            ブランチ名
          </label>
          <input
            type="text"
            value={config.branch}
            onChange={(e) => setConfig({ ...config, branch: e.target.value.trim() })}
            placeholder="main"
            className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          />
        </div>
      </div>

      {/* Auto Sync Toggle Option */}
      <div className="space-y-3">
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-200">抽出・追加時の自動GitHub同期</p>
            <p className="text-[10px] text-slate-400 font-sans">
              新しい曲を抽出・保存した際、バックグラウンドで自動的に指定のGitHubリポジトリへコミット保存します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfig({ ...config, autoSync: !config.autoSync })}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
              config.autoSync ? "bg-[#FF5F1F]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${
                config.autoSync ? "translate-x-6 bg-black font-bold" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>一括同期時に既存楽曲の送信をスキップ</span>
              {skipDuplicatesOnPush ? (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">スキップ有効</span>
              ) : (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">全件上書き更新</span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-sans">
              オンにするとGitHub上に既に存在するIDの曲をスキップします。オフにするとローカルの全曲をGitHubへ上書き再送信・更新します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSkipDuplicatesOnPush(!skipDuplicatesOnPush)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
              skipDuplicatesOnPush ? "bg-[#FF5F1F]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${
                skipDuplicatesOnPush ? "translate-x-6 bg-black font-bold" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>クラウド取り込み時にローカル楽曲を強制上書き</span>
              {forceOverwriteOnPull ? (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">強制全件取り込み</span>
              ) : (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">未保存曲のみ追加</span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 font-sans">
              オンにすると、既存曲の重複チェックをスキップし、GitHub上の全171+曲をローカルへ全件強制上書き同期・復元します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForceOverwriteOnPull(!forceOverwriteOnPull)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
              forceOverwriteOnPull ? "bg-[#FF5F1F]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${
                forceOverwriteOnPull ? "translate-x-6 bg-black font-bold" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] font-mono text-amber-300">
          <Sun className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>📱 一括同期・ダウンロード実行中は画面スリープ（ロック・消灯）を自動的に防止します。</span>
        </div>
      </div>

      {/* Connection Test & Status Feedback */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={handleTestConnection}
          disabled={testing || !isGitHubConfigured(config)}
          className="w-full sm:w-auto bg-white/10 hover:bg-white/20 disabled:opacity-40 text-slate-200 py-2.5 px-5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-white/10"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#FF5F1F]" />
              <span>接続テスト中...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-[#FF5F1F]" />
              <span>GitHub API 接続テスト</span>
            </>
          )}
        </button>

        {testResult && (
          <div
            className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate max-w-xs">{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Cloud Sync Operations Action Bar */}
      <div className="border-t border-white/10 pt-6 space-y-5">
        <h4 className="text-xs font-bold text-[#FF5F1F] tracking-widest uppercase">
          GitHub クラウド同期アクション
        </h4>

        {/* 1. App Source Code Sync to Existing Repo */}
        <div className="bg-white/5 border border-amber-500/30 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-[#FF5F1F]" />
              <span className="text-xs font-bold text-white">1. アプリソースコード（プログラム）を同期</span>
            </div>
            <span className="text-[10px] font-mono text-slate-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
              同期先: <strong className="text-amber-400 font-bold">MP3-Extractor-Player</strong>
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            AI Studioで更新・開発したこのアプリ本体のプログラムコード（TypeScript / React / CSS等）を、GitHubのリポジトリ（<code className="bg-black/50 px-1 py-0.5 rounded text-amber-300 font-mono">MP3-Extractor-Player</code>）へ直接コミット・更新同期します。
          </p>
          <button
            onClick={handleSyncAppSource}
            disabled={syncingSource || syncing || fetching || !isGitHubConfigured(config)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF5F1F] to-amber-500 hover:from-amber-500 hover:to-[#FF5F1F] disabled:opacity-40 text-black py-3 px-4 rounded-xl font-bold text-xs transition cursor-pointer shadow-md"
          >
            {syncingSource ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>{sourceProgress || "ソースコードを同期中..."}</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-black" />
                <span>「MP3-Extractor-Player」へアプリコードを直接コミット・同期</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Audio Track Data Sync */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              🎵 2. 抽出済み音楽データ・楽曲のバックアップ同期
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              設定中のリポジトリ: <strong className="text-slate-200">{config.repo || "Extractor-Player-storage"}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload all to GitHub */}
            <button
              onClick={handleSyncAllToGitHub}
              disabled={syncingSource || syncing || fetching || !isGitHubConfigured(config)}
              className="flex flex-col items-center justify-center gap-2 bg-[#FF5F1F] hover:bg-amber-500 disabled:opacity-40 text-black p-4 rounded-2xl font-bold transition cursor-pointer shadow-lg shadow-[#FF5F1F]/15"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-mono">{syncProgress || "同期中..."}</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    <span>全楽曲を「{config.repo || "保管用リポ"}」へ同期</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80 font-sans">
                    IndexedDBの音楽を保管庫へバックアップ
                  </span>
                </>
              )}
            </button>

            {/* Fetch tracks from GitHub */}
            <button
              onClick={handleFetchFromGitHub}
              disabled={syncingSource || syncing || fetching || !isGitHubConfigured(config)}
              className="flex flex-col items-center justify-center gap-2 bg-white hover:bg-[#FF5F1F] hover:text-black disabled:opacity-40 text-black p-4 rounded-2xl font-bold transition cursor-pointer shadow-lg"
            >
              {fetching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-mono">{fetchProgress || "取得中..."}</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <DownloadCloud className="w-5 h-5" />
                    <span>「{config.repo || "保管用リポ"}」から全楽曲を取得</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80 font-sans">
                    クラウド上の楽曲をプレイヤーに追加読み込み
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Clean Reset & Full Re-sync Button */}
          <button
            onClick={handleClearAndFetchFromGitHub}
            disabled={syncingSource || syncing || fetching || !isGitHubConfigured(config)}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/40 hover:text-black disabled:opacity-40 text-rose-300 py-3.5 px-4 rounded-2xl font-bold text-xs transition cursor-pointer mt-3 shadow-md"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{fetchProgress || "全171曲を再同期中..."}</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>🔥 ローカルを全消去してGitHubから全曲再同期（171+曲をキレイに完全復元）</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
