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
  EyeOff
} from "lucide-react";
import {
  getGitHubConfig,
  saveGitHubConfig,
  testGitHubConnection,
  fetchTracksFromGitHub,
  uploadTrackToGitHub,
  uploadSourceCodeToGitHub,
  isGitHubConfigured
} from "../lib/githubSync";

import { getTracks, saveTrack } from "../lib/db";
import { Track, GitHubConfig } from "../types";

interface GitHubSettingsProps {
  onRefresh: () => void;
}

export default function GitHubSettings({ onRefresh }: GitHubSettingsProps) {
  const [config, setConfig] = useState<GitHubConfig>(getGitHubConfig());
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
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
    setSourceProgress("ソースコードを準備中...");

    try {
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
    setSyncProgress("ローカルライブラリの楽曲を取得中...");

    try {
      const localTracks = await getTracks();
      if (localTracks.length === 0) {
        showMsg("同期するローカル楽曲がありません。", "info");
        setSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < localTracks.length; i++) {
        const track = localTracks[i];
        setSyncProgress(`[${i + 1}/${localTracks.length}] 「${track.title}」をGitHubへアップロード中...`);
        try {
          await uploadTrackToGitHub(track, config, (stepMsg) => {
            setSyncProgress(`[${i + 1}/${localTracks.length}] ${stepMsg}`);
          });
          successCount++;
        } catch (err: any) {
          console.error(`Failed to sync track ${track.id}:`, err);
          failCount++;
        }
      }

      showMsg(
        `一括同期完了: ${localTracks.length}曲中 ${successCount}曲をGitHubに正常保存しました！${
          failCount > 0 ? ` (${failCount}曲エラー)` : ""
        }`,
        successCount > 0 ? "success" : "error"
      );
      onRefresh();
    } catch (err: any) {
      showMsg("GitHub一括同期中にエラーが発生しました: " + err.message, "error");
    } finally {
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
    setFetchProgress("GitHubから楽曲一覧を取得中...");

    try {
      const cloudTracks = await fetchTracksFromGitHub(config, (stepMsg) => {
        setFetchProgress(stepMsg);
      });

      if (cloudTracks.length === 0) {
        showMsg("指定のGitHubフォルダに保存された楽曲データが見つかりませんでした。", "info");
        setFetching(false);
        return;
      }

      setFetchProgress(`検出された${cloudTracks.length}曲のデータをダウンロード・キャッシュ構築中...`);
      const existingTracks = await getTracks();
      let importedCount = 0;

      for (let i = 0; i < cloudTracks.length; i++) {
        const item = cloudTracks[i];
        const meta = item.meta;
        if (!meta || !meta.id) continue;

        // Skip if already in local DB
        const exists = existingTracks.some((t) => t.id === meta.id);
        if (exists) continue;

        setFetchProgress(`[${i + 1}/${cloudTracks.length}] 「${meta.title || meta.id}」の音声を取得中...`);

        if (item.audioBlobUrl) {
          try {
            const res = await fetch(item.audioBlobUrl);
            if (res.ok) {
              const blob = await res.blob();
              const newTrack: Track = {
                id: meta.id,
                title: meta.title || "GitHub Audio",
                artist: meta.artist || "不明なアーティスト",
                genre: meta.genre || "邦楽",
                youtubeUrl: meta.youtubeUrl || "",
                addedAt: meta.addedAt || Date.now(),
                blob: new Blob([blob], { type: "audio/mp4" }),
                githubUrl: item.audioBlobUrl,
              };
              await saveTrack(newTrack);
              importedCount++;
            }
          } catch (dlErr) {
            console.warn(`Failed to download audio for track ${meta.id}:`, dlErr);
          }
        }
      }

      showMsg(
        `クラウドからの復元・取り込み完了: GitHubから ${importedCount}曲を新たにローカルキャッシュへ登録しました！`,
        "success"
      );
      onRefresh();
    } catch (err: any) {
      showMsg("GitHubからの読み込み中にエラーが発生しました: " + err.message, "error");
    } finally {
      setFetching(false);
      setFetchProgress("");
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
                    クラウド上の楽曲をプレイヤーに読み込む
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
