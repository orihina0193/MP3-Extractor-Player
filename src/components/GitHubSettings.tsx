import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=1f31155a"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=1f31155a"; const useState = __vite__cjsImport1_react["useState"]; const useEffect = __vite__cjsImport1_react["useEffect"];
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
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff
} from "/node_modules/.vite/deps/lucide-react.js?v=1f31155a";
import {
  getGitHubConfig,
  saveGitHubConfig,
  testGitHubConnection,
  fetchTracksFromGitHub,
  uploadTrackToGitHub,
  uploadSourceCodeToGitHub,
  isGitHubConfigured
} from "/src/lib/githubSync.ts";
import { getTracks, saveTrack } from "/src/lib/db.ts";
export default function GitHubSettings({ onRefresh }) {
  const [config, setConfig] = useState(getGitHubConfig());
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [syncingSource, setSyncingSource] = useState(false);
  const [sourceProgress, setSourceProgress] = useState("");
  const [message, setMessage] = useState(null);
  useEffect(() => {
    saveGitHubConfig(config);
  }, [config]);
  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8e3);
  };
  const handleSyncAppSource = async () => {
    if (!isGitHubConfigured(config)) {
      showMsg("先にGitHub PAT、ユーザー名、リポジトリ名を設定・保存してください。", "error");
      return;
    }
    setSyncingSource(true);
    setSourceProgress("ソースコードを準備中...");
    try {
      const filesMap = {
        "package.json": await fetch("/package.json").then((r) => r.text()).catch(() => ""),
        "index.html": await fetch("/index.html").then((r) => r.text()).catch(() => ""),
        "vite.config.ts": await fetch("/vite.config.ts").then((r) => r.text()).catch(() => ""),
        "tsconfig.json": await fetch("/tsconfig.json").then((r) => r.text()).catch(() => ""),
        "src/App.tsx": await fetch("/src/App.tsx").then((r) => r.text()).catch(() => ""),
        "src/main.tsx": await fetch("/src/main.tsx").then((r) => r.text()).catch(() => ""),
        "src/types.ts": await fetch("/src/types.ts").then((r) => r.text()).catch(() => ""),
        "src/index.css": await fetch("/src/index.css").then((r) => r.text()).catch(() => ""),
        "src/lib/db.ts": await fetch("/src/lib/db.ts").then((r) => r.text()).catch(() => ""),
        "src/lib/audioHelper.ts": await fetch("/src/lib/audioHelper.ts").then((r) => r.text()).catch(() => ""),
        "src/lib/backup.ts": await fetch("/src/lib/backup.ts").then((r) => r.text()).catch(() => ""),
        "src/lib/githubSync.ts": await fetch("/src/lib/githubSync.ts").then((r) => r.text()).catch(() => ""),
        "src/components/Player.tsx": await fetch("/src/components/Player.tsx").then((r) => r.text()).catch(() => ""),
        "src/components/Extractor.tsx": await fetch("/src/components/Extractor.tsx").then((r) => r.text()).catch(() => ""),
        "src/components/BackupRestore.tsx": await fetch("/src/components/BackupRestore.tsx").then((r) => r.text()).catch(() => ""),
        "src/components/GitHubSettings.tsx": await fetch("/src/components/GitHubSettings.tsx").then((r) => r.text()).catch(() => "")
      };
      const validFiles = {};
      for (const [k, v] of Object.entries(filesMap)) {
        if (v && v.trim()) validFiles[k] = v;
      }
      const targetRepo = config.repo === "Extractor-Player-storage" ? "MP3-Extractor-Player" : config.repo || "MP3-Extractor-Player";
      const res = await uploadSourceCodeToGitHub(validFiles, config, (msg) => {
        setSourceProgress(msg);
      }, targetRepo);
      showMsg(res.message, "success");
    } catch (err) {
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
    } catch (err) {
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
        } catch (err) {
          console.error(`Failed to sync track ${track.id}:`, err);
          failCount++;
        }
      }
      showMsg(
        `一括同期完了: ${localTracks.length}曲中 ${successCount}曲をGitHubに正常保存しました！${failCount > 0 ? ` (${failCount}曲エラー)` : ""}`,
        successCount > 0 ? "success" : "error"
      );
      onRefresh();
    } catch (err) {
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
        const exists = existingTracks.some((t) => t.id === meta.id);
        if (exists) continue;
        setFetchProgress(`[${i + 1}/${cloudTracks.length}] 「${meta.title || meta.id}」の音声を取得中...`);
        if (item.audioBlobUrl) {
          try {
            const res = await fetch(item.audioBlobUrl);
            if (res.ok) {
              const blob = await res.blob();
              const newTrack = {
                id: meta.id,
                title: meta.title || "GitHub Audio",
                artist: meta.artist || "不明なアーティスト",
                genre: meta.genre || "邦楽",
                youtubeUrl: meta.youtubeUrl || "",
                addedAt: meta.addedAt || Date.now(),
                blob: new Blob([blob], { type: "audio/mp4" }),
                githubUrl: item.audioBlobUrl
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
    } catch (err) {
      showMsg("GitHubからの読み込み中にエラーが発生しました: " + err.message, "error");
    } finally {
      setFetching(false);
      setFetchProgress("");
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between border-b border-white/5 pb-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "p-2.5 bg-[#FF5F1F]/10 rounded-xl text-[#FF5F1F]", children: /* @__PURE__ */ jsxDEV(Github, { className: "w-6 h-6" }, void 0, false, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 259,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 258,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-bold tracking-widest text-[#FF5F1F] uppercase block mb-0.5", children: "CLOUD STORAGE INTEGRATION" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 262,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h3", { className: "text-lg font-bold text-white tracking-tight", children: "GitHub クラウドストレージ設定" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 265,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 261,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 257,
        columnNumber: 9
      }, this),
      isGitHubConfigured(config) ? /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full", children: [
        /* @__PURE__ */ jsxDEV(ShieldCheck, { className: "w-3.5 h-3.5" }, void 0, false, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 273,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: "設定完了" }, void 0, false, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 274,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 272,
        columnNumber: 11
      }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full", children: "未設定" }, void 0, false, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 277,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/GitHubSettings.tsx",
      lineNumber: 256,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-300 leading-relaxed font-sans", children: "SoundBoxの音声データ（.m4a）と曲情報（JSON）を、ご自身のGitHubリポジトリへ1曲ずつ直接アップロード・保管できます。 iPhone（Safari）のメモリ制限によるZIPクラッシュを完全に回避し、クラウド上の自分専用音楽ライブラリとして活用できます。" }, void 0, false, {
      fileName: "/app/applet/src/components/GitHubSettings.tsx",
      lineNumber: 283,
      columnNumber: 7
    }, this),
    message && /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: `p-4 rounded-xl text-xs font-mono border leading-relaxed ${message.type === "success" ? "bg-[#FF5F1F]/10 border-[#FF5F1F]/30 text-[#FF5F1F]" : message.type === "error" ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`,
        children: message.text
      },
      void 0,
      false,
      {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 289,
        columnNumber: 9
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-2 space-y-1.5", children: [
        /* @__PURE__ */ jsxDEV("label", { className: "text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center justify-between", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxDEV(Key, { className: "w-3.5 h-3.5 text-[#FF5F1F]" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 308,
              columnNumber: 15
            }, this),
            "GitHub Personal Access Token (PAT)"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 307,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: "https://github.com/settings/tokens/new?scopes=repo&description=SoundBox%20Music%20Storage",
              target: "_blank",
              rel: "noreferrer",
              className: "text-[10px] text-[#FF5F1F] hover:underline flex items-center gap-1 font-mono",
              children: [
                /* @__PURE__ */ jsxDEV("span", { children: "PAT新規発行" }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 317,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV(ExternalLink, { className: "w-3 h-3" }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 318,
                  columnNumber: 15
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 311,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 306,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: showPat ? "text" : "password",
              value: config.pat,
              onChange: (e) => setConfig({ ...config, pat: e.target.value }),
              placeholder: "github_pat_xxxx または ghp_xxxx",
              className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 pl-4 pr-10 outline-none text-xs font-mono transition"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 322,
              columnNumber: 13
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: () => setShowPat(!showPat),
              className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer",
              children: showPat ? /* @__PURE__ */ jsxDEV(EyeOff, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 334,
                columnNumber: 26
              }, this) : /* @__PURE__ */ jsxDEV(Eye, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 334,
                columnNumber: 59
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 329,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 321,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 font-mono", children: [
          "※スコープは ",
          /* @__PURE__ */ jsxDEV("code", { className: "bg-white/10 px-1 py-0.5 rounded text-amber-300", children: "repo" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 338,
            columnNumber: 20
          }, this),
          " (Full control of private repositories) を許可してください。"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 337,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 305,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxDEV("label", { className: "text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxDEV(User, { className: "w-3.5 h-3.5 text-[#FF5F1F]" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 345,
            columnNumber: 13
          }, this),
          "GitHub ユーザー名 / オーナー名"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 344,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: config.owner,
            onChange: (e) => setConfig({ ...config, owner: e.target.value.trim() }),
            placeholder: "例: your-username",
            className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 348,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 343,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxDEV(Github, { className: "w-3.5 h-3.5 text-[#FF5F1F]" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 361,
              columnNumber: 15
            }, this),
            "リポジトリ名"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 360,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setConfig({ ...config, repo: "Extractor-Player-storage", folder: "audio" }),
                className: "text-[9px] bg-white/10 hover:bg-[#FF5F1F]/20 hover:text-[#FF5F1F] text-slate-300 px-2 py-0.5 rounded font-mono transition cursor-pointer",
                title: "音楽データ保管用リポジトリにセット",
                children: "🎵 音声用"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 365,
                columnNumber: 15
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setConfig({ ...config, repo: "MP3-Extractor-Player", folder: "src" }),
                className: "text-[9px] bg-white/10 hover:bg-[#FF5F1F]/20 hover:text-[#FF5F1F] text-slate-300 px-2 py-0.5 rounded font-mono transition cursor-pointer",
                title: "アプリソースコード管理リポジトリにセット",
                children: "💻 アプリコード用"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 373,
                columnNumber: 15
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 364,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 359,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: config.repo,
            onChange: (e) => setConfig({ ...config, repo: e.target.value.trim() }),
            placeholder: "例: Extractor-Player-storage または MP3-Extractor-Player",
            className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 383,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 358,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxDEV("label", { className: "text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxDEV(Folder, { className: "w-3.5 h-3.5 text-[#FF5F1F]" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 396,
            columnNumber: 13
          }, this),
          "保存フォルダパス"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 395,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: config.folder,
            onChange: (e) => setConfig({ ...config, folder: e.target.value.trim() }),
            placeholder: "例: audio",
            className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 399,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 394,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxDEV("label", { className: "text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxDEV(GitBranch, { className: "w-3.5 h-3.5 text-[#FF5F1F]" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 411,
            columnNumber: 13
          }, this),
          "ブランチ名"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 410,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            value: config.branch,
            onChange: (e) => setConfig({ ...config, branch: e.target.value.trim() }),
            placeholder: "main",
            className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-xs font-mono transition"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 414,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 409,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/GitHubSettings.tsx",
      lineNumber: 303,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-0.5", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold text-slate-200", children: "抽出・追加時の自動GitHub同期" }, void 0, false, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 427,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 font-sans", children: "新しい曲を抽出・保存した際、バックグラウンドで自動的に指定のGitHubリポジトリへコミット保存します。" }, void 0, false, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 428,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 426,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          onClick: () => setConfig({ ...config, autoSync: !config.autoSync }),
          className: `w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${config.autoSync ? "bg-[#FF5F1F]" : "bg-white/20"}`,
          children: /* @__PURE__ */ jsxDEV(
            "span",
            {
              className: `absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${config.autoSync ? "translate-x-6 bg-black font-bold" : "translate-x-0"}`
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 439,
              columnNumber: 11
            },
            this
          )
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 432,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/GitHubSettings.tsx",
      lineNumber: 425,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-3 pt-2", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handleTestConnection,
          disabled: testing || !isGitHubConfigured(config),
          className: "w-full sm:w-auto bg-white/10 hover:bg-white/20 disabled:opacity-40 text-slate-200 py-2.5 px-5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-white/10",
          children: testing ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "w-4 h-4 animate-spin text-[#FF5F1F]" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 456,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "接続テスト中..." }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 457,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 455,
            columnNumber: 13
          }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(RefreshCw, { className: "w-4 h-4 text-[#FF5F1F]" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 461,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "GitHub API 接続テスト" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 462,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 460,
            columnNumber: 13
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 449,
          columnNumber: 9
        },
        this
      ),
      testResult && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: `flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border ${testResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`,
          children: [
            testResult.success ? /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "w-4 h-4 flex-shrink-0" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 476,
              columnNumber: 15
            }, this) : /* @__PURE__ */ jsxDEV(AlertCircle, { className: "w-4 h-4 flex-shrink-0" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 478,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "truncate max-w-xs", children: testResult.message }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 480,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 468,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/GitHubSettings.tsx",
      lineNumber: 448,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "border-t border-white/10 pt-6 space-y-5", children: [
      /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-[#FF5F1F] tracking-widest uppercase", children: "GitHub クラウド同期アクション" }, void 0, false, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 487,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-amber-500/30 p-4 rounded-2xl space-y-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(Github, { className: "w-4 h-4 text-[#FF5F1F]" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 495,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-white", children: "1. アプリソースコード（プログラム）を同期" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 496,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 494,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-mono text-slate-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full", children: [
            "同期先: ",
            /* @__PURE__ */ jsxDEV("strong", { className: "text-amber-400 font-bold", children: "MP3-Extractor-Player" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 499,
              columnNumber: 20
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 498,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 493,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-slate-300 leading-relaxed font-sans", children: [
          "AI Studioで更新・開発したこのアプリ本体のプログラムコード（TypeScript / React / CSS等）を、GitHubのリポジトリ（",
          /* @__PURE__ */ jsxDEV("code", { className: "bg-black/50 px-1 py-0.5 rounded text-amber-300 font-mono", children: "MP3-Extractor-Player" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 503,
            columnNumber: 88
          }, this),
          "）へ直接コミット・更新同期します。"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 502,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: handleSyncAppSource,
            disabled: syncingSource || syncing || fetching || !isGitHubConfigured(config),
            className: "w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF5F1F] to-amber-500 hover:from-amber-500 hover:to-[#FF5F1F] disabled:opacity-40 text-black py-3 px-4 rounded-xl font-bold text-xs transition cursor-pointer shadow-md",
            children: syncingSource ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(Loader2, { className: "w-4 h-4 animate-spin text-black" }, void 0, false, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 512,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: sourceProgress || "ソースコードを同期中..." }, void 0, false, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 513,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 511,
              columnNumber: 15
            }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(UploadCloud, { className: "w-4 h-4 text-black" }, void 0, false, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 517,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "「MP3-Extractor-Player」へアプリコードを直接コミット・同期" }, void 0, false, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 518,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 516,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 505,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 492,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-2 pt-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-white flex items-center gap-2", children: "🎵 2. 抽出済み音楽データ・楽曲のバックアップ同期" }, void 0, false, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 527,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-mono text-slate-400", children: [
            "設定中のリポジトリ: ",
            /* @__PURE__ */ jsxDEV("strong", { className: "text-slate-200", children: config.repo || "Extractor-Player-storage" }, void 0, false, {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 531,
              columnNumber: 26
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/GitHubSettings.tsx",
            lineNumber: 530,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 526,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: handleSyncAllToGitHub,
              disabled: syncingSource || syncing || fetching || !isGitHubConfigured(config),
              className: "flex flex-col items-center justify-center gap-2 bg-[#FF5F1F] hover:bg-amber-500 disabled:opacity-40 text-black p-4 rounded-2xl font-bold transition cursor-pointer shadow-lg shadow-[#FF5F1F]/15",
              children: syncing ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 animate-spin" }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 543,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-mono", children: syncProgress || "同期中..." }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 544,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 542,
                columnNumber: 17
              }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxDEV(UploadCloud, { className: "w-5 h-5" }, void 0, false, {
                    fileName: "/app/applet/src/components/GitHubSettings.tsx",
                    lineNumber: 549,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "全楽曲を「",
                    config.repo || "保管用リポ",
                    "」へ同期"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/GitHubSettings.tsx",
                    lineNumber: 550,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 548,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-normal opacity-80 font-sans", children: "IndexedDBの音楽を保管庫へバックアップ" }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 552,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 547,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 536,
              columnNumber: 13
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: handleFetchFromGitHub,
              disabled: syncingSource || syncing || fetching || !isGitHubConfigured(config),
              className: "flex flex-col items-center justify-center gap-2 bg-white hover:bg-[#FF5F1F] hover:text-black disabled:opacity-40 text-black p-4 rounded-2xl font-bold transition cursor-pointer shadow-lg",
              children: fetching ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 animate-spin" }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 567,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-mono", children: fetchProgress || "取得中..." }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 568,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 566,
                columnNumber: 17
              }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxDEV(DownloadCloud, { className: "w-5 h-5" }, void 0, false, {
                    fileName: "/app/applet/src/components/GitHubSettings.tsx",
                    lineNumber: 573,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { children: [
                    "「",
                    config.repo || "保管用リポ",
                    "」から全楽曲を取得"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/GitHubSettings.tsx",
                    lineNumber: 574,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 572,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-normal opacity-80 font-sans", children: "クラウド上の楽曲をプレイヤーに読み込む" }, void 0, false, {
                  fileName: "/app/applet/src/components/GitHubSettings.tsx",
                  lineNumber: 576,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/GitHubSettings.tsx",
                lineNumber: 571,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/GitHubSettings.tsx",
              lineNumber: 560,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/GitHubSettings.tsx",
          lineNumber: 534,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/GitHubSettings.tsx",
        lineNumber: 525,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/GitHubSettings.tsx",
      lineNumber: 486,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/components/GitHubSettings.tsx",
    lineNumber: 255,
    columnNumber: 5
  }, this);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkdpdEh1YlNldHRpbmdzLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHtcbiAgR2l0aHViLFxuICBLZXksXG4gIEZvbGRlcixcbiAgVXNlcixcbiAgR2l0QnJhbmNoLFxuICBDaGVja0NpcmNsZTIsXG4gIEFsZXJ0Q2lyY2xlLFxuICBMb2FkZXIyLFxuICBSZWZyZXNoQ3csXG4gIFVwbG9hZENsb3VkLFxuICBEb3dubG9hZENsb3VkLFxuICBIZWxwQ2lyY2xlLFxuICBFeHRlcm5hbExpbmssXG4gIFNoaWVsZENoZWNrLFxuICBFeWUsXG4gIEV5ZU9mZlxufSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5pbXBvcnQge1xuICBnZXRHaXRIdWJDb25maWcsXG4gIHNhdmVHaXRIdWJDb25maWcsXG4gIHRlc3RHaXRIdWJDb25uZWN0aW9uLFxuICBmZXRjaFRyYWNrc0Zyb21HaXRIdWIsXG4gIHVwbG9hZFRyYWNrVG9HaXRIdWIsXG4gIHVwbG9hZFNvdXJjZUNvZGVUb0dpdEh1YixcbiAgaXNHaXRIdWJDb25maWd1cmVkXG59IGZyb20gXCIuLi9saWIvZ2l0aHViU3luY1wiO1xuXG5pbXBvcnQgeyBnZXRUcmFja3MsIHNhdmVUcmFjayB9IGZyb20gXCIuLi9saWIvZGJcIjtcbmltcG9ydCB7IFRyYWNrLCBHaXRIdWJDb25maWcgfSBmcm9tIFwiLi4vdHlwZXNcIjtcblxuaW50ZXJmYWNlIEdpdEh1YlNldHRpbmdzUHJvcHMge1xuICBvblJlZnJlc2g6ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEdpdEh1YlNldHRpbmdzKHsgb25SZWZyZXNoIH06IEdpdEh1YlNldHRpbmdzUHJvcHMpIHtcbiAgY29uc3QgW2NvbmZpZywgc2V0Q29uZmlnXSA9IHVzZVN0YXRlPEdpdEh1YkNvbmZpZz4oZ2V0R2l0SHViQ29uZmlnKCkpO1xuICBjb25zdCBbc2hvd1BhdCwgc2V0U2hvd1BhdF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFt0ZXN0aW5nLCBzZXRUZXN0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3Rlc3RSZXN1bHQsIHNldFRlc3RSZXN1bHRdID0gdXNlU3RhdGU8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB8IG51bGw+KG51bGwpO1xuICBcbiAgY29uc3QgW3N5bmNpbmcsIHNldFN5bmNpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbc3luY1Byb2dyZXNzLCBzZXRTeW5jUHJvZ3Jlc3NdID0gdXNlU3RhdGU8c3RyaW5nPihcIlwiKTtcbiAgY29uc3QgW2ZldGNoaW5nLCBzZXRGZXRjaGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtmZXRjaFByb2dyZXNzLCBzZXRGZXRjaFByb2dyZXNzXSA9IHVzZVN0YXRlPHN0cmluZz4oXCJcIik7XG4gIGNvbnN0IFtzeW5jaW5nU291cmNlLCBzZXRTeW5jaW5nU291cmNlXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3NvdXJjZVByb2dyZXNzLCBzZXRTb3VyY2VQcm9ncmVzc10gPSB1c2VTdGF0ZTxzdHJpbmc+KFwiXCIpO1xuXG4gIGNvbnN0IFttZXNzYWdlLCBzZXRNZXNzYWdlXSA9IHVzZVN0YXRlPHsgdGV4dDogc3RyaW5nOyB0eXBlOiBcInN1Y2Nlc3NcIiB8IFwiZXJyb3JcIiB8IFwiaW5mb1wiIH0gfCBudWxsPihudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNhdmVHaXRIdWJDb25maWcoY29uZmlnKTtcbiAgfSwgW2NvbmZpZ10pO1xuXG4gIGNvbnN0IHNob3dNc2cgPSAodGV4dDogc3RyaW5nLCB0eXBlOiBcInN1Y2Nlc3NcIiB8IFwiZXJyb3JcIiB8IFwiaW5mb1wiKSA9PiB7XG4gICAgc2V0TWVzc2FnZSh7IHRleHQsIHR5cGUgfSk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBzZXRNZXNzYWdlKG51bGwpLCA4MDAwKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVTeW5jQXBwU291cmNlID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmICghaXNHaXRIdWJDb25maWd1cmVkKGNvbmZpZykpIHtcbiAgICAgIHNob3dNc2coXCLlhYjjgatHaXRIdWIgUEFU44CB44Om44O844K244O85ZCN44CB44Oq44Od44K444OI44Oq5ZCN44KS6Kit5a6a44O75L+d5a2Y44GX44Gm44GP44Gg44GV44GE44CCXCIsIFwiZXJyb3JcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0U3luY2luZ1NvdXJjZSh0cnVlKTtcbiAgICBzZXRTb3VyY2VQcm9ncmVzcyhcIuOCveODvOOCueOCs+ODvOODieOCkua6luWCmeS4rS4uLlwiKTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBDb2xsZWN0IGN1cnJlbnQgc291cmNlIGNvZGUgZmlsZXMgdG8gcHVzaCBkaXJlY3RseSB0byBHaXRIdWIgcmVwb1xuICAgICAgY29uc3QgZmlsZXNNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIFwicGFja2FnZS5qc29uXCI6IGF3YWl0IGZldGNoKFwiL3BhY2thZ2UuanNvblwiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwiaW5kZXguaHRtbFwiOiBhd2FpdCBmZXRjaChcIi9pbmRleC5odG1sXCIpLnRoZW4oKHIpID0+IHIudGV4dCgpKS5jYXRjaCgoKSA9PiBcIlwiKSxcbiAgICAgICAgXCJ2aXRlLmNvbmZpZy50c1wiOiBhd2FpdCBmZXRjaChcIi92aXRlLmNvbmZpZy50c1wiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwidHNjb25maWcuanNvblwiOiBhd2FpdCBmZXRjaChcIi90c2NvbmZpZy5qc29uXCIpLnRoZW4oKHIpID0+IHIudGV4dCgpKS5jYXRjaCgoKSA9PiBcIlwiKSxcbiAgICAgICAgXCJzcmMvQXBwLnRzeFwiOiBhd2FpdCBmZXRjaChcIi9zcmMvQXBwLnRzeFwiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwic3JjL21haW4udHN4XCI6IGF3YWl0IGZldGNoKFwiL3NyYy9tYWluLnRzeFwiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwic3JjL3R5cGVzLnRzXCI6IGF3YWl0IGZldGNoKFwiL3NyYy90eXBlcy50c1wiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwic3JjL2luZGV4LmNzc1wiOiBhd2FpdCBmZXRjaChcIi9zcmMvaW5kZXguY3NzXCIpLnRoZW4oKHIpID0+IHIudGV4dCgpKS5jYXRjaCgoKSA9PiBcIlwiKSxcbiAgICAgICAgXCJzcmMvbGliL2RiLnRzXCI6IGF3YWl0IGZldGNoKFwiL3NyYy9saWIvZGIudHNcIikudGhlbigocikgPT4gci50ZXh0KCkpLmNhdGNoKCgpID0+IFwiXCIpLFxuICAgICAgICBcInNyYy9saWIvYXVkaW9IZWxwZXIudHNcIjogYXdhaXQgZmV0Y2goXCIvc3JjL2xpYi9hdWRpb0hlbHBlci50c1wiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwic3JjL2xpYi9iYWNrdXAudHNcIjogYXdhaXQgZmV0Y2goXCIvc3JjL2xpYi9iYWNrdXAudHNcIikudGhlbigocikgPT4gci50ZXh0KCkpLmNhdGNoKCgpID0+IFwiXCIpLFxuICAgICAgICBcInNyYy9saWIvZ2l0aHViU3luYy50c1wiOiBhd2FpdCBmZXRjaChcIi9zcmMvbGliL2dpdGh1YlN5bmMudHNcIikudGhlbigocikgPT4gci50ZXh0KCkpLmNhdGNoKCgpID0+IFwiXCIpLFxuICAgICAgICBcInNyYy9jb21wb25lbnRzL1BsYXllci50c3hcIjogYXdhaXQgZmV0Y2goXCIvc3JjL2NvbXBvbmVudHMvUGxheWVyLnRzeFwiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwic3JjL2NvbXBvbmVudHMvRXh0cmFjdG9yLnRzeFwiOiBhd2FpdCBmZXRjaChcIi9zcmMvY29tcG9uZW50cy9FeHRyYWN0b3IudHN4XCIpLnRoZW4oKHIpID0+IHIudGV4dCgpKS5jYXRjaCgoKSA9PiBcIlwiKSxcbiAgICAgICAgXCJzcmMvY29tcG9uZW50cy9CYWNrdXBSZXN0b3JlLnRzeFwiOiBhd2FpdCBmZXRjaChcIi9zcmMvY29tcG9uZW50cy9CYWNrdXBSZXN0b3JlLnRzeFwiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICAgIFwic3JjL2NvbXBvbmVudHMvR2l0SHViU2V0dGluZ3MudHN4XCI6IGF3YWl0IGZldGNoKFwiL3NyYy9jb21wb25lbnRzL0dpdEh1YlNldHRpbmdzLnRzeFwiKS50aGVuKChyKSA9PiByLnRleHQoKSkuY2F0Y2goKCkgPT4gXCJcIiksXG4gICAgICB9O1xuXG4gICAgICAvLyBGaWx0ZXIgZW1wdHlcbiAgICAgIGNvbnN0IHZhbGlkRmlsZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGZpbGVzTWFwKSkge1xuICAgICAgICBpZiAodiAmJiB2LnRyaW0oKSkgdmFsaWRGaWxlc1trXSA9IHY7XG4gICAgICB9XG5cbiAgICAgIC8vIFRhcmdldCBNUDMtRXh0cmFjdG9yLVBsYXllciBmb3IgYXBwIHNvdXJjZSBjb2RlIHN5bmNcbiAgICAgIGNvbnN0IHRhcmdldFJlcG8gPSBjb25maWcucmVwbyA9PT0gXCJFeHRyYWN0b3ItUGxheWVyLXN0b3JhZ2VcIiA/IFwiTVAzLUV4dHJhY3Rvci1QbGF5ZXJcIiA6IChjb25maWcucmVwbyB8fCBcIk1QMy1FeHRyYWN0b3ItUGxheWVyXCIpO1xuXG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB1cGxvYWRTb3VyY2VDb2RlVG9HaXRIdWIodmFsaWRGaWxlcywgY29uZmlnLCAobXNnKSA9PiB7XG4gICAgICAgIHNldFNvdXJjZVByb2dyZXNzKG1zZyk7XG4gICAgICB9LCB0YXJnZXRSZXBvKTtcblxuICAgICAgc2hvd01zZyhyZXMubWVzc2FnZSwgXCJzdWNjZXNzXCIpO1xuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBzaG93TXNnKFwi44K944O844K544Kz44O844OJ44Gu5ZCM5pyf5Lit44Gr44Ko44Op44O844GM55m655Sf44GX44G+44GX44GfOiBcIiArIGVyci5tZXNzYWdlLCBcImVycm9yXCIpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRTeW5jaW5nU291cmNlKGZhbHNlKTtcbiAgICAgIHNldFNvdXJjZVByb2dyZXNzKFwiXCIpO1xuICAgIH1cbiAgfTtcblxuXG4gIGNvbnN0IGhhbmRsZVRlc3RDb25uZWN0aW9uID0gYXN5bmMgKCkgPT4ge1xuICAgIHNldFRlc3RpbmcodHJ1ZSk7XG4gICAgc2V0VGVzdFJlc3VsdChudWxsKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGVzdEdpdEh1YkNvbm5lY3Rpb24oY29uZmlnKTtcbiAgICAgIHNldFRlc3RSZXN1bHQocmVzKTtcbiAgICAgIGlmIChyZXMuc3VjY2Vzcykge1xuICAgICAgICBzaG93TXNnKFwiR2l0SHVi44Oq44Od44K444OI44Oq44G444Gu5o6l57aa44KS5q2j5bi444Gr56K66KqN44GX44G+44GX44Gf77yBXCIsIFwic3VjY2Vzc1wiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNob3dNc2cocmVzLm1lc3NhZ2UsIFwiZXJyb3JcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHNldFRlc3RSZXN1bHQoeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfHwgXCLmjqXntprjg4bjgrnjg4jkuK3jgavjgqjjg6njg7zjgYznmbrnlJ/jgZfjgb7jgZfjgZ/jgIJcIiB9KTtcbiAgICAgIHNob3dNc2coXCLmjqXntprjg4bjgrnjg4jlpLHmlZc6IFwiICsgZXJyLm1lc3NhZ2UsIFwiZXJyb3JcIik7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldFRlc3RpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVTeW5jQWxsVG9HaXRIdWIgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSkge1xuICAgICAgc2hvd01zZyhcIuWFiOOBq0dpdEh1YiBQQVTjgIHjg6bjg7zjgrbjg7zlkI3jgIHjg6rjg53jgrjjg4jjg6rlkI3jgpLoqK3lrprjg7vkv53lrZjjgZfjgabjgY/jgaDjgZXjgYTjgIJcIiwgXCJlcnJvclwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzZXRTeW5jaW5nKHRydWUpO1xuICAgIHNldFN5bmNQcm9ncmVzcyhcIuODreODvOOCq+ODq+ODqeOCpOODluODqeODquOBrualveabsuOCkuWPluW+l+S4rS4uLlwiKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsb2NhbFRyYWNrcyA9IGF3YWl0IGdldFRyYWNrcygpO1xuICAgICAgaWYgKGxvY2FsVHJhY2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzaG93TXNnKFwi5ZCM5pyf44GZ44KL44Ot44O844Kr44Or5qW95puy44GM44GC44KK44G+44Gb44KT44CCXCIsIFwiaW5mb1wiKTtcbiAgICAgICAgc2V0U3luY2luZyhmYWxzZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGV0IHN1Y2Nlc3NDb3VudCA9IDA7XG4gICAgICBsZXQgZmFpbENvdW50ID0gMDtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb2NhbFRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB0cmFjayA9IGxvY2FsVHJhY2tzW2ldO1xuICAgICAgICBzZXRTeW5jUHJvZ3Jlc3MoYFske2kgKyAxfS8ke2xvY2FsVHJhY2tzLmxlbmd0aH1dIOOAjCR7dHJhY2sudGl0bGV944CN44KSR2l0SHVi44G444Ki44OD44OX44Ot44O844OJ5LitLi4uYCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdXBsb2FkVHJhY2tUb0dpdEh1Yih0cmFjaywgY29uZmlnLCAoc3RlcE1zZykgPT4ge1xuICAgICAgICAgICAgc2V0U3luY1Byb2dyZXNzKGBbJHtpICsgMX0vJHtsb2NhbFRyYWNrcy5sZW5ndGh9XSAke3N0ZXBNc2d9YCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHN5bmMgdHJhY2sgJHt0cmFjay5pZH06YCwgZXJyKTtcbiAgICAgICAgICBmYWlsQ291bnQrKztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzaG93TXNnKFxuICAgICAgICBg5LiA5ous5ZCM5pyf5a6M5LqGOiAke2xvY2FsVHJhY2tzLmxlbmd0aH3mm7LkuK0gJHtzdWNjZXNzQ291bnR95puy44KSR2l0SHVi44Gr5q2j5bi45L+d5a2Y44GX44G+44GX44Gf77yBJHtcbiAgICAgICAgICBmYWlsQ291bnQgPiAwID8gYCAoJHtmYWlsQ291bnR95puy44Ko44Op44O8KWAgOiBcIlwiXG4gICAgICAgIH1gLFxuICAgICAgICBzdWNjZXNzQ291bnQgPiAwID8gXCJzdWNjZXNzXCIgOiBcImVycm9yXCJcbiAgICAgICk7XG4gICAgICBvblJlZnJlc2goKTtcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgc2hvd01zZyhcIkdpdEh1YuS4gOaLrOWQjOacn+S4reOBq+OCqOODqeODvOOBjOeZuueUn+OBl+OBvuOBl+OBnzogXCIgKyBlcnIubWVzc2FnZSwgXCJlcnJvclwiKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0U3luY2luZyhmYWxzZSk7XG4gICAgICBzZXRTeW5jUHJvZ3Jlc3MoXCJcIik7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUZldGNoRnJvbUdpdEh1YiA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAoIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpKSB7XG4gICAgICBzaG93TXNnKFwi5YWI44GrR2l0SHViIFBBVOOAgeODpuODvOOCtuODvOWQjeOAgeODquODneOCuOODiOODquWQjeOCkuioreWumuODu+S/neWtmOOBl+OBpuOBj+OBoOOBleOBhOOAglwiLCBcImVycm9yXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldEZldGNoaW5nKHRydWUpO1xuICAgIHNldEZldGNoUHJvZ3Jlc3MoXCJHaXRIdWLjgYvjgonmpb3mm7LkuIDopqfjgpLlj5blvpfkuK0uLi5cIik7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY2xvdWRUcmFja3MgPSBhd2FpdCBmZXRjaFRyYWNrc0Zyb21HaXRIdWIoY29uZmlnLCAoc3RlcE1zZykgPT4ge1xuICAgICAgICBzZXRGZXRjaFByb2dyZXNzKHN0ZXBNc2cpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChjbG91ZFRyYWNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc2hvd01zZyhcIuaMh+WumuOBrkdpdEh1YuODleOCqeODq+ODgOOBq+S/neWtmOOBleOCjOOBn+alveabsuODh+ODvOOCv+OBjOimi+OBpOOBi+OCiuOBvuOBm+OCk+OBp+OBl+OBn+OAglwiLCBcImluZm9cIik7XG4gICAgICAgIHNldEZldGNoaW5nKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzZXRGZXRjaFByb2dyZXNzKGDmpJzlh7rjgZXjgozjgZ8ke2Nsb3VkVHJhY2tzLmxlbmd0aH3mm7Ljga7jg4fjg7zjgr/jgpLjg4Djgqbjg7Pjg63jg7zjg4njg7vjgq3jg6Pjg4Pjgrfjg6Xmp4vnr4nkuK0uLi5gKTtcbiAgICAgIGNvbnN0IGV4aXN0aW5nVHJhY2tzID0gYXdhaXQgZ2V0VHJhY2tzKCk7XG4gICAgICBsZXQgaW1wb3J0ZWRDb3VudCA9IDA7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2xvdWRUcmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgaXRlbSA9IGNsb3VkVHJhY2tzW2ldO1xuICAgICAgICBjb25zdCBtZXRhID0gaXRlbS5tZXRhO1xuICAgICAgICBpZiAoIW1ldGEgfHwgIW1ldGEuaWQpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIFNraXAgaWYgYWxyZWFkeSBpbiBsb2NhbCBEQlxuICAgICAgICBjb25zdCBleGlzdHMgPSBleGlzdGluZ1RyYWNrcy5zb21lKCh0KSA9PiB0LmlkID09PSBtZXRhLmlkKTtcbiAgICAgICAgaWYgKGV4aXN0cykgY29udGludWU7XG5cbiAgICAgICAgc2V0RmV0Y2hQcm9ncmVzcyhgWyR7aSArIDF9LyR7Y2xvdWRUcmFja3MubGVuZ3RofV0g44CMJHttZXRhLnRpdGxlIHx8IG1ldGEuaWR944CN44Gu6Z+z5aOw44KS5Y+W5b6X5LitLi4uYCk7XG5cbiAgICAgICAgaWYgKGl0ZW0uYXVkaW9CbG9iVXJsKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGl0ZW0uYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgICAgIGlmIChyZXMub2spIHtcbiAgICAgICAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlcy5ibG9iKCk7XG4gICAgICAgICAgICAgIGNvbnN0IG5ld1RyYWNrOiBUcmFjayA9IHtcbiAgICAgICAgICAgICAgICBpZDogbWV0YS5pZCxcbiAgICAgICAgICAgICAgICB0aXRsZTogbWV0YS50aXRsZSB8fCBcIkdpdEh1YiBBdWRpb1wiLFxuICAgICAgICAgICAgICAgIGFydGlzdDogbWV0YS5hcnRpc3QgfHwgXCLkuI3mmI7jgarjgqLjg7zjg4bjgqPjgrnjg4hcIixcbiAgICAgICAgICAgICAgICBnZW5yZTogbWV0YS5nZW5yZSB8fCBcIumCpualvVwiLFxuICAgICAgICAgICAgICAgIHlvdXR1YmVVcmw6IG1ldGEueW91dHViZVVybCB8fCBcIlwiLFxuICAgICAgICAgICAgICAgIGFkZGVkQXQ6IG1ldGEuYWRkZWRBdCB8fCBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgIGJsb2I6IG5ldyBCbG9iKFtibG9iXSwgeyB0eXBlOiBcImF1ZGlvL21wNFwiIH0pLFxuICAgICAgICAgICAgICAgIGdpdGh1YlVybDogaXRlbS5hdWRpb0Jsb2JVcmwsXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGF3YWl0IHNhdmVUcmFjayhuZXdUcmFjayk7XG4gICAgICAgICAgICAgIGltcG9ydGVkQ291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChkbEVycikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBGYWlsZWQgdG8gZG93bmxvYWQgYXVkaW8gZm9yIHRyYWNrICR7bWV0YS5pZH06YCwgZGxFcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzaG93TXNnKFxuICAgICAgICBg44Kv44Op44Km44OJ44GL44KJ44Gu5b6p5YWD44O75Y+W44KK6L6844G/5a6M5LqGOiBHaXRIdWLjgYvjgokgJHtpbXBvcnRlZENvdW50feabsuOCkuaWsOOBn+OBq+ODreODvOOCq+ODq+OCreODo+ODg+OCt+ODpeOBuOeZu+mMsuOBl+OBvuOBl+OBn++8gWAsXG4gICAgICAgIFwic3VjY2Vzc1wiXG4gICAgICApO1xuICAgICAgb25SZWZyZXNoKCk7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHNob3dNc2coXCJHaXRIdWLjgYvjgonjga7oqq3jgb/ovrzjgb/kuK3jgavjgqjjg6njg7zjgYznmbrnlJ/jgZfjgb7jgZfjgZ86IFwiICsgZXJyLm1lc3NhZ2UsIFwiZXJyb3JcIik7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldEZldGNoaW5nKGZhbHNlKTtcbiAgICAgIHNldEZldGNoUHJvZ3Jlc3MoXCJcIik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcm91bmRlZC0zeGwgcC02IHNtOnAtOCBzcGFjZS15LTZcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJvcmRlci1iIGJvcmRlci13aGl0ZS81IHBiLTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC0yLjUgYmctWyNGRjVGMUZdLzEwIHJvdW5kZWQteGwgdGV4dC1bI0ZGNUYxRl1cIj5cbiAgICAgICAgICAgIDxHaXRodWIgY2xhc3NOYW1lPVwidy02IGgtNlwiIC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYm9sZCB0cmFja2luZy13aWRlc3QgdGV4dC1bI0ZGNUYxRl0gdXBwZXJjYXNlIGJsb2NrIG1iLTAuNVwiPlxuICAgICAgICAgICAgICBDTE9VRCBTVE9SQUdFIElOVEVHUkFUSU9OXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJvbGQgdGV4dC13aGl0ZSB0cmFja2luZy10aWdodFwiPlxuICAgICAgICAgICAgICBHaXRIdWIg44Kv44Op44Km44OJ44K544OI44Os44O844K46Kit5a6aXG4gICAgICAgICAgICA8L2gzPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgXG4gICAgICAgIHtpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSA/IChcbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQteHMgZm9udC1tb25vIGZvbnQtYm9sZCB0ZXh0LWVtZXJhbGQtNDAwIGJnLWVtZXJhbGQtNTAwLzEwIGJvcmRlciBib3JkZXItZW1lcmFsZC01MDAvMjAgcHgtMyBweS0xIHJvdW5kZWQtZnVsbFwiPlxuICAgICAgICAgICAgPFNoaWVsZENoZWNrIGNsYXNzTmFtZT1cInctMy41IGgtMy41XCIgLz5cbiAgICAgICAgICAgIDxzcGFuPuioreWumuWujOS6hjwvc3Bhbj5cbiAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LW1vbm8gdGV4dC1hbWJlci00MDAgYmctYW1iZXItNTAwLzEwIGJvcmRlciBib3JkZXItYW1iZXItNTAwLzIwIHB4LTMgcHktMSByb3VuZGVkLWZ1bGxcIj5cbiAgICAgICAgICAgIOacquioreWumlxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIGxlYWRpbmctcmVsYXhlZCBmb250LXNhbnNcIj5cbiAgICAgICAgU291bmRCb3jjga7pn7Plo7Djg4fjg7zjgr/vvIgubTRh77yJ44Go5puy5oOF5aCx77yISlNPTu+8ieOCkuOAgeOBlOiHqui6q+OBrkdpdEh1YuODquODneOCuOODiOODquOBuDHmm7LjgZrjgaTnm7TmjqXjgqLjg4Pjg5fjg63jg7zjg4njg7vkv53nrqHjgafjgY3jgb7jgZnjgIJcbiAgICAgICAgaVBob25l77yIU2FmYXJp77yJ44Gu44Oh44Oi44Oq5Yi26ZmQ44Gr44KI44KLWklQ44Kv44Op44OD44K344Ol44KS5a6M5YWo44Gr5Zue6YG/44GX44CB44Kv44Op44Km44OJ5LiK44Gu6Ieq5YiG5bCC55So6Z+z5qW944Op44Kk44OW44Op44Oq44Go44GX44Gm5rS755So44Gn44GN44G+44GZ44CCXG4gICAgICA8L3A+XG5cbiAgICAgIHttZXNzYWdlICYmIChcbiAgICAgICAgPGRpdlxuICAgICAgICAgIGNsYXNzTmFtZT17YHAtNCByb3VuZGVkLXhsIHRleHQteHMgZm9udC1tb25vIGJvcmRlciBsZWFkaW5nLXJlbGF4ZWQgJHtcbiAgICAgICAgICAgIG1lc3NhZ2UudHlwZSA9PT0gXCJzdWNjZXNzXCJcbiAgICAgICAgICAgICAgPyBcImJnLVsjRkY1RjFGXS8xMCBib3JkZXItWyNGRjVGMUZdLzMwIHRleHQtWyNGRjVGMUZdXCJcbiAgICAgICAgICAgICAgOiBtZXNzYWdlLnR5cGUgPT09IFwiZXJyb3JcIlxuICAgICAgICAgICAgICA/IFwiYmctcm9zZS01MDAvMTAgYm9yZGVyIGJvcmRlci1yb3NlLTUwMC8yMCB0ZXh0LXJvc2UtNDAwXCJcbiAgICAgICAgICAgICAgOiBcImJnLWFtYmVyLTUwMC8xMCBib3JkZXIgYm9yZGVyLWFtYmVyLTUwMC8yMCB0ZXh0LWFtYmVyLTQwMFwiXG4gICAgICAgICAgfWB9XG4gICAgICAgID5cbiAgICAgICAgICB7bWVzc2FnZS50ZXh0fVxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIHsvKiBHaXRIdWIgQ29uZmlndXJhdGlvbiBGb3JtICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgIHsvKiBQQVQgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWQ6Y29sLXNwYW4tMiBzcGFjZS15LTEuNVwiPlxuICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSBmb250LWJvbGQgdHJhY2tpbmctd2lkZXIgdGV4dC1zbGF0ZS0zMDAgdXBwZXJjYXNlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICA8S2V5IGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtWyNGRjVGMUZdXCIgLz5cbiAgICAgICAgICAgICAgR2l0SHViIFBlcnNvbmFsIEFjY2VzcyBUb2tlbiAoUEFUKVxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9zZXR0aW5ncy90b2tlbnMvbmV3P3Njb3Blcz1yZXBvJmRlc2NyaXB0aW9uPVNvdW5kQm94JTIwTXVzaWMlMjBTdG9yYWdlXCJcbiAgICAgICAgICAgICAgdGFyZ2V0PVwiX2JsYW5rXCJcbiAgICAgICAgICAgICAgcmVsPVwibm9yZWZlcnJlclwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtWyNGRjVGMUZdIGhvdmVyOnVuZGVybGluZSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBmb250LW1vbm9cIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8c3Bhbj5QQVTmlrDopo/nmbrooYw8L3NwYW4+XG4gICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgY2xhc3NOYW1lPVwidy0zIGgtM1wiIC8+XG4gICAgICAgICAgICA8L2E+XG4gICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlXCI+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdHlwZT17c2hvd1BhdCA/IFwidGV4dFwiIDogXCJwYXNzd29yZFwifVxuICAgICAgICAgICAgICB2YWx1ZT17Y29uZmlnLnBhdH1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRDb25maWcoeyAuLi5jb25maWcsIHBhdDogZS50YXJnZXQudmFsdWUgfSl9XG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiZ2l0aHViX3BhdF94eHh4IOOBvuOBn+OBryBnaHBfeHh4eFwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1ibGFjay80MCB0ZXh0LXNsYXRlLTEwMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIGZvY3VzOmJvcmRlci1bI0ZGNUYxRl0gcm91bmRlZC14bCBweS0zIHBsLTQgcHItMTAgb3V0bGluZS1ub25lIHRleHQteHMgZm9udC1tb25vIHRyYW5zaXRpb25cIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNob3dQYXQoIXNob3dQYXQpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSByaWdodC0zIHRvcC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7c2hvd1BhdCA/IDxFeWVPZmYgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+IDogPEV5ZSBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz59XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMCBmb250LW1vbm9cIj5cbiAgICAgICAgICAgIOKAu+OCueOCs+ODvOODl+OBryA8Y29kZSBjbGFzc05hbWU9XCJiZy13aGl0ZS8xMCBweC0xIHB5LTAuNSByb3VuZGVkIHRleHQtYW1iZXItMzAwXCI+cmVwbzwvY29kZT4gKEZ1bGwgY29udHJvbCBvZiBwcml2YXRlIHJlcG9zaXRvcmllcykg44KS6Kix5Y+v44GX44Gm44GP44Gg44GV44GE44CCXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7LyogVXNlcm5hbWUgLyBPd25lciAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEuNVwiPlxuICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSBmb250LWJvbGQgdHJhY2tpbmctd2lkZXIgdGV4dC1zbGF0ZS0zMDAgdXBwZXJjYXNlIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgIDxVc2VyIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtWyNGRjVGMUZdXCIgLz5cbiAgICAgICAgICAgIEdpdEh1YiDjg6bjg7zjgrbjg7zlkI0gLyDjgqrjg7zjg4rjg7zlkI1cbiAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgdmFsdWU9e2NvbmZpZy5vd25lcn1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0Q29uZmlnKHsgLi4uY29uZmlnLCBvd25lcjogZS50YXJnZXQudmFsdWUudHJpbSgpIH0pfVxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLkvos6IHlvdXItdXNlcm5hbWVcIlxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIHRleHQtc2xhdGUtMTAwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgZm9jdXM6Ym9yZGVyLVsjRkY1RjFGXSByb3VuZGVkLXhsIHB5LTMgcHgtNCBvdXRsaW5lLW5vbmUgdGV4dC14cyBmb250LW1vbm8gdHJhbnNpdGlvblwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qIFJlcG9zaXRvcnkgTmFtZSAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEuNVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gZm9udC1ib2xkIHRyYWNraW5nLXdpZGVyIHRleHQtc2xhdGUtMzAwIHVwcGVyY2FzZSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XCI+XG4gICAgICAgICAgICAgIDxHaXRodWIgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgdGV4dC1bI0ZGNUYxRl1cIiAvPlxuICAgICAgICAgICAgICDjg6rjg53jgrjjg4jjg6rlkI1cbiAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xXCI+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRDb25maWcoeyAuLi5jb25maWcsIHJlcG86IFwiRXh0cmFjdG9yLVBsYXllci1zdG9yYWdlXCIsIGZvbGRlcjogXCJhdWRpb1wiIH0pfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQtWzlweF0gYmctd2hpdGUvMTAgaG92ZXI6YmctWyNGRjVGMUZdLzIwIGhvdmVyOnRleHQtWyNGRjVGMUZdIHRleHQtc2xhdGUtMzAwIHB4LTIgcHktMC41IHJvdW5kZWQgZm9udC1tb25vIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgICAgIHRpdGxlPVwi6Z+z5qW944OH44O844K/5L+d566h55So44Oq44Od44K444OI44Oq44Gr44K744OD44OIXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIPCfjrUg6Z+z5aOw55SoXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0Q29uZmlnKHsgLi4uY29uZmlnLCByZXBvOiBcIk1QMy1FeHRyYWN0b3ItUGxheWVyXCIsIGZvbGRlcjogXCJzcmNcIiB9KX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGJnLXdoaXRlLzEwIGhvdmVyOmJnLVsjRkY1RjFGXS8yMCBob3Zlcjp0ZXh0LVsjRkY1RjFGXSB0ZXh0LXNsYXRlLTMwMCBweC0yIHB5LTAuNSByb3VuZGVkIGZvbnQtbW9ubyB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgICAgICB0aXRsZT1cIuOCouODl+ODquOCveODvOOCueOCs+ODvOODieeuoeeQhuODquODneOCuOODiOODquOBq+OCu+ODg+ODiFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDwn5K7IOOCouODl+ODquOCs+ODvOODieeUqFxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgdmFsdWU9e2NvbmZpZy5yZXBvfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRDb25maWcoeyAuLi5jb25maWcsIHJlcG86IGUudGFyZ2V0LnZhbHVlLnRyaW0oKSB9KX1cbiAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi5L6LOiBFeHRyYWN0b3ItUGxheWVyLXN0b3JhZ2Ug44G+44Gf44GvIE1QMy1FeHRyYWN0b3ItUGxheWVyXCJcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1ibGFjay80MCB0ZXh0LXNsYXRlLTEwMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIGZvY3VzOmJvcmRlci1bI0ZGNUYxRl0gcm91bmRlZC14bCBweS0zIHB4LTQgb3V0bGluZS1ub25lIHRleHQteHMgZm9udC1tb25vIHRyYW5zaXRpb25cIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuXG5cbiAgICAgICAgey8qIEZvbGRlciBQYXRoICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMS41XCI+XG4gICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIGZvbnQtYm9sZCB0cmFja2luZy13aWRlciB0ZXh0LXNsYXRlLTMwMCB1cHBlcmNhc2UgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgPEZvbGRlciBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LVsjRkY1RjFGXVwiIC8+XG4gICAgICAgICAgICDkv53lrZjjg5Xjgqnjg6vjg4Djg5HjgrlcbiAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgdmFsdWU9e2NvbmZpZy5mb2xkZXJ9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldENvbmZpZyh7IC4uLmNvbmZpZywgZm9sZGVyOiBlLnRhcmdldC52YWx1ZS50cmltKCkgfSl9XG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cIuS+izogYXVkaW9cIlxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIHRleHQtc2xhdGUtMTAwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgZm9jdXM6Ym9yZGVyLVsjRkY1RjFGXSByb3VuZGVkLXhsIHB5LTMgcHgtNCBvdXRsaW5lLW5vbmUgdGV4dC14cyBmb250LW1vbm8gdHJhbnNpdGlvblwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgey8qIEJyYW5jaCBOYW1lICovfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMS41XCI+XG4gICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIGZvbnQtYm9sZCB0cmFja2luZy13aWRlciB0ZXh0LXNsYXRlLTMwMCB1cHBlcmNhc2UgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgPEdpdEJyYW5jaCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNSB0ZXh0LVsjRkY1RjFGXVwiIC8+XG4gICAgICAgICAgICDjg5bjg6njg7Pjg4HlkI1cbiAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgdmFsdWU9e2NvbmZpZy5icmFuY2h9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldENvbmZpZyh7IC4uLmNvbmZpZywgYnJhbmNoOiBlLnRhcmdldC52YWx1ZS50cmltKCkgfSl9XG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cIm1haW5cIlxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIHRleHQtc2xhdGUtMTAwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgZm9jdXM6Ym9yZGVyLVsjRkY1RjFGXSByb3VuZGVkLXhsIHB5LTMgcHgtNCBvdXRsaW5lLW5vbmUgdGV4dC14cyBmb250LW1vbm8gdHJhbnNpdGlvblwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAgey8qIEF1dG8gU3luYyBUb2dnbGUgT3B0aW9uICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1ibGFjay8zMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtMnhsIHAtNCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTAuNVwiPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwXCI+5oq95Ye644O76L+95Yqg5pmC44Gu6Ieq5YuVR2l0SHVi5ZCM5pyfPC9wPlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwIGZvbnQtc2Fuc1wiPlxuICAgICAgICAgICAg5paw44GX44GE5puy44KS5oq95Ye644O75L+d5a2Y44GX44Gf6Zqb44CB44OQ44OD44Kv44Kw44Op44Km44Oz44OJ44Gn6Ieq5YuV55qE44Gr5oyH5a6a44GuR2l0SHVi44Oq44Od44K444OI44Oq44G444Kz44Of44OD44OI5L+d5a2Y44GX44G+44GZ44CCXG4gICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldENvbmZpZyh7IC4uLmNvbmZpZywgYXV0b1N5bmM6ICFjb25maWcuYXV0b1N5bmMgfSl9XG4gICAgICAgICAgY2xhc3NOYW1lPXtgdy0xMiBoLTYgcm91bmRlZC1mdWxsIHRyYW5zaXRpb24tY29sb3JzIHJlbGF0aXZlIGN1cnNvci1wb2ludGVyIGZsZXgtc2hyaW5rLTAgJHtcbiAgICAgICAgICAgIGNvbmZpZy5hdXRvU3luYyA/IFwiYmctWyNGRjVGMUZdXCIgOiBcImJnLXdoaXRlLzIwXCJcbiAgICAgICAgICB9YH1cbiAgICAgICAgPlxuICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICBjbGFzc05hbWU9e2BhYnNvbHV0ZSB0b3AtMSBsZWZ0LTEgdy00IGgtNCByb3VuZGVkLWZ1bGwgYmctYmxhY2sgdHJhbnNpdGlvbi10cmFuc2Zvcm0gJHtcbiAgICAgICAgICAgICAgY29uZmlnLmF1dG9TeW5jID8gXCJ0cmFuc2xhdGUteC02IGJnLWJsYWNrIGZvbnQtYm9sZFwiIDogXCJ0cmFuc2xhdGUteC0wXCJcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIHsvKiBDb25uZWN0aW9uIFRlc3QgJiBTdGF0dXMgRmVlZGJhY2sgKi99XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgc206ZmxleC1yb3cgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMyBwdC0yXCI+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVUZXN0Q29ubmVjdGlvbn1cbiAgICAgICAgICBkaXNhYmxlZD17dGVzdGluZyB8fCAhaXNHaXRIdWJDb25maWd1cmVkKGNvbmZpZyl9XG4gICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHNtOnctYXV0byBiZy13aGl0ZS8xMCBob3ZlcjpiZy13aGl0ZS8yMCBkaXNhYmxlZDpvcGFjaXR5LTQwIHRleHQtc2xhdGUtMjAwIHB5LTIuNSBweC01IHJvdW5kZWQteGwgZm9udC1ib2xkIHRleHQteHMgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlciBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBib3JkZXIgYm9yZGVyLXdoaXRlLzEwXCJcbiAgICAgICAgPlxuICAgICAgICAgIHt0ZXN0aW5nID8gKFxuICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwidy00IGgtNCBhbmltYXRlLXNwaW4gdGV4dC1bI0ZGNUYxRl1cIiAvPlxuICAgICAgICAgICAgICA8c3Bhbj7mjqXntprjg4bjgrnjg4jkuK0uLi48L3NwYW4+XG4gICAgICAgICAgICA8Lz5cbiAgICAgICAgICApIDogKFxuICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgPFJlZnJlc2hDdyBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtWyNGRjVGMUZdXCIgLz5cbiAgICAgICAgICAgICAgPHNwYW4+R2l0SHViIEFQSSDmjqXntprjg4bjgrnjg4g8L3NwYW4+XG4gICAgICAgICAgICA8Lz5cbiAgICAgICAgICApfVxuICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICB7dGVzdFJlc3VsdCAmJiAoXG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC14cyBmb250LW1vbm8gcHgtMyBweS0yIHJvdW5kZWQtbGcgYm9yZGVyICR7XG4gICAgICAgICAgICAgIHRlc3RSZXN1bHQuc3VjY2Vzc1xuICAgICAgICAgICAgICAgID8gXCJiZy1lbWVyYWxkLTUwMC8xMCBib3JkZXItZW1lcmFsZC01MDAvMjAgdGV4dC1lbWVyYWxkLTQwMFwiXG4gICAgICAgICAgICAgICAgOiBcImJnLXJvc2UtNTAwLzEwIGJvcmRlci1yb3NlLTUwMC8yMCB0ZXh0LXJvc2UtNDAwXCJcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIHt0ZXN0UmVzdWx0LnN1Y2Nlc3MgPyAoXG4gICAgICAgICAgICAgIDxDaGVja0NpcmNsZTIgY2xhc3NOYW1lPVwidy00IGgtNCBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgIDxBbGVydENpcmNsZSBjbGFzc05hbWU9XCJ3LTQgaC00IGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRydW5jYXRlIG1heC13LXhzXCI+e3Rlc3RSZXN1bHQubWVzc2FnZX08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgey8qIENsb3VkIFN5bmMgT3BlcmF0aW9ucyBBY3Rpb24gQmFyICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXItdCBib3JkZXItd2hpdGUvMTAgcHQtNiBzcGFjZS15LTVcIj5cbiAgICAgICAgPGg0IGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHRleHQtWyNGRjVGMUZdIHRyYWNraW5nLXdpZGVzdCB1cHBlcmNhc2VcIj5cbiAgICAgICAgICBHaXRIdWIg44Kv44Op44Km44OJ5ZCM5pyf44Ki44Kv44K344On44OzXG4gICAgICAgIDwvaDQ+XG5cbiAgICAgICAgey8qIDEuIEFwcCBTb3VyY2UgQ29kZSBTeW5jIHRvIEV4aXN0aW5nIFJlcG8gKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLWFtYmVyLTUwMC8zMCBwLTQgcm91bmRlZC0yeGwgc3BhY2UteS0zXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPEdpdGh1YiBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtWyNGRjVGMUZdXCIgLz5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC13aGl0ZVwiPjEuIOOCouODl+ODquOCveODvOOCueOCs+ODvOODie+8iOODl+ODreOCsOODqeODoO+8ieOCkuWQjOacnzwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1tb25vIHRleHQtc2xhdGUtMzAwIGJnLWFtYmVyLTUwMC8yMCBib3JkZXIgYm9yZGVyLWFtYmVyLTUwMC80MCBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGxcIj5cbiAgICAgICAgICAgICAg5ZCM5pyf5YWIOiA8c3Ryb25nIGNsYXNzTmFtZT1cInRleHQtYW1iZXItNDAwIGZvbnQtYm9sZFwiPk1QMy1FeHRyYWN0b3ItUGxheWVyPC9zdHJvbmc+XG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zbGF0ZS0zMDAgbGVhZGluZy1yZWxheGVkIGZvbnQtc2Fuc1wiPlxuICAgICAgICAgICAgQUkgU3R1ZGlv44Gn5pu05paw44O76ZaL55m644GX44Gf44GT44Gu44Ki44OX44Oq5pys5L2T44Gu44OX44Ot44Kw44Op44Og44Kz44O844OJ77yIVHlwZVNjcmlwdCAvIFJlYWN0IC8gQ1NT562J77yJ44KS44CBR2l0SHVi44Gu44Oq44Od44K444OI44Oq77yIPGNvZGUgY2xhc3NOYW1lPVwiYmctYmxhY2svNTAgcHgtMSBweS0wLjUgcm91bmRlZCB0ZXh0LWFtYmVyLTMwMCBmb250LW1vbm9cIj5NUDMtRXh0cmFjdG9yLVBsYXllcjwvY29kZT7vvInjgbjnm7TmjqXjgrPjg5/jg4Pjg4jjg7vmm7TmlrDlkIzmnJ/jgZfjgb7jgZnjgIJcbiAgICAgICAgICA8L3A+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17aGFuZGxlU3luY0FwcFNvdXJjZX1cbiAgICAgICAgICAgIGRpc2FibGVkPXtzeW5jaW5nU291cmNlIHx8IHN5bmNpbmcgfHwgZmV0Y2hpbmcgfHwgIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIGJnLWdyYWRpZW50LXRvLXIgZnJvbS1bI0ZGNUYxRl0gdG8tYW1iZXItNTAwIGhvdmVyOmZyb20tYW1iZXItNTAwIGhvdmVyOnRvLVsjRkY1RjFGXSBkaXNhYmxlZDpvcGFjaXR5LTQwIHRleHQtYmxhY2sgcHktMyBweC00IHJvdW5kZWQteGwgZm9udC1ib2xkIHRleHQteHMgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlciBzaGFkb3ctbWRcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHtzeW5jaW5nU291cmNlID8gKFxuICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgIDxMb2FkZXIyIGNsYXNzTmFtZT1cInctNCBoLTQgYW5pbWF0ZS1zcGluIHRleHQtYmxhY2tcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPntzb3VyY2VQcm9ncmVzcyB8fCBcIuOCveODvOOCueOCs+ODvOODieOCkuWQjOacn+S4rS4uLlwifTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgIDxVcGxvYWRDbG91ZCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtYmxhY2tcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPuOAjE1QMy1FeHRyYWN0b3ItUGxheWVy44CN44G444Ki44OX44Oq44Kz44O844OJ44KS55u05o6l44Kz44Of44OD44OI44O75ZCM5pyfPC9zcGFuPlxuICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsvKiAyLiBBdWRpbyBUcmFjayBEYXRhIFN5bmMgKi99XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yIHB0LTJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICDwn461IDIuIOaKveWHuua4iOOBv+mfs+alveODh+ODvOOCv+ODu+alveabsuOBruODkOODg+OCr+OCouODg+ODl+WQjOacn1xuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1tb25vIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgIOioreWumuS4reOBruODquODneOCuOODiOODqjogPHN0cm9uZyBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTIwMFwiPntjb25maWcucmVwbyB8fCBcIkV4dHJhY3Rvci1QbGF5ZXItc3RvcmFnZVwifTwvc3Ryb25nPlxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBzbTpncmlkLWNvbHMtMiBnYXAtNFwiPlxuICAgICAgICAgICAgey8qIFVwbG9hZCBhbGwgdG8gR2l0SHViICovfVxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVTeW5jQWxsVG9HaXRIdWJ9XG4gICAgICAgICAgICAgIGRpc2FibGVkPXtzeW5jaW5nU291cmNlIHx8IHN5bmNpbmcgfHwgZmV0Y2hpbmcgfHwgIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBiZy1bI0ZGNUYxRl0gaG92ZXI6YmctYW1iZXItNTAwIGRpc2FibGVkOm9wYWNpdHktNDAgdGV4dC1ibGFjayBwLTQgcm91bmRlZC0yeGwgZm9udC1ib2xkIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXIgc2hhZG93LWxnIHNoYWRvdy1bI0ZGNUYxRl0vMTVcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7c3luY2luZyA/IChcbiAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwidy01IGgtNSBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LW1vbm9cIj57c3luY1Byb2dyZXNzIHx8IFwi5ZCM5pyf5LitLi4uXCJ9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgIDxVcGxvYWRDbG91ZCBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+5YWo5qW95puy44KS44CMe2NvbmZpZy5yZXBvIHx8IFwi5L+d566h55So44Oq44OdXCJ944CN44G45ZCM5pyfPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LW5vcm1hbCBvcGFjaXR5LTgwIGZvbnQtc2Fuc1wiPlxuICAgICAgICAgICAgICAgICAgICBJbmRleGVkRELjga7pn7Pmpb3jgpLkv53nrqHluqvjgbjjg5Djg4Pjgq/jgqLjg4Pjg5dcbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICB7LyogRmV0Y2ggdHJhY2tzIGZyb20gR2l0SHViICovfVxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVGZXRjaEZyb21HaXRIdWJ9XG4gICAgICAgICAgICAgIGRpc2FibGVkPXtzeW5jaW5nU291cmNlIHx8IHN5bmNpbmcgfHwgZmV0Y2hpbmcgfHwgIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBiZy13aGl0ZSBob3ZlcjpiZy1bI0ZGNUYxRl0gaG92ZXI6dGV4dC1ibGFjayBkaXNhYmxlZDpvcGFjaXR5LTQwIHRleHQtYmxhY2sgcC00IHJvdW5kZWQtMnhsIGZvbnQtYm9sZCB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIHNoYWRvdy1sZ1wiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtmZXRjaGluZyA/IChcbiAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwidy01IGgtNSBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyBmb250LW1vbm9cIj57ZmV0Y2hQcm9ncmVzcyB8fCBcIuWPluW+l+S4rS4uLlwifTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgICA8RG93bmxvYWRDbG91ZCBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+44CMe2NvbmZpZy5yZXBvIHx8IFwi5L+d566h55So44Oq44OdXCJ944CN44GL44KJ5YWo5qW95puy44KS5Y+W5b6XPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LW5vcm1hbCBvcGFjaXR5LTgwIGZvbnQtc2Fuc1wiPlxuICAgICAgICAgICAgICAgICAgICDjgq/jg6njgqbjg4nkuIrjga7mpb3mm7LjgpLjg5fjg6zjgqTjg6Tjg7zjgavoqq3jgb/ovrzjgoBcbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuIl0sIm1hcHBpbmdzIjoiQUFrUVksU0FvTUEsVUFwTUE7QUFsUVosU0FBZ0IsVUFBVSxpQkFBaUI7QUFDM0M7QUFBQSxFQUNFO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsT0FDSztBQUVQLFNBQVMsV0FBVyxpQkFBaUI7QUFPckMsd0JBQXdCLGVBQWUsRUFBRSxVQUFVLEdBQXdCO0FBQ3pFLFFBQU0sQ0FBQyxRQUFRLFNBQVMsSUFBSSxTQUF1QixnQkFBZ0IsQ0FBQztBQUNwRSxRQUFNLENBQUMsU0FBUyxVQUFVLElBQUksU0FBUyxLQUFLO0FBQzVDLFFBQU0sQ0FBQyxTQUFTLFVBQVUsSUFBSSxTQUFTLEtBQUs7QUFDNUMsUUFBTSxDQUFDLFlBQVksYUFBYSxJQUFJLFNBQXVELElBQUk7QUFFL0YsUUFBTSxDQUFDLFNBQVMsVUFBVSxJQUFJLFNBQVMsS0FBSztBQUM1QyxRQUFNLENBQUMsY0FBYyxlQUFlLElBQUksU0FBaUIsRUFBRTtBQUMzRCxRQUFNLENBQUMsVUFBVSxXQUFXLElBQUksU0FBUyxLQUFLO0FBQzlDLFFBQU0sQ0FBQyxlQUFlLGdCQUFnQixJQUFJLFNBQWlCLEVBQUU7QUFDN0QsUUFBTSxDQUFDLGVBQWUsZ0JBQWdCLElBQUksU0FBUyxLQUFLO0FBQ3hELFFBQU0sQ0FBQyxnQkFBZ0IsaUJBQWlCLElBQUksU0FBaUIsRUFBRTtBQUUvRCxRQUFNLENBQUMsU0FBUyxVQUFVLElBQUksU0FBc0UsSUFBSTtBQUV4RyxZQUFVLE1BQU07QUFDZCxxQkFBaUIsTUFBTTtBQUFBLEVBQ3pCLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFFWCxRQUFNLFVBQVUsQ0FBQyxNQUFjLFNBQXVDO0FBQ3BFLGVBQVcsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUN6QixlQUFXLE1BQU0sV0FBVyxJQUFJLEdBQUcsR0FBSTtBQUFBLEVBQ3pDO0FBRUEsUUFBTSxzQkFBc0IsWUFBWTtBQUN0QyxRQUFJLENBQUMsbUJBQW1CLE1BQU0sR0FBRztBQUMvQixjQUFRLDBDQUEwQyxPQUFPO0FBQ3pEO0FBQUEsSUFDRjtBQUVBLHFCQUFpQixJQUFJO0FBQ3JCLHNCQUFrQixlQUFlO0FBRWpDLFFBQUk7QUFFRixZQUFNLFdBQW1DO0FBQUEsUUFDdkMsZ0JBQWdCLE1BQU0sTUFBTSxlQUFlLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ2pGLGNBQWMsTUFBTSxNQUFNLGFBQWEsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLE1BQU0sTUFBTSxFQUFFO0FBQUEsUUFDN0Usa0JBQWtCLE1BQU0sTUFBTSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLE1BQU0sTUFBTSxFQUFFO0FBQUEsUUFDckYsaUJBQWlCLE1BQU0sTUFBTSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLE1BQU0sTUFBTSxFQUFFO0FBQUEsUUFDbkYsZUFBZSxNQUFNLE1BQU0sY0FBYyxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsTUFBTSxNQUFNLEVBQUU7QUFBQSxRQUMvRSxnQkFBZ0IsTUFBTSxNQUFNLGVBQWUsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLE1BQU0sTUFBTSxFQUFFO0FBQUEsUUFDakYsZ0JBQWdCLE1BQU0sTUFBTSxlQUFlLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ2pGLGlCQUFpQixNQUFNLE1BQU0sZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ25GLGlCQUFpQixNQUFNLE1BQU0sZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ25GLDBCQUEwQixNQUFNLE1BQU0seUJBQXlCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ3JHLHFCQUFxQixNQUFNLE1BQU0sb0JBQW9CLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQzNGLHlCQUF5QixNQUFNLE1BQU0sd0JBQXdCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ25HLDZCQUE2QixNQUFNLE1BQU0sNEJBQTRCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQzNHLGdDQUFnQyxNQUFNLE1BQU0sK0JBQStCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ2pILG9DQUFvQyxNQUFNLE1BQU0sbUNBQW1DLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ3pILHFDQUFxQyxNQUFNLE1BQU0sb0NBQW9DLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLE1BQU0sRUFBRTtBQUFBLE1BQzdIO0FBR0EsWUFBTSxhQUFxQyxDQUFDO0FBQzVDLGlCQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssT0FBTyxRQUFRLFFBQVEsR0FBRztBQUM3QyxZQUFJLEtBQUssRUFBRSxLQUFLLEVBQUcsWUFBVyxDQUFDLElBQUk7QUFBQSxNQUNyQztBQUdBLFlBQU0sYUFBYSxPQUFPLFNBQVMsNkJBQTZCLHlCQUEwQixPQUFPLFFBQVE7QUFFekcsWUFBTSxNQUFNLE1BQU0seUJBQXlCLFlBQVksUUFBUSxDQUFDLFFBQVE7QUFDdEUsMEJBQWtCLEdBQUc7QUFBQSxNQUN2QixHQUFHLFVBQVU7QUFFYixjQUFRLElBQUksU0FBUyxTQUFTO0FBQUEsSUFDaEMsU0FBUyxLQUFVO0FBQ2pCLGNBQVEsNEJBQTRCLElBQUksU0FBUyxPQUFPO0FBQUEsSUFDMUQsVUFBRTtBQUNBLHVCQUFpQixLQUFLO0FBQ3RCLHdCQUFrQixFQUFFO0FBQUEsSUFDdEI7QUFBQSxFQUNGO0FBR0EsUUFBTSx1QkFBdUIsWUFBWTtBQUN2QyxlQUFXLElBQUk7QUFDZixrQkFBYyxJQUFJO0FBQ2xCLFFBQUk7QUFDRixZQUFNLE1BQU0sTUFBTSxxQkFBcUIsTUFBTTtBQUM3QyxvQkFBYyxHQUFHO0FBQ2pCLFVBQUksSUFBSSxTQUFTO0FBQ2YsZ0JBQVEsOEJBQThCLFNBQVM7QUFBQSxNQUNqRCxPQUFPO0FBQ0wsZ0JBQVEsSUFBSSxTQUFTLE9BQU87QUFBQSxNQUM5QjtBQUFBLElBQ0YsU0FBUyxLQUFVO0FBQ2pCLG9CQUFjLEVBQUUsU0FBUyxPQUFPLFNBQVMsSUFBSSxXQUFXLHFCQUFxQixDQUFDO0FBQzlFLGNBQVEsY0FBYyxJQUFJLFNBQVMsT0FBTztBQUFBLElBQzVDLFVBQUU7QUFDQSxpQkFBVyxLQUFLO0FBQUEsSUFDbEI7QUFBQSxFQUNGO0FBRUEsUUFBTSx3QkFBd0IsWUFBWTtBQUN4QyxRQUFJLENBQUMsbUJBQW1CLE1BQU0sR0FBRztBQUMvQixjQUFRLDBDQUEwQyxPQUFPO0FBQ3pEO0FBQUEsSUFDRjtBQUVBLGVBQVcsSUFBSTtBQUNmLG9CQUFnQixxQkFBcUI7QUFFckMsUUFBSTtBQUNGLFlBQU0sY0FBYyxNQUFNLFVBQVU7QUFDcEMsVUFBSSxZQUFZLFdBQVcsR0FBRztBQUM1QixnQkFBUSxxQkFBcUIsTUFBTTtBQUNuQyxtQkFBVyxLQUFLO0FBQ2hCO0FBQUEsTUFDRjtBQUVBLFVBQUksZUFBZTtBQUNuQixVQUFJLFlBQVk7QUFFaEIsZUFBUyxJQUFJLEdBQUcsSUFBSSxZQUFZLFFBQVEsS0FBSztBQUMzQyxjQUFNLFFBQVEsWUFBWSxDQUFDO0FBQzNCLHdCQUFnQixJQUFJLElBQUksQ0FBQyxJQUFJLFlBQVksTUFBTSxNQUFNLE1BQU0sS0FBSyxxQkFBcUI7QUFDckYsWUFBSTtBQUNGLGdCQUFNLG9CQUFvQixPQUFPLFFBQVEsQ0FBQyxZQUFZO0FBQ3BELDRCQUFnQixJQUFJLElBQUksQ0FBQyxJQUFJLFlBQVksTUFBTSxLQUFLLE9BQU8sRUFBRTtBQUFBLFVBQy9ELENBQUM7QUFDRDtBQUFBLFFBQ0YsU0FBUyxLQUFVO0FBQ2pCLGtCQUFRLE1BQU0sd0JBQXdCLE1BQU0sRUFBRSxLQUFLLEdBQUc7QUFDdEQ7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUVBO0FBQUEsUUFDRSxXQUFXLFlBQVksTUFBTSxNQUFNLFlBQVkscUJBQzdDLFlBQVksSUFBSSxLQUFLLFNBQVMsVUFBVSxFQUMxQztBQUFBLFFBQ0EsZUFBZSxJQUFJLFlBQVk7QUFBQSxNQUNqQztBQUNBLGdCQUFVO0FBQUEsSUFDWixTQUFTLEtBQVU7QUFDakIsY0FBUSw2QkFBNkIsSUFBSSxTQUFTLE9BQU87QUFBQSxJQUMzRCxVQUFFO0FBQ0EsaUJBQVcsS0FBSztBQUNoQixzQkFBZ0IsRUFBRTtBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUVBLFFBQU0sd0JBQXdCLFlBQVk7QUFDeEMsUUFBSSxDQUFDLG1CQUFtQixNQUFNLEdBQUc7QUFDL0IsY0FBUSwwQ0FBMEMsT0FBTztBQUN6RDtBQUFBLElBQ0Y7QUFFQSxnQkFBWSxJQUFJO0FBQ2hCLHFCQUFpQixxQkFBcUI7QUFFdEMsUUFBSTtBQUNGLFlBQU0sY0FBYyxNQUFNLHNCQUFzQixRQUFRLENBQUMsWUFBWTtBQUNuRSx5QkFBaUIsT0FBTztBQUFBLE1BQzFCLENBQUM7QUFFRCxVQUFJLFlBQVksV0FBVyxHQUFHO0FBQzVCLGdCQUFRLHdDQUF3QyxNQUFNO0FBQ3RELG9CQUFZLEtBQUs7QUFDakI7QUFBQSxNQUNGO0FBRUEsdUJBQWlCLFFBQVEsWUFBWSxNQUFNLDBCQUEwQjtBQUNyRSxZQUFNLGlCQUFpQixNQUFNLFVBQVU7QUFDdkMsVUFBSSxnQkFBZ0I7QUFFcEIsZUFBUyxJQUFJLEdBQUcsSUFBSSxZQUFZLFFBQVEsS0FBSztBQUMzQyxjQUFNLE9BQU8sWUFBWSxDQUFDO0FBQzFCLGNBQU0sT0FBTyxLQUFLO0FBQ2xCLFlBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFJO0FBR3ZCLGNBQU0sU0FBUyxlQUFlLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxLQUFLLEVBQUU7QUFDMUQsWUFBSSxPQUFRO0FBRVoseUJBQWlCLElBQUksSUFBSSxDQUFDLElBQUksWUFBWSxNQUFNLE1BQU0sS0FBSyxTQUFTLEtBQUssRUFBRSxhQUFhO0FBRXhGLFlBQUksS0FBSyxjQUFjO0FBQ3JCLGNBQUk7QUFDRixrQkFBTSxNQUFNLE1BQU0sTUFBTSxLQUFLLFlBQVk7QUFDekMsZ0JBQUksSUFBSSxJQUFJO0FBQ1Ysb0JBQU0sT0FBTyxNQUFNLElBQUksS0FBSztBQUM1QixvQkFBTSxXQUFrQjtBQUFBLGdCQUN0QixJQUFJLEtBQUs7QUFBQSxnQkFDVCxPQUFPLEtBQUssU0FBUztBQUFBLGdCQUNyQixRQUFRLEtBQUssVUFBVTtBQUFBLGdCQUN2QixPQUFPLEtBQUssU0FBUztBQUFBLGdCQUNyQixZQUFZLEtBQUssY0FBYztBQUFBLGdCQUMvQixTQUFTLEtBQUssV0FBVyxLQUFLLElBQUk7QUFBQSxnQkFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUFBLGdCQUM1QyxXQUFXLEtBQUs7QUFBQSxjQUNsQjtBQUNBLG9CQUFNLFVBQVUsUUFBUTtBQUN4QjtBQUFBLFlBQ0Y7QUFBQSxVQUNGLFNBQVMsT0FBTztBQUNkLG9CQUFRLEtBQUssc0NBQXNDLEtBQUssRUFBRSxLQUFLLEtBQUs7QUFBQSxVQUN0RTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBRUE7QUFBQSxRQUNFLDhCQUE4QixhQUFhO0FBQUEsUUFDM0M7QUFBQSxNQUNGO0FBQ0EsZ0JBQVU7QUFBQSxJQUNaLFNBQVMsS0FBVTtBQUNqQixjQUFRLGdDQUFnQyxJQUFJLFNBQVMsT0FBTztBQUFBLElBQzlELFVBQUU7QUFDQSxrQkFBWSxLQUFLO0FBQ2pCLHVCQUFpQixFQUFFO0FBQUEsSUFDckI7QUFBQSxFQUNGO0FBRUEsU0FDRSx1QkFBQyxTQUFJLFdBQVUsc0VBQ2I7QUFBQSwyQkFBQyxTQUFJLFdBQVUsa0VBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUsMkJBQ2I7QUFBQSwrQkFBQyxTQUFJLFdBQVUsbURBQ2IsaUNBQUMsVUFBTyxXQUFVLGFBQWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNEIsS0FEOUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFDQSx1QkFBQyxTQUNDO0FBQUEsaUNBQUMsVUFBSyxXQUFVLCtFQUE4RSx5Q0FBOUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsUUFBRyxXQUFVLCtDQUE4QyxrQ0FBNUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLGFBTkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQU9BO0FBQUEsV0FYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBWUE7QUFBQSxNQUVDLG1CQUFtQixNQUFNLElBQ3hCLHVCQUFDLFVBQUssV0FBVSxnSkFDZDtBQUFBLCtCQUFDLGVBQVksV0FBVSxpQkFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFxQztBQUFBLFFBQ3JDLHVCQUFDLFVBQUssb0JBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFVO0FBQUEsV0FGWjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBR0EsSUFFQSx1QkFBQyxVQUFLLFdBQVUsc0dBQXFHLG1CQUFySDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxTQXZCSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBeUJBO0FBQUEsSUFFQSx1QkFBQyxPQUFFLFdBQVUsb0RBQW1ELHVKQUFoRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBR0E7QUFBQSxJQUVDLFdBQ0M7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLFdBQVcsMkRBQ1QsUUFBUSxTQUFTLFlBQ2IsdURBQ0EsUUFBUSxTQUFTLFVBQ2pCLDJEQUNBLDJEQUNOO0FBQUEsUUFFQyxrQkFBUTtBQUFBO0FBQUEsTUFUWDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFVQTtBQUFBLElBSUYsdUJBQUMsU0FBSSxXQUFVLHlDQUViO0FBQUEsNkJBQUMsU0FBSSxXQUFVLDZCQUNiO0FBQUEsK0JBQUMsV0FBTSxXQUFVLG1HQUNmO0FBQUEsaUNBQUMsVUFBSyxXQUFVLDZCQUNkO0FBQUEsbUNBQUMsT0FBSSxXQUFVLGdDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTRDO0FBQUEsWUFBRTtBQUFBLGVBRGhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxVQUNBO0FBQUEsWUFBQztBQUFBO0FBQUEsY0FDQyxNQUFLO0FBQUEsY0FDTCxRQUFPO0FBQUEsY0FDUCxLQUFJO0FBQUEsY0FDSixXQUFVO0FBQUEsY0FFVjtBQUFBLHVDQUFDLFVBQUssdUJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBYTtBQUFBLGdCQUNiLHVCQUFDLGdCQUFhLFdBQVUsYUFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBa0M7QUFBQTtBQUFBO0FBQUEsWUFQcEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBUUE7QUFBQSxhQWJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFjQTtBQUFBLFFBQ0EsdUJBQUMsU0FBSSxXQUFVLFlBQ2I7QUFBQTtBQUFBLFlBQUM7QUFBQTtBQUFBLGNBQ0MsTUFBTSxVQUFVLFNBQVM7QUFBQSxjQUN6QixPQUFPLE9BQU87QUFBQSxjQUNkLFVBQVUsQ0FBQyxNQUFNLFVBQVUsRUFBRSxHQUFHLFFBQVEsS0FBSyxFQUFFLE9BQU8sTUFBTSxDQUFDO0FBQUEsY0FDN0QsYUFBWTtBQUFBLGNBQ1osV0FBVTtBQUFBO0FBQUEsWUFMWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFNQTtBQUFBLFVBQ0E7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLE1BQUs7QUFBQSxjQUNMLFNBQVMsTUFBTSxXQUFXLENBQUMsT0FBTztBQUFBLGNBQ2xDLFdBQVU7QUFBQSxjQUVULG9CQUFVLHVCQUFDLFVBQU8sV0FBVSxhQUFsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUE0QixJQUFLLHVCQUFDLE9BQUksV0FBVSxhQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXlCO0FBQUE7QUFBQSxZQUx2RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFNQTtBQUFBLGFBZEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWVBO0FBQUEsUUFDQSx1QkFBQyxPQUFFLFdBQVUsd0NBQXVDO0FBQUE7QUFBQSxVQUMzQyx1QkFBQyxVQUFLLFdBQVUsa0RBQWlELG9CQUFqRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFxRTtBQUFBLFVBQU87QUFBQSxhQURyRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQWxDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBbUNBO0FBQUEsTUFHQSx1QkFBQyxTQUFJLFdBQVUsZUFDYjtBQUFBLCtCQUFDLFdBQU0sV0FBVSwyRkFDZjtBQUFBLGlDQUFDLFFBQUssV0FBVSxnQ0FBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNkM7QUFBQSxVQUFFO0FBQUEsYUFEakQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUdBO0FBQUEsUUFDQTtBQUFBLFVBQUM7QUFBQTtBQUFBLFlBQ0MsTUFBSztBQUFBLFlBQ0wsT0FBTyxPQUFPO0FBQUEsWUFDZCxVQUFVLENBQUMsTUFBTSxVQUFVLEVBQUUsR0FBRyxRQUFRLE9BQU8sRUFBRSxPQUFPLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFBQSxZQUN0RSxhQUFZO0FBQUEsWUFDWixXQUFVO0FBQUE7QUFBQSxVQUxaO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQU1BO0FBQUEsV0FYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBWUE7QUFBQSxNQUdBLHVCQUFDLFNBQUksV0FBVSxlQUNiO0FBQUEsK0JBQUMsU0FBSSxXQUFVLHFDQUNiO0FBQUEsaUNBQUMsV0FBTSxXQUFVLDJGQUNmO0FBQUEsbUNBQUMsVUFBTyxXQUFVLGdDQUFsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErQztBQUFBLFlBQUU7QUFBQSxlQURuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUdBO0FBQUEsVUFDQSx1QkFBQyxTQUFJLFdBQVUsMkJBQ2I7QUFBQTtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUNDLE1BQUs7QUFBQSxnQkFDTCxTQUFTLE1BQU0sVUFBVSxFQUFFLEdBQUcsUUFBUSxNQUFNLDRCQUE0QixRQUFRLFFBQVEsQ0FBQztBQUFBLGdCQUN6RixXQUFVO0FBQUEsZ0JBQ1YsT0FBTTtBQUFBLGdCQUNQO0FBQUE7QUFBQSxjQUxEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQU9BO0FBQUEsWUFDQTtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUNDLE1BQUs7QUFBQSxnQkFDTCxTQUFTLE1BQU0sVUFBVSxFQUFFLEdBQUcsUUFBUSxNQUFNLHdCQUF3QixRQUFRLE1BQU0sQ0FBQztBQUFBLGdCQUNuRixXQUFVO0FBQUEsZ0JBQ1YsT0FBTTtBQUFBLGdCQUNQO0FBQUE7QUFBQSxjQUxEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQU9BO0FBQUEsZUFoQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFpQkE7QUFBQSxhQXRCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBdUJBO0FBQUEsUUFDQTtBQUFBLFVBQUM7QUFBQTtBQUFBLFlBQ0MsTUFBSztBQUFBLFlBQ0wsT0FBTyxPQUFPO0FBQUEsWUFDZCxVQUFVLENBQUMsTUFBTSxVQUFVLEVBQUUsR0FBRyxRQUFRLE1BQU0sRUFBRSxPQUFPLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFBQSxZQUNyRSxhQUFZO0FBQUEsWUFDWixXQUFVO0FBQUE7QUFBQSxVQUxaO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQU1BO0FBQUEsV0EvQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWdDQTtBQUFBLE1BSUEsdUJBQUMsU0FBSSxXQUFVLGVBQ2I7QUFBQSwrQkFBQyxXQUFNLFdBQVUsMkZBQ2Y7QUFBQSxpQ0FBQyxVQUFPLFdBQVUsZ0NBQWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStDO0FBQUEsVUFBRTtBQUFBLGFBRG5EO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFHQTtBQUFBLFFBQ0E7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUNDLE1BQUs7QUFBQSxZQUNMLE9BQU8sT0FBTztBQUFBLFlBQ2QsVUFBVSxDQUFDLE1BQU0sVUFBVSxFQUFFLEdBQUcsUUFBUSxRQUFRLEVBQUUsT0FBTyxNQUFNLEtBQUssRUFBRSxDQUFDO0FBQUEsWUFDdkUsYUFBWTtBQUFBLFlBQ1osV0FBVTtBQUFBO0FBQUEsVUFMWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFNQTtBQUFBLFdBWEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVlBO0FBQUEsTUFHQSx1QkFBQyxTQUFJLFdBQVUsZUFDYjtBQUFBLCtCQUFDLFdBQU0sV0FBVSwyRkFDZjtBQUFBLGlDQUFDLGFBQVUsV0FBVSxnQ0FBckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBa0Q7QUFBQSxVQUFFO0FBQUEsYUFEdEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUdBO0FBQUEsUUFDQTtBQUFBLFVBQUM7QUFBQTtBQUFBLFlBQ0MsTUFBSztBQUFBLFlBQ0wsT0FBTyxPQUFPO0FBQUEsWUFDZCxVQUFVLENBQUMsTUFBTSxVQUFVLEVBQUUsR0FBRyxRQUFRLFFBQVEsRUFBRSxPQUFPLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFBQSxZQUN2RSxhQUFZO0FBQUEsWUFDWixXQUFVO0FBQUE7QUFBQSxVQUxaO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQU1BO0FBQUEsV0FYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBWUE7QUFBQSxTQXRIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBdUhBO0FBQUEsSUFHQSx1QkFBQyxTQUFJLFdBQVUsOEZBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUsZUFDYjtBQUFBLCtCQUFDLE9BQUUsV0FBVSxvQ0FBbUMsaUNBQWhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBaUU7QUFBQSxRQUNqRSx1QkFBQyxPQUFFLFdBQVUsd0NBQXVDLG9FQUFwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQUpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFLQTtBQUFBLE1BQ0E7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE1BQUs7QUFBQSxVQUNMLFNBQVMsTUFBTSxVQUFVLEVBQUUsR0FBRyxRQUFRLFVBQVUsQ0FBQyxPQUFPLFNBQVMsQ0FBQztBQUFBLFVBQ2xFLFdBQVcsaUZBQ1QsT0FBTyxXQUFXLGlCQUFpQixhQUNyQztBQUFBLFVBRUE7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLFdBQVcsNEVBQ1QsT0FBTyxXQUFXLHFDQUFxQyxlQUN6RDtBQUFBO0FBQUEsWUFIRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFJQTtBQUFBO0FBQUEsUUFYRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFZQTtBQUFBLFNBbkJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FvQkE7QUFBQSxJQUdBLHVCQUFDLFNBQUksV0FBVSxxRUFDYjtBQUFBO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxTQUFTO0FBQUEsVUFDVCxVQUFVLFdBQVcsQ0FBQyxtQkFBbUIsTUFBTTtBQUFBLFVBQy9DLFdBQVU7QUFBQSxVQUVULG9CQUNDLG1DQUNFO0FBQUEsbUNBQUMsV0FBUSxXQUFVLHlDQUFuQjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUF5RDtBQUFBLFlBQ3pELHVCQUFDLFVBQUsseUJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBZTtBQUFBLGVBRmpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0EsSUFFQSxtQ0FDRTtBQUFBLG1DQUFDLGFBQVUsV0FBVSw0QkFBckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBOEM7QUFBQSxZQUM5Qyx1QkFBQyxVQUFLLGdDQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXNCO0FBQUEsZUFGeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFHQTtBQUFBO0FBQUEsUUFkSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFnQkE7QUFBQSxNQUVDLGNBQ0M7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLFdBQVcseUVBQ1QsV0FBVyxVQUNQLDZEQUNBLGlEQUNOO0FBQUEsVUFFQztBQUFBLHVCQUFXLFVBQ1YsdUJBQUMsZ0JBQWEsV0FBVSwyQkFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBZ0QsSUFFaEQsdUJBQUMsZUFBWSxXQUFVLDJCQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErQztBQUFBLFlBRWpELHVCQUFDLFVBQUssV0FBVSxxQkFBcUIscUJBQVcsV0FBaEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBd0Q7QUFBQTtBQUFBO0FBQUEsUUFaMUQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BYUE7QUFBQSxTQWpDSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBbUNBO0FBQUEsSUFHQSx1QkFBQyxTQUFJLFdBQVUsMkNBQ2I7QUFBQSw2QkFBQyxRQUFHLFdBQVUsOERBQTZELGtDQUEzRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxNQUdBLHVCQUFDLFNBQUksV0FBVSxtRUFDYjtBQUFBLCtCQUFDLFNBQUksV0FBVSxxQ0FDYjtBQUFBLGlDQUFDLFNBQUksV0FBVSwyQkFDYjtBQUFBLG1DQUFDLFVBQU8sV0FBVSw0QkFBbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMkM7QUFBQSxZQUMzQyx1QkFBQyxVQUFLLFdBQVUsZ0NBQStCLHNDQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFxRTtBQUFBLGVBRnZFO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxVQUNBLHVCQUFDLFVBQUssV0FBVSw0R0FBMkc7QUFBQTtBQUFBLFlBQ3BILHVCQUFDLFlBQU8sV0FBVSw0QkFBMkIsb0NBQTdDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWlFO0FBQUEsZUFEeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLGFBUEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVFBO0FBQUEsUUFDQSx1QkFBQyxPQUFFLFdBQVUsd0RBQXVEO0FBQUE7QUFBQSxVQUNTLHVCQUFDLFVBQUssV0FBVSw0REFBMkQsb0NBQTNFO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStGO0FBQUEsVUFBTztBQUFBLGFBRG5MO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFFBQ0E7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUNDLFNBQVM7QUFBQSxZQUNULFVBQVUsaUJBQWlCLFdBQVcsWUFBWSxDQUFDLG1CQUFtQixNQUFNO0FBQUEsWUFDNUUsV0FBVTtBQUFBLFlBRVQsMEJBQ0MsbUNBQ0U7QUFBQSxxQ0FBQyxXQUFRLFdBQVUscUNBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXFEO0FBQUEsY0FDckQsdUJBQUMsVUFBTSw0QkFBa0IsbUJBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXlDO0FBQUEsaUJBRjNDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBR0EsSUFFQSxtQ0FDRTtBQUFBLHFDQUFDLGVBQVksV0FBVSx3QkFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBNEM7QUFBQSxjQUM1Qyx1QkFBQyxVQUFLLHVEQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQTZDO0FBQUEsaUJBRi9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBR0E7QUFBQTtBQUFBLFVBZEo7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBZ0JBO0FBQUEsV0E3QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQThCQTtBQUFBLE1BR0EsdUJBQUMsU0FBSSxXQUFVLGtCQUNiO0FBQUEsK0JBQUMsU0FBSSxXQUFVLHFDQUNiO0FBQUEsaUNBQUMsVUFBSyxXQUFVLHdEQUF1RCwyQ0FBdkU7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsVUFBSyxXQUFVLHdDQUF1QztBQUFBO0FBQUEsWUFDMUMsdUJBQUMsWUFBTyxXQUFVLGtCQUFrQixpQkFBTyxRQUFRLDhCQUFuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4RTtBQUFBLGVBRDNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxhQU5GO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFPQTtBQUFBLFFBQ0EsdUJBQUMsU0FBSSxXQUFVLHlDQUViO0FBQUE7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLFNBQVM7QUFBQSxjQUNULFVBQVUsaUJBQWlCLFdBQVcsWUFBWSxDQUFDLG1CQUFtQixNQUFNO0FBQUEsY0FDNUUsV0FBVTtBQUFBLGNBRVQsb0JBQ0MsbUNBQ0U7QUFBQSx1Q0FBQyxXQUFRLFdBQVUsMEJBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQTBDO0FBQUEsZ0JBQzFDLHVCQUFDLFVBQUssV0FBVSxxQkFBcUIsMEJBQWdCLFlBQXJEO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQThEO0FBQUEsbUJBRmhFO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBR0EsSUFFQSxtQ0FDRTtBQUFBLHVDQUFDLFNBQUksV0FBVSwyQkFDYjtBQUFBLHlDQUFDLGVBQVksV0FBVSxhQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFpQztBQUFBLGtCQUNqQyx1QkFBQyxVQUFLO0FBQUE7QUFBQSxvQkFBTSxPQUFPLFFBQVE7QUFBQSxvQkFBUTtBQUFBLHVCQUFuQztBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUF1QztBQUFBLHFCQUZ6QztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUdBO0FBQUEsZ0JBQ0EsdUJBQUMsVUFBSyxXQUFVLGdEQUErQyx1Q0FBL0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFFQTtBQUFBLG1CQVBGO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBUUE7QUFBQTtBQUFBLFlBbkJKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQXFCQTtBQUFBLFVBR0E7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLFNBQVM7QUFBQSxjQUNULFVBQVUsaUJBQWlCLFdBQVcsWUFBWSxDQUFDLG1CQUFtQixNQUFNO0FBQUEsY0FDNUUsV0FBVTtBQUFBLGNBRVQscUJBQ0MsbUNBQ0U7QUFBQSx1Q0FBQyxXQUFRLFdBQVUsMEJBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQTBDO0FBQUEsZ0JBQzFDLHVCQUFDLFVBQUssV0FBVSxxQkFBcUIsMkJBQWlCLFlBQXREO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQStEO0FBQUEsbUJBRmpFO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBR0EsSUFFQSxtQ0FDRTtBQUFBLHVDQUFDLFNBQUksV0FBVSwyQkFDYjtBQUFBLHlDQUFDLGlCQUFjLFdBQVUsYUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBbUM7QUFBQSxrQkFDbkMsdUJBQUMsVUFBSztBQUFBO0FBQUEsb0JBQUUsT0FBTyxRQUFRO0FBQUEsb0JBQVE7QUFBQSx1QkFBL0I7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBd0M7QUFBQSxxQkFGMUM7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFHQTtBQUFBLGdCQUNBLHVCQUFDLFVBQUssV0FBVSxnREFBK0MsbUNBQS9EO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBRUE7QUFBQSxtQkFQRjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQVFBO0FBQUE7QUFBQSxZQW5CSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFxQkE7QUFBQSxhQS9DRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBZ0RBO0FBQUEsV0F6REY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQTBEQTtBQUFBLFNBakdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FrR0E7QUFBQSxPQXpVRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBMFVBO0FBRUo7IiwibmFtZXMiOltdfQ==