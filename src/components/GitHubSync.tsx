import React, { useState, useEffect } from "react";
import {
  Github,
  Key,
  FolderGit2,
  GitBranch,
  CheckCircle2,
  XCircle,
  Loader2,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Music,
  Check,
  AlertCircle
} from "lucide-react";
import { Track } from "../types";
import {
  GitHubConfig,
  getGitHubConfig,
  saveGitHubConfig,
  clearGitHubConfig,
  testGitHubConnection,
  syncAllTracksToGitHub,
  syncSingleTrackToGitHub,
  downloadTracksFromGitHub
} from "../lib/githubSync";

interface GitHubSyncProps {
  tracks: Track[];
  onRefresh: () => void;
}

export default function GitHubSync({ tracks, onRefresh }: GitHubSyncProps) {
  const [config, setConfig] = useState<GitHubConfig>({
    pat: "",
    owner: "",
    repo: "",
    branch: "main",
    folderPath: "audio",
  });
  const [showPat, setShowPat] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  // Sync operations state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);

  const [singleUploadingId, setSingleUploadingId] = useState<string | null>(null);

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Guide accordion state
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const saved = getGitHubConfig();
    if (saved) {
      setConfig(saved);
      setIsSaved(true);
    }
  }, []);

  const showMsg = (text: string, type: "success" | "error" | "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGitHubConnection(config);
      setTestResult({
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        saveGitHubConfig(config);
        setIsSaved(true);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "テスト実行中にエラーが発生しました: " + (err.message || ""),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    if (!config.pat || !config.owner || !config.repo) {
      showMsg("PAT、ユーザー名、リポジトリ名をすべて入力してください。", "error");
      return;
    }
    saveGitHubConfig(config);
    setIsSaved(true);
    showMsg("GitHub連携設定を保存しました。接続テストを実行して動作を確認できます。", "success");
  };

  const handleClearConfig = () => {
    clearGitHubConfig();
    setConfig({
      pat: "",
      owner: "",
      repo: "",
      branch: "main",
      folderPath: "audio",
    });
    setIsSaved(false);
    setTestResult(null);
    showMsg("GitHub連携設定を消去しました。", "info");
  };

  // Upload all tracks sequentially 1-by-1
  const handleUploadAll = async () => {
    if (!isSaved) {
      showMsg("先にGitHub設定を入力して保存（または接続テスト）してください。", "error");
      return;
    }
    if (tracks.length === 0) {
      showMsg("同期する曲がローカルライブラリにありません。", "info");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: tracks.length, title: "アップロード準備中..." });

    try {
      const res = await syncAllTracksToGitHub(config, tracks, (current, total, title) => {
        setUploadProgress({ current, total, title });
      });

      showMsg(
        `クラウド同期完了！ ${res.totalCount}曲中 ${res.successCount}曲をGitHubリポジトリ (${config.owner}/${config.repo}) へ順次コミット保存しました。`,
        "success"
      );
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showMsg("同期に失敗しました: " + (err.message || "エラーが発生しました"), "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Upload single track 1-by-1
  const handleSingleUpload = async (track: Track) => {
    if (!isSaved) {
      showMsg("先にGitHub設定を入力して保存してください。", "error");
      return;
    }

    setSingleUploadingId(track.id);
    try {
      await syncSingleTrackToGitHub(config, track);
      showMsg(`「${track.title}」をGitHubへ直接コミット保存しました！`, "success");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showMsg(`「${track.title}」の保存に失敗しました: ${err.message}`, "error");
    } finally {
      setSingleUploadingId(null);
    }
  };

  // Restore/Download from GitHub
  const handleDownloadAll = async () => {
    if (!isSaved) {
      showMsg("先にGitHub設定を入力して保存してください。", "error");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: 0, title: "メタデータ取得中..." });

    try {
      const res = await downloadTracksFromGitHub(config, (current, total, title) => {
        setDownloadProgress({ current, total, title });
      });

      showMsg(
        `復元完了！ GitHubリポジトリから ${res.totalCount}曲中 ${res.successCount}曲を端末内(IndexedDB)へ同期・取り込みました！`,
        "success"
      );
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showMsg("ダウンロード・復元に失敗しました: " + (err.message || "エラーが発生しました"), "error");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF5F1F]/10 border border-[#FF5F1F]/30 text-[#FF5F1F] flex items-center justify-center flex-shrink-0">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              GitHub クラウド同期 (個別1曲アップロード)
              {isSaved && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  接続可
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              1曲単位でGitHubへ個別に直接保存・復元。iOS Safari等のメモリクラッシュを完全に回避します。
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1.5 text-xs text-[#FF5F1F] hover:text-amber-400 font-mono transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>PATの取得方法ガイド</span>
        </button>
      </div>

      {/* Guide Box (Accordion) */}
      {showHelp && (
        <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <h4 className="text-xs font-bold text-[#FF5F1F] tracking-wider uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FF5F1F]" />
            <span>GitHub Personal Access Token (PAT) 作成手順</span>
          </h4>
          <ol className="list-decimal pl-5 space-y-2 font-sans text-slate-300 opacity-90">
            <li>
              GitHubにログインし、右上アイコン &gt; <strong>Settings</strong> &gt; <strong>Developer Settings</strong> &gt; <strong>Personal access tokens (Tokens classic)</strong> へ移動します。
            </li>
            <li>
              <strong>Generate new token (classic)</strong> をクリックします。
            </li>
            <li>
              Noteに「SoundBox Sync」と入力し、<strong>repo</strong> スコープ（リポジトリ読み書き権限）にチェックを入れます。
            </li>
            <li>
              トークンを生成し、表示された文字列（例: <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-[#FF5F1F]">ghp_xxxx...</code>）をコピーして以下のPAT欄に貼り付けます。
            </li>
            <li>
              同期用のGitHubリポジトリ（プライベート推奨）を事前に1つ作成しておいてください。
            </li>
          </ol>
          <div className="pt-2">
            <a
              href="https://github.com/settings/tokens/new?description=SoundBox%20Sync&scopes=repo"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#FF5F1F] font-bold hover:underline"
            >
              <span>GitHubトークン作成ページを開く</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Notice/Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-mono border leading-relaxed ${
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

      {/* GitHub Settings Form */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 sm:p-6 space-y-5">
        <h4 className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
          <Key className="w-4 h-4 text-[#FF5F1F]" />
          <span>GitHub 連携認証設定</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Owner */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">ユーザー名 (Owner)</label>
            <input
              type="text"
              placeholder="例: octocat"
              value={config.owner}
              onChange={(e) => setConfig({ ...config, owner: e.target.value })}
              className="w-full bg-white/5 border border-white/10 focus:border-[#FF5F1F] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition font-mono"
            />
          </div>

          {/* Repository Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">リポジトリ名 (Repository)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="例: soundbox-audio-backup"
                value={config.repo}
                onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                className="w-full bg-white/5 border border-white/10 focus:border-[#FF5F1F] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition font-mono pl-9"
              />
              <FolderGit2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">ブランチ名 (Branch)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="main"
                value={config.branch}
                onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                className="w-full bg-white/5 border border-white/10 focus:border-[#FF5F1F] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition font-mono pl-9"
              />
              <GitBranch className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Folder Path */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">保存フォルダ名 (Folder Path)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="例: audio または tracks"
                value={config.folderPath || "audio"}
                onChange={(e) => setConfig({ ...config, folderPath: e.target.value })}
                className="w-full bg-white/5 border border-white/10 focus:border-[#FF5F1F] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition font-mono pl-9"
              />
              <FolderGit2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* PAT */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">Personal Access Token (PAT)</label>
            <div className="relative">
              <input
                type={showPat ? "text" : "password"}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={config.pat}
                onChange={(e) => setConfig({ ...config, pat: e.target.value })}
                className="w-full bg-white/5 border border-white/10 focus:border-[#FF5F1F] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPat(!showPat)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Buttons: Test Connection & Save */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer font-mono"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF5F1F]" />
                  <span>接続テスト中...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#FF5F1F]" />
                  <span>接続テスト</span>
                </>
              )}
            </button>

            <button
              onClick={handleSaveConfig}
              className="flex items-center gap-2 bg-[#FF5F1F] hover:bg-amber-500 text-black py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer font-mono shadow-md shadow-[#FF5F1F]/20"
            >
              <Check className="w-4 h-4" />
              <span>設定を保存</span>
            </button>
          </div>

          {isSaved && (
            <button
              onClick={handleClearConfig}
              className="text-xs text-slate-500 hover:text-rose-400 transition font-mono cursor-pointer"
            >
              設定をクリア
            </button>
          )}
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-mono border flex items-start gap-2.5 leading-relaxed animate-fade-in ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            )}
            <div>{testResult.message}</div>
          </div>
        )}
      </div>

      {/* Cloud Sync Actions */}
      <div className="space-y-4 pt-2 border-t border-white/10">
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold text-[#FF5F1F] tracking-wider uppercase flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#FF5F1F]" />
            <span>1曲ずつのクラウド同期・一括処理</span>
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            大量の曲があってもメモリを圧迫せず、GitHubリポジトリ（<code className="font-mono text-slate-300">tracks/</code> ディレクトリ）へ1曲ずつ個別に自動コミットされます。
          </p>
        </div>

        {/* Big Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sync All Button */}
          <button
            onClick={handleUploadAll}
            disabled={isUploading || isDownloading || !isSaved}
            className="flex flex-col items-center justify-center gap-1.5 bg-[#FF5F1F] hover:bg-amber-500 disabled:opacity-40 text-black py-4 px-5 rounded-2xl font-bold transition cursor-pointer shadow-lg shadow-[#FF5F1F]/20"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">
                  {uploadProgress
                    ? `[${uploadProgress.current}/${uploadProgress.total}] 同期中...`
                    : "同期中..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <UploadCloud className="w-5 h-5" />
                <span>ライブラリ全曲を1曲ずつGitHubへ同期</span>
              </div>
            )}
            <span className="text-[10px] font-mono opacity-80 font-normal">
              1曲ごとに個別コミット + metadata.json自動更新
            </span>
          </button>

          {/* Download Restore Button */}
          <button
            onClick={handleDownloadAll}
            disabled={isUploading || isDownloading || !isSaved}
            className="flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-[#FF5F1F] hover:text-black disabled:opacity-40 text-black py-4 px-5 rounded-2xl font-bold transition cursor-pointer shadow-lg"
          >
            {isDownloading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">
                  {downloadProgress
                    ? `[${downloadProgress.current}/${downloadProgress.total}] 復元中...`
                    : "取得中..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <DownloadCloud className="w-5 h-5" />
                <span>GitHubから全曲をダウンロード復元</span>
              </div>
            )}
            <span className="text-[10px] font-mono opacity-80 font-normal">
              GitHubのmetadata.jsonから端末(IndexedDB)へ直接同期
            </span>
          </button>
        </div>

        {/* Progress Display */}
        {uploadProgress && (
          <div className="bg-white/5 border border-[#FF5F1F]/30 rounded-2xl p-4 space-y-2 animate-fade-in">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#FF5F1F] font-bold">1曲ずつクラウドへ送信中...</span>
              <span className="text-slate-300">
                {uploadProgress.current} / {uploadProgress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF5F1F] transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / Math.max(1, uploadProgress.total)) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate">
              処理中: {uploadProgress.title}
            </p>
          </div>
        )}

        {downloadProgress && (
          <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-4 space-y-2 animate-fade-in">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold">GitHubから音声を取得・復元中...</span>
              <span className="text-slate-300">
                {downloadProgress.current} / {downloadProgress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(downloadProgress.current / Math.max(1, downloadProgress.total)) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate">
              処理中: {downloadProgress.title}
            </p>
          </div>
        )}
      </div>

      {/* Individual Track Sync List */}
      {tracks.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
              <Music className="w-4 h-4 text-[#FF5F1F]" />
              <span>個別トラック同期一覧 ({tracks.length}曲)</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">1曲ずつピンポイント同期</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="bg-white/5 border border-white/5 hover:border-white/15 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-200 truncate">{track.title}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {track.artist || "Unknown Artist"} • {new Date(track.addedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleSingleUpload(track)}
                  disabled={singleUploadingId === track.id || isUploading || !isSaved}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-[#FF5F1F] hover:text-black disabled:opacity-40 text-slate-200 py-1.5 px-3 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer flex-shrink-0"
                >
                  {singleUploadingId === track.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>送信中...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>クラウド保存</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
