import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=17b4195c"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=17b4195c"; const useState = __vite__cjsImport1_react["useState"]; const useRef = __vite__cjsImport1_react["useRef"];
import { Youtube, Search, ArrowRight, CheckCircle2, AlertCircle, Loader2, X } from "/node_modules/.vite/deps/lucide-react.js?v=17b4195c";
import { saveTrack, getTracks } from "/src/lib/db.ts";
import { detectMimeType } from "/src/lib/audioHelper.ts";
import { getGitHubConfig, isGitHubConfigured, uploadTrackToGitHub } from "/src/lib/githubSync.ts";
export default function Extractor({ onRefresh }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState(null);
  const [stagedData, setStagedData] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedArtist, setEditedArtist] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedGenre, setEditedGenre] = useState("邦楽");
  const format = "mp3";
  const abortControllerRef = useRef(null);
  const getYoutubeId = (youtubeUrl) => {
    const cleanUrl = youtubeUrl.trim();
    if (cleanUrl.includes("youtu.be/")) {
      const parts = cleanUrl.split("youtu.be/");
      if (parts[1]) {
        const idPart = parts[1].split(/[?#&]/)[0];
        if (idPart.length === 11) return idPart;
      }
    }
    const match = cleanUrl.match(/(?:v=|shorts\/|live\/|embed\/|v\/)([^"&?\/\s]{11})/);
    if (match && match[1]) {
      return match[1];
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const matchFallback = cleanUrl.match(regExp);
    if (matchFallback && matchFallback[2] && matchFallback[2].length === 11) {
      return matchFallback[2];
    }
    return null;
  };
  const parseTitleAndArtist = (rawTitle) => {
    let clean = rawTitle.replace(/\[(MV|Music Video|Official\s*Video|公式|Audio|Official\s*Audio)\]/gi, "").replace(/\((MV|Music Video|Official\s*Video|公式|Audio|Official\s*Audio)\)/gi, "").replace(/【(MV|Music Video|Official\s*Video|公式)】/gi, "").trim();
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
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setStagedData(null);
    const isSuno = url.includes("suno.com");
    const maxRetries = 3;
    let attempt = 0;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    while (attempt < maxRetries) {
      attempt++;
      setStep(
        isSuno ? `Suno楽曲の情報を取得しています... ${attempt > 1 ? `(自動リトライ中 ${attempt}/${maxRetries}回目)` : ""}` : `YouTube動画の情報を取得しています... ${attempt > 1 ? `(自動リトライ中 ${attempt}/${maxRetries}回目)` : ""}`
      );
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: url.trim(), format }),
          signal: controller.signal
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
        const videoId = isSuno ? `suno_${Date.now()}` : getYoutubeId(url.trim()) || `audio_${Date.now()}`;
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
        setStagedData({
          id: videoId,
          title,
          artist,
          youtubeUrl: url.trim(),
          streamUrl: data.streamUrl
        });
        setEditedTitle(title);
        setEditedArtist(artist);
        setStep("音楽の解析が完了しました！タイトルとアーティスト名を確認して保存してください。");
        break;
      } catch (err) {
        if (err.name === "AbortError" || controller.signal.aborted) {
          setError("抽出処理がキャンセルされました。");
          setStep("");
          break;
        }
        console.warn(`Attempt ${attempt} failed:`, err);
        if (attempt >= maxRetries) {
          setError(err.message || "予期せぬエラーが発生しました。時間を置いて再度お試しください。");
          setStep("");
        } else {
          setStep(`サーバーが応答しません。1.5秒後に自動リトライします... (${attempt}/${maxRetries}回目)`);
          await new Promise((resolve, reject) => {
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
    let blobToSave = null;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    while (saveAttempt < maxSaveRetries) {
      saveAttempt++;
      setStep(
        `高音質な${format.toUpperCase()}ファイルをダウンロード中... ` + (saveAttempt > 1 ? `(自動リトライ中 ${saveAttempt}/${maxSaveRetries}回目)` : "")
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
        const contentType = fileRes.headers.get("content-type") || rawBlob.type || "";
        if (contentType.includes("html") || contentType.includes("json") || contentType.includes("text")) {
          const text = await rawBlob.text().catch(() => "");
          console.error("Downloaded non-audio data. Content-Type:", contentType, "Content:", text);
          try {
            const parsed = JSON.parse(text);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (_) {
          }
          throw new Error("音声データの取得に失敗しました。変換サーバーからエラーが返されました。");
        }
        if (rawBlob.size < 5e4) {
          throw new Error("取得された音声ファイルが極端に小さい（50KB未満）ため、不完全または破損しています。");
        }
        const detectedType = await detectMimeType(rawBlob);
        blobToSave = new Blob([rawBlob], { type: detectedType });
        success = true;
        break;
      } catch (err) {
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
          await new Promise((resolve, reject) => {
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
      const newTrack = {
        id: trackId,
        title: editedTitle.trim() || stagedData.title,
        artist: editedArtist.trim() || stagedData.artist || "不明なアーティスト",
        genre: editedGenre,
        youtubeUrl: stagedData.youtubeUrl,
        blob: blobToSave,
        addedAt: Date.now()
      };
      await saveTrack(newTrack);
      const ghConfig = getGitHubConfig();
      if (ghConfig.autoSync && isGitHubConfigured(ghConfig)) {
        try {
          setStep("GitHubリポジトリへコミット保存中...");
          await uploadTrackToGitHub(newTrack, ghConfig, (msg) => setStep(msg));
        } catch (ghErr) {
          console.warn("Auto GitHub sync warning:", ghErr);
        }
      }
      setStep("");
      setUrl("");
      setStagedData(null);
      setEditedTitle("");
      setEditedArtist("");
      onRefresh();
      const ghStatusMsg = ghConfig.autoSync && isGitHubConfigured(ghConfig) ? "ブラウザとGitHubリポジトリの両方に正常保存されました！" : "ブラウザキャッシュに保存されました！「再生モード」でいつでも再生可能です。";
      alert(ghStatusMsg);
    } catch (err) {
      console.error(err);
      setError("キャッシュ保存に失敗しました: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between border-b border-white/5 pb-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "p-2.5 bg-[#FF5F1F]/10 rounded-xl text-[#FF5F1F]", children: /* @__PURE__ */ jsxDEV(Youtube, { className: "w-6 h-6" }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 358,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 357,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-bold tracking-widest text-[#FF5F1F] uppercase block mb-0.5", children: "SOURCE INPUT" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 361,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-lg font-bold text-white tracking-tight", children: "YouTube / Suno から高音質音声を抽出" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 362,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 360,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 356,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "w-2.5 h-2.5 rounded-full bg-[#FF5F1F] glow-orange-dot animate-pulse" }, void 0, false, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 365,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Extractor.tsx",
      lineNumber: 355,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("form", { onSubmit: handleExtract, className: "space-y-4", children: /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
        /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 371,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            placeholder: "YouTubeの動画リンク、またはSunoの楽曲リンク（https://suno.com/...）",
            value: url,
            onChange: (e) => setUrl(e.target.value),
            disabled: loading || isSaving,
            className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-4 pl-12 pr-4 outline-none text-base md:text-sm transition font-mono"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 372,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 370,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "submit",
          disabled: loading || isSaving || !url.trim(),
          className: "w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-[#FF5F1F] hover:text-black transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40",
          children: loading ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 animate-spin" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 389,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "サーバー処理中..." }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 390,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 388,
            columnNumber: 15
          }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV("span", { children: "音声を MP3 に変換" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 394,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV(ArrowRight, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 395,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 393,
            columnNumber: 15
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 382,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Extractor.tsx",
      lineNumber: 369,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/Extractor.tsx",
      lineNumber: 368,
      columnNumber: 7
    }, this),
    (loading || step) && /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-3 min-w-0 flex-1", children: [
        loading || isSaving ? /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 text-[#FF5F1F] animate-spin mt-0.5 flex-shrink-0" }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 407,
          columnNumber: 15
        }, this) : /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "w-5 h-5 text-[#FF5F1F] mt-0.5 flex-shrink-0" }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 409,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-1 min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold text-[#FF5F1F] tracking-wider uppercase", children: loading || isSaving ? "CONVERTING AUDIO" : "CONVERSION SUCCESSFUL" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 412,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-300 leading-relaxed font-mono break-all", children: step }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 415,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 411,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 405,
        columnNumber: 11
      }, this),
      (loading || isSaving) && /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          onClick: handleCancel,
          className: "flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded-lg border border-rose-500/20 transition active:scale-95 cursor-pointer flex-shrink-0",
          title: "キャンセル",
          children: [
            /* @__PURE__ */ jsxDEV(X, { className: "w-3.5 h-3.5" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 425,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "キャンセル" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 426,
              columnNumber: 15
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 419,
          columnNumber: 13
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Extractor.tsx",
      lineNumber: 404,
      columnNumber: 9
    }, this),
    error && /* @__PURE__ */ jsxDEV("div", { className: "bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 flex items-start gap-3", children: [
      /* @__PURE__ */ jsxDEV(AlertCircle, { className: "w-5 h-5 mt-0.5 flex-shrink-0" }, void 0, false, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 435,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-wider", children: "Extraction Failed" }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 437,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-rose-300 leading-relaxed font-mono", children: error }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 438,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 436,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Extractor.tsx",
      lineNumber: 434,
      columnNumber: 9
    }, this),
    stagedData && /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "p-3 bg-[#FF5F1F]/20 rounded-xl text-[#FF5F1F] flex-shrink-0 font-bold uppercase", children: format }, void 0, false, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 447,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] uppercase font-bold tracking-widest text-[#FF5F1F] bg-[#FF5F1F]/15 px-2.5 py-0.5 rounded-full", children: "READY TO CACHE" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 451,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("h4", { className: "text-sm font-medium text-slate-200 truncate mt-1.5 font-mono", children: stagedData.title }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 454,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 450,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 446,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] uppercase tracking-widest font-bold text-white/40 block", children: "曲名" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 462,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              value: editedTitle,
              onChange: (e) => setEditedTitle(e.target.value),
              disabled: isSaving,
              className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-lg py-3 px-4 outline-none text-base md:text-sm transition font-medium",
              placeholder: "曲名を入力してください"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 465,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 461,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] uppercase tracking-widest font-bold text-white/40 block", children: "アーティスト名" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 476,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: handleSwap,
                disabled: isSaving,
                className: "text-[9px] text-[#FF5F1F] hover:underline flex items-center gap-1 cursor-pointer",
                title: "曲名とアーティスト名を入れ替える",
                children: "⇄ 入れ替え"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Extractor.tsx",
                lineNumber: 479,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 475,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              value: editedArtist,
              onChange: (e) => setEditedArtist(e.target.value),
              disabled: isSaving,
              className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-lg py-3 px-4 outline-none text-base md:text-sm transition font-medium",
              placeholder: "アーティスト名を入力してください"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 489,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 474,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] uppercase tracking-widest font-bold text-white/40 block", children: "ジャンル選択" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 499,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-lg border border-white/10 h-[46px] items-center", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setEditedGenre("邦楽"),
                disabled: isSaving,
                className: `h-full rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${editedGenre === "邦楽" ? "bg-[#FF5F1F] text-black shadow font-extrabold" : "text-slate-400 hover:text-white"}`,
                children: "邦楽 (J-POP)"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Extractor.tsx",
                lineNumber: 503,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setEditedGenre("洋楽"),
                disabled: isSaving,
                className: `h-full rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${editedGenre === "洋楽" ? "bg-[#FF5F1F] text-black shadow font-extrabold" : "text-slate-400 hover:text-white"}`,
                children: "洋楽 (Western)"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Extractor.tsx",
                lineNumber: 515,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 502,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 498,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Extractor.tsx",
        lineNumber: 460,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handleSave,
          disabled: isSaving || !editedTitle.trim(),
          className: "w-full bg-[#FF5F1F] hover:bg-[#FF5F1F]/80 text-black font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40",
          children: isSaving ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 animate-spin" }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 538,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "ローカルに書き込み中..." }, void 0, false, {
              fileName: "/app/applet/src/components/Extractor.tsx",
              lineNumber: 539,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 537,
            columnNumber: 15
          }, this) : /* @__PURE__ */ jsxDEV("span", { children: "この内容で安全にキャッシュ保存" }, void 0, false, {
            fileName: "/app/applet/src/components/Extractor.tsx",
            lineNumber: 542,
            columnNumber: 15
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Extractor.tsx",
          lineNumber: 531,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Extractor.tsx",
      lineNumber: 445,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/components/Extractor.tsx",
    lineNumber: 354,
    columnNumber: 5
  }, this);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkV4dHJhY3Rvci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VSZWYgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IFlvdXR1YmUsIFNlYXJjaCwgQXJyb3dSaWdodCwgQ2hlY2tDaXJjbGUyLCBBbGVydENpcmNsZSwgTG9hZGVyMiwgTXVzaWM0LCBYLCBHaXRodWIgfSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5pbXBvcnQgeyBzYXZlVHJhY2ssIGdldFRyYWNrcyB9IGZyb20gXCIuLi9saWIvZGJcIjtcbmltcG9ydCB7IFRyYWNrIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBkZXRlY3RNaW1lVHlwZSB9IGZyb20gXCIuLi9saWIvYXVkaW9IZWxwZXJcIjtcbmltcG9ydCB7IGdldEdpdEh1YkNvbmZpZywgaXNHaXRIdWJDb25maWd1cmVkLCB1cGxvYWRUcmFja1RvR2l0SHViIH0gZnJvbSBcIi4uL2xpYi9naXRodWJTeW5jXCI7XG5cbmludGVyZmFjZSBFeHRyYWN0b3JQcm9wcyB7XG4gIG9uUmVmcmVzaDogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRXh0cmFjdG9yKHsgb25SZWZyZXNoIH06IEV4dHJhY3RvclByb3BzKSB7XG4gIGNvbnN0IFt1cmwsIHNldFVybF0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbc3RlcCwgc2V0U3RlcF0gPSB1c2VTdGF0ZTxzdHJpbmc+KFwiXCIpO1xuICBjb25zdCBbZXJyb3IsIHNldEVycm9yXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBcbiAgLy8gU3RhZ2luZyBleHRyYWN0ZWQgdHJhY2sgZGF0YSBiZWZvcmUgc2F2aW5nXG4gIGNvbnN0IFtzdGFnZWREYXRhLCBzZXRTdGFnZWREYXRhXSA9IHVzZVN0YXRlPHtcbiAgICBpZDogc3RyaW5nO1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgYXJ0aXN0Pzogc3RyaW5nO1xuICAgIHlvdXR1YmVVcmw6IHN0cmluZztcbiAgICBzdHJlYW1Vcmw6IHN0cmluZztcbiAgfSB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbZWRpdGVkVGl0bGUsIHNldEVkaXRlZFRpdGxlXSA9IHVzZVN0YXRlKFwiXCIpO1xuICBjb25zdCBbZWRpdGVkQXJ0aXN0LCBzZXRFZGl0ZWRBcnRpc3RdID0gdXNlU3RhdGUoXCJcIik7XG4gIGNvbnN0IFtpc1NhdmluZywgc2V0SXNTYXZpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZWRpdGVkR2VucmUsIHNldEVkaXRlZEdlbnJlXSA9IHVzZVN0YXRlPFwi6YKm5qW9XCIgfCBcIua0i+alvVwiPihcIumCpualvVwiKTtcbiAgY29uc3QgZm9ybWF0ID0gXCJtcDNcIjtcbiAgY29uc3QgYWJvcnRDb250cm9sbGVyUmVmID0gdXNlUmVmPEFib3J0Q29udHJvbGxlciB8IG51bGw+KG51bGwpO1xuXG4gIC8vIEhlbHBlciB0byBleHRyYWN0IFlvdVR1YmUgdmlkZW8gSURcbiAgY29uc3QgZ2V0WW91dHViZUlkID0gKHlvdXR1YmVVcmw6IHN0cmluZyk6IHN0cmluZyB8IG51bGwgPT4ge1xuICAgIGNvbnN0IGNsZWFuVXJsID0geW91dHViZVVybC50cmltKCk7XG4gICAgXG4gICAgLy8gMS4gQ2hlY2sgZm9yIHlvdXR1LmJlXG4gICAgaWYgKGNsZWFuVXJsLmluY2x1ZGVzKFwieW91dHUuYmUvXCIpKSB7XG4gICAgICBjb25zdCBwYXJ0cyA9IGNsZWFuVXJsLnNwbGl0KFwieW91dHUuYmUvXCIpO1xuICAgICAgaWYgKHBhcnRzWzFdKSB7XG4gICAgICAgIGNvbnN0IGlkUGFydCA9IHBhcnRzWzFdLnNwbGl0KC9bPyMmXS8pWzBdO1xuICAgICAgICBpZiAoaWRQYXJ0Lmxlbmd0aCA9PT0gMTEpIHJldHVybiBpZFBhcnQ7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIDIuIENoZWNrIGZvciB3YXRjaD92PSBvciBzaG9ydHMvIG9yIGxpdmUvIG9yIGVtYmVkLyBvciB2L1xuICAgIGNvbnN0IG1hdGNoID0gY2xlYW5VcmwubWF0Y2goLyg/OnY9fHNob3J0c1xcL3xsaXZlXFwvfGVtYmVkXFwvfHZcXC8pKFteXCImP1xcL1xcc117MTF9KS8pO1xuICAgIGlmIChtYXRjaCAmJiBtYXRjaFsxXSkge1xuICAgICAgcmV0dXJuIG1hdGNoWzFdO1xuICAgIH1cbiAgICBcbiAgICAvLyAzLiBGYWxsYmFjayByZWdleFxuICAgIGNvbnN0IHJlZ0V4cCA9IC9eLiooeW91dHUuYmVcXC98dlxcL3x1XFwvXFx3XFwvfGVtYmVkXFwvfHdhdGNoXFw/dj18XFwmdj0pKFteI1xcJlxcP10qKS4qLztcbiAgICBjb25zdCBtYXRjaEZhbGxiYWNrID0gY2xlYW5VcmwubWF0Y2gocmVnRXhwKTtcbiAgICBpZiAobWF0Y2hGYWxsYmFjayAmJiBtYXRjaEZhbGxiYWNrWzJdICYmIG1hdGNoRmFsbGJhY2tbMl0ubGVuZ3RoID09PSAxMSkge1xuICAgICAgcmV0dXJuIG1hdGNoRmFsbGJhY2tbMl07XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIC8vIFBhcnNlIFlvdVR1YmUgdGl0bGUgaW50byB0aXRsZSBhbmQgYXJ0aXN0XG4gIGNvbnN0IHBhcnNlVGl0bGVBbmRBcnRpc3QgPSAocmF3VGl0bGU6IHN0cmluZyk6IHsgdGl0bGU6IHN0cmluZzsgYXJ0aXN0OiBzdHJpbmcgfSA9PiB7XG4gICAgbGV0IGNsZWFuID0gcmF3VGl0bGVcbiAgICAgIC5yZXBsYWNlKC9cXFsoTVZ8TXVzaWMgVmlkZW98T2ZmaWNpYWxcXHMqVmlkZW985YWs5byPfEF1ZGlvfE9mZmljaWFsXFxzKkF1ZGlvKVxcXS9naSwgXCJcIilcbiAgICAgIC5yZXBsYWNlKC9cXCgoTVZ8TXVzaWMgVmlkZW98T2ZmaWNpYWxcXHMqVmlkZW985YWs5byPfEF1ZGlvfE9mZmljaWFsXFxzKkF1ZGlvKVxcKS9naSwgXCJcIilcbiAgICAgIC5yZXBsYWNlKC/jgJAoTVZ8TXVzaWMgVmlkZW98T2ZmaWNpYWxcXHMqVmlkZW985YWs5byPKeOAkS9naSwgXCJcIilcbiAgICAgIC50cmltKCk7XG5cbiAgICBjb25zdCBzZXBhcmF0b3JzID0gW1wiIC0gXCIsIFwiIOKAlCBcIiwgXCIgLyBcIiwgXCIgfCBcIl07XG4gICAgZm9yIChjb25zdCBzZXAgb2Ygc2VwYXJhdG9ycykge1xuICAgICAgaWYgKGNsZWFuLmluY2x1ZGVzKHNlcCkpIHtcbiAgICAgICAgY29uc3QgcGFydHMgPSBjbGVhbi5zcGxpdChzZXApO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICBjb25zdCBwYXJ0MSA9IHBhcnRzWzBdLnRyaW0oKTtcbiAgICAgICAgICBjb25zdCBwYXJ0MiA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oc2VwKS50cmltKCk7XG4gICAgICAgICAgcmV0dXJuIHsgYXJ0aXN0OiBwYXJ0MSwgdGl0bGU6IHBhcnQyIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgdGl0bGU6IGNsZWFuLCBhcnRpc3Q6IFwiXCIgfTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVTd2FwID0gKCkgPT4ge1xuICAgIGNvbnN0IHRlbXAgPSBlZGl0ZWRUaXRsZTtcbiAgICBzZXRFZGl0ZWRUaXRsZShlZGl0ZWRBcnRpc3QpO1xuICAgIHNldEVkaXRlZEFydGlzdCh0ZW1wKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVDYW5jZWwgPSAoKSA9PiB7XG4gICAgaWYgKGFib3J0Q29udHJvbGxlclJlZi5jdXJyZW50KSB7XG4gICAgICBhYm9ydENvbnRyb2xsZXJSZWYuY3VycmVudC5hYm9ydCgpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVFeHRyYWN0ID0gYXN5bmMgKGU6IFJlYWN0LkZvcm1FdmVudCkgPT4ge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBpZiAoIXVybC50cmltKCkpIHJldHVybjtcblxuICAgIHNldExvYWRpbmcodHJ1ZSk7XG4gICAgc2V0RXJyb3IobnVsbCk7XG4gICAgc2V0U3RhZ2VkRGF0YShudWxsKTtcbiAgICBcbiAgICBjb25zdCBpc1N1bm8gPSB1cmwuaW5jbHVkZXMoXCJzdW5vLmNvbVwiKTtcbiAgICBjb25zdCBtYXhSZXRyaWVzID0gMztcbiAgICBsZXQgYXR0ZW1wdCA9IDA7XG4gICAgXG4gICAgLy8gQ3JlYXRlIG5ldyBBYm9ydENvbnRyb2xsZXIgZm9yIHRoaXMgc2Vzc2lvblxuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgYWJvcnRDb250cm9sbGVyUmVmLmN1cnJlbnQgPSBjb250cm9sbGVyO1xuXG4gICAgd2hpbGUgKGF0dGVtcHQgPCBtYXhSZXRyaWVzKSB7XG4gICAgICBhdHRlbXB0Kys7XG4gICAgICBzZXRTdGVwKFxuICAgICAgICBpc1N1bm8gXG4gICAgICAgICAgPyBgU3Vub+alveabsuOBruaDheWgseOCkuWPluW+l+OBl+OBpuOBhOOBvuOBmS4uLiAke2F0dGVtcHQgPiAxID8gYCjoh6rli5Xjg6rjg4jjg6njgqTkuK0gJHthdHRlbXB0fS8ke21heFJldHJpZXN95Zue55uuKWAgOiBcIlwifWBcbiAgICAgICAgICA6IGBZb3VUdWJl5YuV55S744Gu5oOF5aCx44KS5Y+W5b6X44GX44Gm44GE44G+44GZLi4uICR7YXR0ZW1wdCA+IDEgPyBgKOiHquWLleODquODiOODqeOCpOS4rSAke2F0dGVtcHR9LyR7bWF4UmV0cmllc33lm57nm64pYCA6IFwiXCJ9YFxuICAgICAgKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcIi9hcGkvZXh0cmFjdFwiLCB7XG4gICAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXJsOiB1cmwudHJpbSgpLCBmb3JtYXQgfSksXG4gICAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIGNvbnN0IGVyckpzb24gPSBhd2FpdCByZXNwb25zZS5qc29uKCkuY2F0Y2goKCkgPT4gKHt9KSk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVyckpzb24uZXJyb3IgfHwgYOOCqOODqeODvOOBjOeZuueUn+OBl+OBvuOBl+OBn++8iOOCs+ODvOODiTogJHtyZXNwb25zZS5zdGF0dXN977yJYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oXCJBYm9ydGVkXCIsIFwiQWJvcnRFcnJvclwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldFN0ZXAoaXNTdW5vID8gXCJTdW5v44Gu6Z+z5qW944OH44O844K/44KS5rqW5YKZ5LitLi4uXCIgOiBg44K144O844OQ44O85YG044GnJHtmb3JtYXQudG9VcHBlckNhc2UoKX3pn7Plo7Djgrnjg4jjg6rjg7zjg6DjgpLlpInmj5vjg7vnlJ/miJDkuK0uLi5gKTtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcblxuICAgICAgICBpZiAoY29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oXCJBYm9ydGVkXCIsIFwiQWJvcnRFcnJvclwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZGF0YS5zdWNjZXNzIHx8ICFkYXRhLnN0cmVhbVVybCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yIHx8IFwi6Z+z5aOw44OV44Kh44Kk44Or44Gu55Sf5oiQ44Gr5aSx5pWX44GX44G+44GX44Gf44CCXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmlkZW9JZCA9IGlzU3VubyA/IGBzdW5vXyR7RGF0ZS5ub3coKX1gIDogKGdldFlvdXR1YmVJZCh1cmwudHJpbSgpKSB8fCBgYXVkaW9fJHtEYXRlLm5vdygpfWApO1xuICAgICAgICBcbiAgICAgICAgbGV0IHRpdGxlID0gXCJcIjtcbiAgICAgICAgbGV0IGFydGlzdCA9IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF0YS5hcnRpc3QpIHtcbiAgICAgICAgICB0aXRsZSA9IGRhdGEudGl0bGU7XG4gICAgICAgICAgYXJ0aXN0ID0gZGF0YS5hcnRpc3Q7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VUaXRsZUFuZEFydGlzdChkYXRhLnRpdGxlIHx8IFwiWW91VHViZSBBdWRpbyBUcmFja1wiKTtcbiAgICAgICAgICB0aXRsZSA9IHBhcnNlZC50aXRsZTtcbiAgICAgICAgICBhcnRpc3QgPSBwYXJzZWQuYXJ0aXN0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RhZ2UgZm9yIHRpdGxlIHZlcmlmaWNhdGlvbiAvIGVkaXRpbmdcbiAgICAgICAgc2V0U3RhZ2VkRGF0YSh7XG4gICAgICAgICAgaWQ6IHZpZGVvSWQsXG4gICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgIGFydGlzdDogYXJ0aXN0LFxuICAgICAgICAgIHlvdXR1YmVVcmw6IHVybC50cmltKCksXG4gICAgICAgICAgc3RyZWFtVXJsOiBkYXRhLnN0cmVhbVVybCxcbiAgICAgICAgfSk7XG4gICAgICAgIHNldEVkaXRlZFRpdGxlKHRpdGxlKTtcbiAgICAgICAgc2V0RWRpdGVkQXJ0aXN0KGFydGlzdCk7XG4gICAgICAgIHNldFN0ZXAoXCLpn7Pmpb3jga7op6PmnpDjgYzlrozkuobjgZfjgb7jgZfjgZ/vvIHjgr/jgqTjg4jjg6vjgajjgqLjg7zjg4bjgqPjgrnjg4jlkI3jgpLnorroqo3jgZfjgabkv53lrZjjgZfjgabjgY/jgaDjgZXjgYTjgIJcIik7XG4gICAgICAgIGJyZWFrOyAvLyBTdWNjZXNzISBFeGl0IHJldHJ5IGxvb3AuXG5cbiAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgIGlmIChlcnIubmFtZSA9PT0gXCJBYm9ydEVycm9yXCIgfHwgY29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xuICAgICAgICAgIHNldEVycm9yKFwi5oq95Ye65Yem55CG44GM44Kt44Oj44Oz44K744Or44GV44KM44G+44GX44Gf44CCXCIpO1xuICAgICAgICAgIHNldFN0ZXAoXCJcIik7XG4gICAgICAgICAgYnJlYWs7IC8vIFN0b3AgaW1tZWRpYXRlbHkgb24gY2FuY2VsXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLndhcm4oYEF0dGVtcHQgJHthdHRlbXB0fSBmYWlsZWQ6YCwgZXJyKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRlbXB0ID49IG1heFJldHJpZXMpIHtcbiAgICAgICAgICBzZXRFcnJvcihlcnIubWVzc2FnZSB8fCBcIuS6iOacn+OBm+OBrOOCqOODqeODvOOBjOeZuueUn+OBl+OBvuOBl+OBn+OAguaZgumWk+OCkue9ruOBhOOBpuWGjeW6puOBiuippuOBl+OBj+OBoOOBleOBhOOAglwiKTtcbiAgICAgICAgICBzZXRTdGVwKFwiXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFsZXJ0IHVzZXIgYW5kIHdhaXQgYmVmb3JlIHJldHJ5LCBzdXBwb3J0IGFib3J0IGR1cmluZyB3YWl0XG4gICAgICAgICAgc2V0U3RlcChg44K144O844OQ44O844GM5b+c562U44GX44G+44Gb44KT44CCMS4156eS5b6M44Gr6Ieq5YuV44Oq44OI44Op44Kk44GX44G+44GZLi4uICgke2F0dGVtcHR9LyR7bWF4UmV0cmllc33lm57nm64pYCk7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQocmVzb2x2ZSwgMTUwMCk7XG4gICAgICAgICAgICBjb250cm9sbGVyLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgIHJlamVjdChuZXcgRE9NRXhjZXB0aW9uKFwiQWJvcnRlZFwiLCBcIkFib3J0RXJyb3JcIikpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBhYm9ydENvbnRyb2xsZXJSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0TG9hZGluZyhmYWxzZSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlU2F2ZSA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAoIXN0YWdlZERhdGEpIHJldHVybjtcblxuICAgIHNldElzU2F2aW5nKHRydWUpO1xuICAgIHNldEVycm9yKG51bGwpO1xuXG4gICAgY29uc3QgbWF4U2F2ZVJldHJpZXMgPSAzO1xuICAgIGxldCBzYXZlQXR0ZW1wdCA9IDA7XG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICBsZXQgYmxvYlRvU2F2ZTogQmxvYiB8IG51bGwgPSBudWxsO1xuXG4gICAgLy8gQ3JlYXRlIGFib3J0IGNvbnRyb2xsZXIgZm9yIGRvd25sb2FkaW5nIHBoYXNlXG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBhYm9ydENvbnRyb2xsZXJSZWYuY3VycmVudCA9IGNvbnRyb2xsZXI7XG5cbiAgICB3aGlsZSAoc2F2ZUF0dGVtcHQgPCBtYXhTYXZlUmV0cmllcykge1xuICAgICAgc2F2ZUF0dGVtcHQrKztcbiAgICAgIHNldFN0ZXAoXG4gICAgICAgIGDpq5jpn7Pos6rjgaoke2Zvcm1hdC50b1VwcGVyQ2FzZSgpfeODleOCoeOCpOODq+OCkuODgOOCpuODs+ODreODvOODieS4rS4uLiBgICtcbiAgICAgICAgKHNhdmVBdHRlbXB0ID4gMSA/IGAo6Ieq5YuV44Oq44OI44Op44Kk5LitICR7c2F2ZUF0dGVtcHR9LyR7bWF4U2F2ZVJldHJpZXN95Zue55uuKWAgOiBcIlwiKVxuICAgICAgKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZmlsZVJlcyA9IGF3YWl0IGZldGNoKHN0YWdlZERhdGEuc3RyZWFtVXJsLCB7XG4gICAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWZpbGVSZXMub2spIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOmfs+WjsOODleOCoeOCpOODq+OBruODgOOCpuODs+ODreODvOODieOBq+WkseaVl+OBl+OBvuOBl+OBn++8iOOCueODhuODvOOCv+OCuTogJHtmaWxlUmVzLnN0YXR1c33vvIlgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJhd0Jsb2IgPSBhd2FpdCBmaWxlUmVzLmJsb2IoKTtcblxuICAgICAgICBpZiAoY29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oXCJBYm9ydGVkXCIsIFwiQWJvcnRFcnJvclwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXR1cm5lZCBkYXRhIGlzIEhUTUwgb3IgSlNPTiBlcnJvciBpbnN0ZWFkIG9mIGF1ZGlvIGJpbmFyeVxuICAgICAgICBjb25zdCBjb250ZW50VHlwZSA9IGZpbGVSZXMuaGVhZGVycy5nZXQoXCJjb250ZW50LXR5cGVcIikgfHwgcmF3QmxvYi50eXBlIHx8IFwiXCI7XG4gICAgICAgIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcyhcImh0bWxcIikgfHwgY29udGVudFR5cGUuaW5jbHVkZXMoXCJqc29uXCIpIHx8IGNvbnRlbnRUeXBlLmluY2x1ZGVzKFwidGV4dFwiKSkge1xuICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCByYXdCbG9iLnRleHQoKS5jYXRjaCgoKSA9PiBcIlwiKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRG93bmxvYWRlZCBub24tYXVkaW8gZGF0YS4gQ29udGVudC1UeXBlOlwiLCBjb250ZW50VHlwZSwgXCJDb250ZW50OlwiLCB0ZXh0KTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgICAgICAgIGlmIChwYXJzZWQuZXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHBhcnNlZC5lcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoXykge31cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCLpn7Plo7Djg4fjg7zjgr/jga7lj5blvpfjgavlpLHmlZfjgZfjgb7jgZfjgZ/jgILlpInmj5vjgrXjg7zjg5Djg7zjgYvjgonjgqjjg6njg7zjgYzov5TjgZXjgozjgb7jgZfjgZ/jgIJcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWZXJpZnkgc2l6ZVxuICAgICAgICBpZiAocmF3QmxvYi5zaXplIDwgNTAwMDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCLlj5blvpfjgZXjgozjgZ/pn7Plo7Djg5XjgqHjgqTjg6vjgYzmpbXnq6/jgavlsI/jgZXjgYTvvIg1MEtC5pyq5rqA77yJ44Gf44KB44CB5LiN5a6M5YWo44G+44Gf44Gv56C05pCN44GX44Gm44GE44G+44GZ44CCXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IGFuZCB1c2UgY29ycmVjdCBNSU1FIHR5cGVcbiAgICAgICAgY29uc3QgZGV0ZWN0ZWRUeXBlID0gYXdhaXQgZGV0ZWN0TWltZVR5cGUocmF3QmxvYik7XG4gICAgICAgIGJsb2JUb1NhdmUgPSBuZXcgQmxvYihbcmF3QmxvYl0sIHsgdHlwZTogZGV0ZWN0ZWRUeXBlIH0pO1xuICAgICAgICBzdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7IC8vIFN1Y2Nlc3MhIEV4aXQgbG9vcFxuXG4gICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICBpZiAoZXJyLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiIHx8IGNvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQpIHtcbiAgICAgICAgICBzZXRFcnJvcihcIuODgOOCpuODs+ODreODvOODieOBjOOCreODo+ODs+OCu+ODq+OBleOCjOOBvuOBl+OBn+OAglwiKTtcbiAgICAgICAgICBzZXRTdGVwKFwiXCIpO1xuICAgICAgICAgIHNldElzU2F2aW5nKGZhbHNlKTtcbiAgICAgICAgICBhYm9ydENvbnRyb2xsZXJSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS53YXJuKGBEb3dubG9hZCBhdHRlbXB0ICR7c2F2ZUF0dGVtcHR9IGZhaWxlZDpgLCBlcnIpO1xuXG4gICAgICAgIGlmIChzYXZlQXR0ZW1wdCA+PSBtYXhTYXZlUmV0cmllcykge1xuICAgICAgICAgIHNldEVycm9yKGVyci5tZXNzYWdlIHx8IFwi6Z+z5aOw44OV44Kh44Kk44Or44Gu44OA44Km44Oz44Ot44O844OJ44Gr5aSx5pWX44GX44G+44GX44Gf44CC5pmC6ZaT44KS572u44GE44Gm5YaN5bqm44GK6Kmm44GX44GP44Gg44GV44GE44CCXCIpO1xuICAgICAgICAgIHNldFN0ZXAoXCJcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2V0U3RlcChg44OA44Km44Oz44Ot44O844OJ44Gr5aSx5pWX44GX44G+44GX44Gf44CCMS4156eS5b6M44Gr6Ieq5YuV44Oq44OI44Op44Kk44GX44G+44GZLi4uICgke3NhdmVBdHRlbXB0fS8ke21heFNhdmVSZXRyaWVzfeWbnuebrilgKTtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dChyZXNvbHZlLCAxNTAwKTtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgcmVqZWN0KG5ldyBET01FeGNlcHRpb24oXCJBYm9ydGVkXCIsIFwiQWJvcnRFcnJvclwiKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGFib3J0Q29udHJvbGxlclJlZi5jdXJyZW50ID0gbnVsbDtcblxuICAgIGlmICghc3VjY2VzcyB8fCAhYmxvYlRvU2F2ZSkge1xuICAgICAgc2V0SXNTYXZpbmcoZmFsc2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBzZXRTdGVwKFwi44OW44Op44Km44K244Gu5a6J5YWo44Gq44Kt44Oj44OD44K344Ol77yISW5kZXhlZERC77yJ44Gr5pu444GN6L6844G/5LitLi4uXCIpO1xuXG4gICAgICBjb25zdCBleGlzdGluZ1RyYWNrcyA9IGF3YWl0IGdldFRyYWNrcygpO1xuICAgICAgY29uc3QgaXNEdXBsaWNhdGUgPSBleGlzdGluZ1RyYWNrcy5zb21lKCh0KSA9PiB0LmlkID09PSBzdGFnZWREYXRhLmlkKTtcbiAgICAgIGNvbnN0IHRyYWNrSWQgPSBpc0R1cGxpY2F0ZSA/IGAke3N0YWdlZERhdGEuaWR9XyR7RGF0ZS5ub3coKX1gIDogc3RhZ2VkRGF0YS5pZDtcblxuICAgICAgY29uc3QgbmV3VHJhY2s6IFRyYWNrID0ge1xuICAgICAgICBpZDogdHJhY2tJZCxcbiAgICAgICAgdGl0bGU6IGVkaXRlZFRpdGxlLnRyaW0oKSB8fCBzdGFnZWREYXRhLnRpdGxlLFxuICAgICAgICBhcnRpc3Q6IGVkaXRlZEFydGlzdC50cmltKCkgfHwgc3RhZ2VkRGF0YS5hcnRpc3QgfHwgXCLkuI3mmI7jgarjgqLjg7zjg4bjgqPjgrnjg4hcIixcbiAgICAgICAgZ2VucmU6IGVkaXRlZEdlbnJlLFxuICAgICAgICB5b3V0dWJlVXJsOiBzdGFnZWREYXRhLnlvdXR1YmVVcmwsXG4gICAgICAgIGJsb2I6IGJsb2JUb1NhdmUsXG4gICAgICAgIGFkZGVkQXQ6IERhdGUubm93KCksXG4gICAgICB9O1xuXG4gICAgICBhd2FpdCBzYXZlVHJhY2sobmV3VHJhY2spO1xuXG4gICAgICAvLyBBdXRvIHN5bmMgdG8gR2l0SHViIGlmIGVuYWJsZWQgYW5kIGNvbmZpZ3VyZWRcbiAgICAgIGNvbnN0IGdoQ29uZmlnID0gZ2V0R2l0SHViQ29uZmlnKCk7XG4gICAgICBpZiAoZ2hDb25maWcuYXV0b1N5bmMgJiYgaXNHaXRIdWJDb25maWd1cmVkKGdoQ29uZmlnKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNldFN0ZXAoXCJHaXRIdWLjg6rjg53jgrjjg4jjg6rjgbjjgrPjg5/jg4Pjg4jkv53lrZjkuK0uLi5cIik7XG4gICAgICAgICAgYXdhaXQgdXBsb2FkVHJhY2tUb0dpdEh1YihuZXdUcmFjaywgZ2hDb25maWcsIChtc2cpID0+IHNldFN0ZXAobXNnKSk7XG4gICAgICAgIH0gY2F0Y2ggKGdoRXJyOiBhbnkpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdXRvIEdpdEh1YiBzeW5jIHdhcm5pbmc6XCIsIGdoRXJyKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzZXRTdGVwKFwiXCIpO1xuICAgICAgc2V0VXJsKFwiXCIpO1xuICAgICAgc2V0U3RhZ2VkRGF0YShudWxsKTtcbiAgICAgIHNldEVkaXRlZFRpdGxlKFwiXCIpO1xuICAgICAgc2V0RWRpdGVkQXJ0aXN0KFwiXCIpO1xuICAgICAgb25SZWZyZXNoKCk7XG4gICAgICBcbiAgICAgIGNvbnN0IGdoU3RhdHVzTXNnID0gZ2hDb25maWcuYXV0b1N5bmMgJiYgaXNHaXRIdWJDb25maWd1cmVkKGdoQ29uZmlnKVxuICAgICAgICA/IFwi44OW44Op44Km44K244GoR2l0SHVi44Oq44Od44K444OI44Oq44Gu5Lih5pa544Gr5q2j5bi45L+d5a2Y44GV44KM44G+44GX44Gf77yBXCJcbiAgICAgICAgOiBcIuODluODqeOCpuOCtuOCreODo+ODg+OCt+ODpeOBq+S/neWtmOOBleOCjOOBvuOBl+OBn++8geOAjOWGjeeUn+ODouODvOODieOAjeOBp+OBhOOBpOOBp+OCguWGjeeUn+WPr+iDveOBp+OBmeOAglwiO1xuICAgICAgYWxlcnQoZ2hTdGF0dXNNc2cpO1xuXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHNldEVycm9yKFwi44Kt44Oj44OD44K344Ol5L+d5a2Y44Gr5aSx5pWX44GX44G+44GX44GfOiBcIiArIGVyci5tZXNzYWdlKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0SXNTYXZpbmcoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtM3hsIHAtNiBzbTpwLTggc3BhY2UteS02IHNoYWRvdy0yeGxcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJvcmRlci1iIGJvcmRlci13aGl0ZS81IHBiLTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC0yLjUgYmctWyNGRjVGMUZdLzEwIHJvdW5kZWQteGwgdGV4dC1bI0ZGNUYxRl1cIj5cbiAgICAgICAgICAgIDxZb3V0dWJlIGNsYXNzTmFtZT1cInctNiBoLTZcIiAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LWJvbGQgdHJhY2tpbmctd2lkZXN0IHRleHQtWyNGRjVGMUZdIHVwcGVyY2FzZSBibG9jayBtYi0wLjVcIj5TT1VSQ0UgSU5QVVQ8L3NwYW4+XG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJvbGQgdGV4dC13aGl0ZSB0cmFja2luZy10aWdodFwiPllvdVR1YmUgLyBTdW5vIOOBi+OCiemrmOmfs+izqumfs+WjsOOCkuaKveWHujwvaDI+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMi41IGgtMi41IHJvdW5kZWQtZnVsbCBiZy1bI0ZGNUYxRl0gZ2xvdy1vcmFuZ2UtZG90IGFuaW1hdGUtcHVsc2VcIj48L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8Zm9ybSBvblN1Ym1pdD17aGFuZGxlRXh0cmFjdH0gY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmVcIj5cbiAgICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVwiYWJzb2x1dGUgbGVmdC00IHRvcC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB3LTUgaC01IHRleHQtc2xhdGUtNTAwXCIgLz5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiWW91VHViZeOBruWLleeUu+ODquODs+OCr+OAgeOBvuOBn+OBr1N1bm/jga7mpb3mm7Ljg6rjg7Pjgq/vvIhodHRwczovL3N1bm8uY29tLy4uLu+8iVwiXG4gICAgICAgICAgICAgIHZhbHVlPXt1cmx9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0VXJsKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgZGlzYWJsZWQ9e2xvYWRpbmcgfHwgaXNTYXZpbmd9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1ibGFjay80MCB0ZXh0LXNsYXRlLTEwMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIGZvY3VzOmJvcmRlci1bI0ZGNUYxRl0gcm91bmRlZC14bCBweS00IHBsLTEyIHByLTQgb3V0bGluZS1ub25lIHRleHQtYmFzZSBtZDp0ZXh0LXNtIHRyYW5zaXRpb24gZm9udC1tb25vXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwic3VibWl0XCJcbiAgICAgICAgICAgIGRpc2FibGVkPXtsb2FkaW5nIHx8IGlzU2F2aW5nIHx8ICF1cmwudHJpbSgpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIHB5LTQgYmctd2hpdGUgdGV4dC1ibGFjayBmb250LWJvbGQgcm91bmRlZC14bCBob3ZlcjpiZy1bI0ZGNUYxRl0gaG92ZXI6dGV4dC1ibGFjayB0cmFuc2l0aW9uLWNvbG9ycyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBjdXJzb3ItcG9pbnRlciBkaXNhYmxlZDpvcGFjaXR5LTQwXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICB7bG9hZGluZyA/IChcbiAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJ3LTUgaC01IGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4+44K144O844OQ44O85Yem55CG5LitLi4uPC9zcGFuPlxuICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgPHNwYW4+6Z+z5aOw44KSIE1QMyDjgavlpInmj5s8L3NwYW4+XG4gICAgICAgICAgICAgICAgPEFycm93UmlnaHQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Zvcm0+XG5cbiAgICAgIHsvKiBQcm9ncmVzcyAmIEluZm8gU3RhdGUgKi99XG4gICAgICB7KGxvYWRpbmcgfHwgc3RlcCkgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS81IHJvdW5kZWQteGwgcC00IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtM1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMyBtaW4tdy0wIGZsZXgtMVwiPlxuICAgICAgICAgICAgeyhsb2FkaW5nIHx8IGlzU2F2aW5nKSA/IChcbiAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwidy01IGgtNSB0ZXh0LVsjRkY1RjFGXSBhbmltYXRlLXNwaW4gbXQtMC41IGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgPENoZWNrQ2lyY2xlMiBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtWyNGRjVGMUZdIG10LTAuNSBmbGV4LXNocmluay0wXCIgLz5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMSBtaW4tdy0wIGZsZXgtMVwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LVsjRkY1RjFGXSB0cmFja2luZy13aWRlciB1cHBlcmNhc2VcIj5cbiAgICAgICAgICAgICAgICB7bG9hZGluZyB8fCBpc1NhdmluZyA/IFwiQ09OVkVSVElORyBBVURJT1wiIDogXCJDT05WRVJTSU9OIFNVQ0NFU1NGVUxcIn1cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtMzAwIGxlYWRpbmctcmVsYXhlZCBmb250LW1vbm8gYnJlYWstYWxsXCI+e3N0ZXB9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgeyhsb2FkaW5nIHx8IGlzU2F2aW5nKSAmJiAoXG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVDYW5jZWx9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgdGV4dC14cyBmb250LWJvbGQgdGV4dC1yb3NlLTQwMCBob3Zlcjp0ZXh0LXJvc2UtMzAwIGJnLXJvc2UtNTAwLzEwIGhvdmVyOmJnLXJvc2UtNTAwLzIwIHB4LTMgcHktMiByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItcm9zZS01MDAvMjAgdHJhbnNpdGlvbiBhY3RpdmU6c2NhbGUtOTUgY3Vyc29yLXBvaW50ZXIgZmxleC1zaHJpbmstMFwiXG4gICAgICAgICAgICAgIHRpdGxlPVwi44Kt44Oj44Oz44K744OrXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPVwidy0zLjUgaC0zLjVcIiAvPlxuICAgICAgICAgICAgICA8c3Bhbj7jgq3jg6Pjg7Pjgrvjg6s8L3NwYW4+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIHsvKiBFcnJvciBzdGF0ZSAqL31cbiAgICAgIHtlcnJvciAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctcm9zZS01MDAvMTAgYm9yZGVyIGJvcmRlci1yb3NlLTUwMC8yMCB0ZXh0LXJvc2UtNDAwIHJvdW5kZWQteGwgcC00IGZsZXggaXRlbXMtc3RhcnQgZ2FwLTNcIj5cbiAgICAgICAgICA8QWxlcnRDaXJjbGUgY2xhc3NOYW1lPVwidy01IGgtNSBtdC0wLjUgZmxleC1zaHJpbmstMFwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTFcIj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPkV4dHJhY3Rpb24gRmFpbGVkPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXJvc2UtMzAwIGxlYWRpbmctcmVsYXhlZCBmb250LW1vbm9cIj57ZXJyb3J9PC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIHsvKiBTdGFnZWQgRGF0YSBQcmV2aWV3ICYgU2F2ZSBDb25maXJtYXRpb24gKi99XG4gICAgICB7c3RhZ2VkRGF0YSAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtMnhsIHAtNSBzcGFjZS15LTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtMyBiZy1bI0ZGNUYxRl0vMjAgcm91bmRlZC14bCB0ZXh0LVsjRkY1RjFGXSBmbGV4LXNocmluay0wIGZvbnQtYm9sZCB1cHBlcmNhc2VcIj5cbiAgICAgICAgICAgICAge2Zvcm1hdH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy0wIGZsZXgtMVwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB1cHBlcmNhc2UgZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjRkY1RjFGXSBiZy1bI0ZGNUYxRl0vMTUgcHgtMi41IHB5LTAuNSByb3VuZGVkLWZ1bGxcIj5cbiAgICAgICAgICAgICAgICBSRUFEWSBUTyBDQUNIRVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtc2xhdGUtMjAwIHRydW5jYXRlIG10LTEuNSBmb250LW1vbm9cIj5cbiAgICAgICAgICAgICAgICB7c3RhZ2VkRGF0YS50aXRsZX1cbiAgICAgICAgICAgICAgPC9oND5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0zIGdhcC00XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBmb250LWJvbGQgdGV4dC13aGl0ZS80MCBibG9ja1wiPlxuICAgICAgICAgICAgICAgIOabsuWQjVxuICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9e2VkaXRlZFRpdGxlfVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0RWRpdGVkVGl0bGUoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1NhdmluZ31cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctYmxhY2svNDAgdGV4dC1zbGF0ZS0xMDAgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBmb2N1czpib3JkZXItWyNGRjVGMUZdIHJvdW5kZWQtbGcgcHktMyBweC00IG91dGxpbmUtbm9uZSB0ZXh0LWJhc2UgbWQ6dGV4dC1zbSB0cmFuc2l0aW9uIGZvbnQtbWVkaXVtXCJcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIuabsuWQjeOCkuWFpeWKm+OBl+OBpuOBj+OBoOOBleOBhFwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3QgZm9udC1ib2xkIHRleHQtd2hpdGUvNDAgYmxvY2tcIj5cbiAgICAgICAgICAgICAgICAgIOOCouODvOODhuOCo+OCueODiOWQjVxuICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVTd2FwfVxuICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzU2F2aW5nfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB0ZXh0LVsjRkY1RjFGXSBob3Zlcjp1bmRlcmxpbmUgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgICAgICAgdGl0bGU9XCLmm7LlkI3jgajjgqLjg7zjg4bjgqPjgrnjg4jlkI3jgpLlhaXjgozmm7/jgYjjgotcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIOKHhCDlhaXjgozmm7/jgYhcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17ZWRpdGVkQXJ0aXN0fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0RWRpdGVkQXJ0aXN0KGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNTYXZpbmd9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIHRleHQtc2xhdGUtMTAwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgZm9jdXM6Ym9yZGVyLVsjRkY1RjFGXSByb3VuZGVkLWxnIHB5LTMgcHgtNCBvdXRsaW5lLW5vbmUgdGV4dC1iYXNlIG1kOnRleHQtc20gdHJhbnNpdGlvbiBmb250LW1lZGl1bVwiXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLjgqLjg7zjg4bjgqPjgrnjg4jlkI3jgpLlhaXlipvjgZfjgabjgY/jgaDjgZXjgYRcIlxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBmb250LWJvbGQgdGV4dC13aGl0ZS80MCBibG9ja1wiPlxuICAgICAgICAgICAgICAgIOOCuOODo+ODs+ODq+mBuOaKnlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTIgcC0xIGJnLWJsYWNrLzQwIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBoLVs0NnB4XSBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEVkaXRlZEdlbnJlKFwi6YKm5qW9XCIpfVxuICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzU2F2aW5nfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgaC1mdWxsIHJvdW5kZWQtbWQgdGV4dC14cyBmb250LWJvbGQgdHJhbnNpdGlvbi1hbGwgY3Vyc29yLXBvaW50ZXIgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgJHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdGVkR2VucmUgPT09IFwi6YKm5qW9XCJcbiAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgc2hhZG93IGZvbnQtZXh0cmFib2xkXCJcbiAgICAgICAgICAgICAgICAgICAgICA6IFwidGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICDpgqbmpb0gKEotUE9QKVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0RWRpdGVkR2VucmUoXCLmtIvmpb1cIil9XG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNTYXZpbmd9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BoLWZ1bGwgcm91bmRlZC1tZCB0ZXh0LXhzIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciAke1xuICAgICAgICAgICAgICAgICAgICBlZGl0ZWRHZW5yZSA9PT0gXCLmtIvmpb1cIlxuICAgICAgICAgICAgICAgICAgICAgID8gXCJiZy1bI0ZGNUYxRl0gdGV4dC1ibGFjayBzaGFkb3cgZm9udC1leHRyYWJvbGRcIlxuICAgICAgICAgICAgICAgICAgICAgIDogXCJ0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIOa0i+alvSAoV2VzdGVybilcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNhdmV9XG4gICAgICAgICAgICBkaXNhYmxlZD17aXNTYXZpbmcgfHwgIWVkaXRlZFRpdGxlLnRyaW0oKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBiZy1bI0ZGNUYxRl0gaG92ZXI6YmctWyNGRjVGMUZdLzgwIHRleHQtYmxhY2sgZm9udC1ib2xkIHB5LTMuNSBweC00IHJvdW5kZWQteGwgdHJhbnNpdGlvbiBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBjdXJzb3ItcG9pbnRlciBkaXNhYmxlZDpvcGFjaXR5LTQwXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICB7aXNTYXZpbmcgPyAoXG4gICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwidy01IGgtNSBhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPuODreODvOOCq+ODq+OBq+abuOOBjei+vOOBv+S4rS4uLjwvc3Bhbj5cbiAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8c3Bhbj7jgZPjga7lhoXlrrnjgaflronlhajjgavjgq3jg6Pjg4Pjgrfjg6Xkv53lrZg8L3NwYW4+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwibWFwcGluZ3MiOiJBQXFXWSxTQThCRSxVQTlCRjtBQXJXWixTQUFnQixVQUFVLGNBQWM7QUFDeEMsU0FBUyxTQUFTLFFBQVEsWUFBWSxjQUFjLGFBQWEsU0FBaUIsU0FBaUI7QUFDbkcsU0FBUyxXQUFXLGlCQUFpQjtBQUVyQyxTQUFTLHNCQUFzQjtBQUMvQixTQUFTLGlCQUFpQixvQkFBb0IsMkJBQTJCO0FBTXpFLHdCQUF3QixVQUFVLEVBQUUsVUFBVSxHQUFtQjtBQUMvRCxRQUFNLENBQUMsS0FBSyxNQUFNLElBQUksU0FBUyxFQUFFO0FBQ2pDLFFBQU0sQ0FBQyxTQUFTLFVBQVUsSUFBSSxTQUFTLEtBQUs7QUFDNUMsUUFBTSxDQUFDLE1BQU0sT0FBTyxJQUFJLFNBQWlCLEVBQUU7QUFDM0MsUUFBTSxDQUFDLE9BQU8sUUFBUSxJQUFJLFNBQXdCLElBQUk7QUFHdEQsUUFBTSxDQUFDLFlBQVksYUFBYSxJQUFJLFNBTTFCLElBQUk7QUFDZCxRQUFNLENBQUMsYUFBYSxjQUFjLElBQUksU0FBUyxFQUFFO0FBQ2pELFFBQU0sQ0FBQyxjQUFjLGVBQWUsSUFBSSxTQUFTLEVBQUU7QUFDbkQsUUFBTSxDQUFDLFVBQVUsV0FBVyxJQUFJLFNBQVMsS0FBSztBQUM5QyxRQUFNLENBQUMsYUFBYSxjQUFjLElBQUksU0FBc0IsSUFBSTtBQUNoRSxRQUFNLFNBQVM7QUFDZixRQUFNLHFCQUFxQixPQUErQixJQUFJO0FBRzlELFFBQU0sZUFBZSxDQUFDLGVBQXNDO0FBQzFELFVBQU0sV0FBVyxXQUFXLEtBQUs7QUFHakMsUUFBSSxTQUFTLFNBQVMsV0FBVyxHQUFHO0FBQ2xDLFlBQU0sUUFBUSxTQUFTLE1BQU0sV0FBVztBQUN4QyxVQUFJLE1BQU0sQ0FBQyxHQUFHO0FBQ1osY0FBTSxTQUFTLE1BQU0sQ0FBQyxFQUFFLE1BQU0sT0FBTyxFQUFFLENBQUM7QUFDeEMsWUFBSSxPQUFPLFdBQVcsR0FBSSxRQUFPO0FBQUEsTUFDbkM7QUFBQSxJQUNGO0FBR0EsVUFBTSxRQUFRLFNBQVMsTUFBTSxvREFBb0Q7QUFDakYsUUFBSSxTQUFTLE1BQU0sQ0FBQyxHQUFHO0FBQ3JCLGFBQU8sTUFBTSxDQUFDO0FBQUEsSUFDaEI7QUFHQSxVQUFNLFNBQVM7QUFDZixVQUFNLGdCQUFnQixTQUFTLE1BQU0sTUFBTTtBQUMzQyxRQUFJLGlCQUFpQixjQUFjLENBQUMsS0FBSyxjQUFjLENBQUMsRUFBRSxXQUFXLElBQUk7QUFDdkUsYUFBTyxjQUFjLENBQUM7QUFBQSxJQUN4QjtBQUVBLFdBQU87QUFBQSxFQUNUO0FBR0EsUUFBTSxzQkFBc0IsQ0FBQyxhQUF3RDtBQUNuRixRQUFJLFFBQVEsU0FDVCxRQUFRLHFFQUFxRSxFQUFFLEVBQy9FLFFBQVEscUVBQXFFLEVBQUUsRUFDL0UsUUFBUSw0Q0FBNEMsRUFBRSxFQUN0RCxLQUFLO0FBRVIsVUFBTSxhQUFhLENBQUMsT0FBTyxPQUFPLE9BQU8sS0FBSztBQUM5QyxlQUFXLE9BQU8sWUFBWTtBQUM1QixVQUFJLE1BQU0sU0FBUyxHQUFHLEdBQUc7QUFDdkIsY0FBTSxRQUFRLE1BQU0sTUFBTSxHQUFHO0FBQzdCLFlBQUksTUFBTSxVQUFVLEdBQUc7QUFDckIsZ0JBQU0sUUFBUSxNQUFNLENBQUMsRUFBRSxLQUFLO0FBQzVCLGdCQUFNLFFBQVEsTUFBTSxNQUFNLENBQUMsRUFBRSxLQUFLLEdBQUcsRUFBRSxLQUFLO0FBQzVDLGlCQUFPLEVBQUUsUUFBUSxPQUFPLE9BQU8sTUFBTTtBQUFBLFFBQ3ZDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFDQSxXQUFPLEVBQUUsT0FBTyxPQUFPLFFBQVEsR0FBRztBQUFBLEVBQ3BDO0FBRUEsUUFBTSxhQUFhLE1BQU07QUFDdkIsVUFBTSxPQUFPO0FBQ2IsbUJBQWUsWUFBWTtBQUMzQixvQkFBZ0IsSUFBSTtBQUFBLEVBQ3RCO0FBRUEsUUFBTSxlQUFlLE1BQU07QUFDekIsUUFBSSxtQkFBbUIsU0FBUztBQUM5Qix5QkFBbUIsUUFBUSxNQUFNO0FBQUEsSUFDbkM7QUFBQSxFQUNGO0FBRUEsUUFBTSxnQkFBZ0IsT0FBTyxNQUF1QjtBQUNsRCxNQUFFLGVBQWU7QUFDakIsUUFBSSxDQUFDLElBQUksS0FBSyxFQUFHO0FBRWpCLGVBQVcsSUFBSTtBQUNmLGFBQVMsSUFBSTtBQUNiLGtCQUFjLElBQUk7QUFFbEIsVUFBTSxTQUFTLElBQUksU0FBUyxVQUFVO0FBQ3RDLFVBQU0sYUFBYTtBQUNuQixRQUFJLFVBQVU7QUFHZCxVQUFNLGFBQWEsSUFBSSxnQkFBZ0I7QUFDdkMsdUJBQW1CLFVBQVU7QUFFN0IsV0FBTyxVQUFVLFlBQVk7QUFDM0I7QUFDQTtBQUFBLFFBQ0UsU0FDSSx3QkFBd0IsVUFBVSxJQUFJLFlBQVksT0FBTyxJQUFJLFVBQVUsUUFBUSxFQUFFLEtBQ2pGLDJCQUEyQixVQUFVLElBQUksWUFBWSxPQUFPLElBQUksVUFBVSxRQUFRLEVBQUU7QUFBQSxNQUMxRjtBQUVBLFVBQUk7QUFDRixjQUFNLFdBQVcsTUFBTSxNQUFNLGdCQUFnQjtBQUFBLFVBQzNDLFFBQVE7QUFBQSxVQUNSLFNBQVM7QUFBQSxZQUNQLGdCQUFnQjtBQUFBLFVBQ2xCO0FBQUEsVUFDQSxNQUFNLEtBQUssVUFBVSxFQUFFLEtBQUssSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDO0FBQUEsVUFDaEQsUUFBUSxXQUFXO0FBQUEsUUFDckIsQ0FBQztBQUVELFlBQUksQ0FBQyxTQUFTLElBQUk7QUFDaEIsZ0JBQU0sVUFBVSxNQUFNLFNBQVMsS0FBSyxFQUFFLE1BQU0sT0FBTyxDQUFDLEVBQUU7QUFDdEQsZ0JBQU0sSUFBSSxNQUFNLFFBQVEsU0FBUyxtQkFBbUIsU0FBUyxNQUFNLEdBQUc7QUFBQSxRQUN4RTtBQUVBLFlBQUksV0FBVyxPQUFPLFNBQVM7QUFDN0IsZ0JBQU0sSUFBSSxhQUFhLFdBQVcsWUFBWTtBQUFBLFFBQ2hEO0FBRUEsZ0JBQVEsU0FBUyxzQkFBc0IsU0FBUyxPQUFPLFlBQVksQ0FBQyxtQkFBbUI7QUFDdkYsY0FBTSxPQUFPLE1BQU0sU0FBUyxLQUFLO0FBRWpDLFlBQUksV0FBVyxPQUFPLFNBQVM7QUFDN0IsZ0JBQU0sSUFBSSxhQUFhLFdBQVcsWUFBWTtBQUFBLFFBQ2hEO0FBRUEsWUFBSSxDQUFDLEtBQUssV0FBVyxDQUFDLEtBQUssV0FBVztBQUNwQyxnQkFBTSxJQUFJLE1BQU0sS0FBSyxTQUFTLG1CQUFtQjtBQUFBLFFBQ25EO0FBRUEsY0FBTSxVQUFVLFNBQVMsUUFBUSxLQUFLLElBQUksQ0FBQyxLQUFNLGFBQWEsSUFBSSxLQUFLLENBQUMsS0FBSyxTQUFTLEtBQUssSUFBSSxDQUFDO0FBRWhHLFlBQUksUUFBUTtBQUNaLFlBQUksU0FBUztBQUViLFlBQUksS0FBSyxRQUFRO0FBQ2Ysa0JBQVEsS0FBSztBQUNiLG1CQUFTLEtBQUs7QUFBQSxRQUNoQixPQUFPO0FBQ0wsZ0JBQU0sU0FBUyxvQkFBb0IsS0FBSyxTQUFTLHFCQUFxQjtBQUN0RSxrQkFBUSxPQUFPO0FBQ2YsbUJBQVMsT0FBTztBQUFBLFFBQ2xCO0FBR0Esc0JBQWM7QUFBQSxVQUNaLElBQUk7QUFBQSxVQUNKO0FBQUEsVUFDQTtBQUFBLFVBQ0EsWUFBWSxJQUFJLEtBQUs7QUFBQSxVQUNyQixXQUFXLEtBQUs7QUFBQSxRQUNsQixDQUFDO0FBQ0QsdUJBQWUsS0FBSztBQUNwQix3QkFBZ0IsTUFBTTtBQUN0QixnQkFBUSx5Q0FBeUM7QUFDakQ7QUFBQSxNQUVGLFNBQVMsS0FBVTtBQUNqQixZQUFJLElBQUksU0FBUyxnQkFBZ0IsV0FBVyxPQUFPLFNBQVM7QUFDMUQsbUJBQVMsa0JBQWtCO0FBQzNCLGtCQUFRLEVBQUU7QUFDVjtBQUFBLFFBQ0Y7QUFFQSxnQkFBUSxLQUFLLFdBQVcsT0FBTyxZQUFZLEdBQUc7QUFFOUMsWUFBSSxXQUFXLFlBQVk7QUFDekIsbUJBQVMsSUFBSSxXQUFXLGlDQUFpQztBQUN6RCxrQkFBUSxFQUFFO0FBQUEsUUFDWixPQUFPO0FBRUwsa0JBQVEsbUNBQW1DLE9BQU8sSUFBSSxVQUFVLEtBQUs7QUFDckUsZ0JBQU0sSUFBSSxRQUFjLENBQUMsU0FBUyxXQUFXO0FBQzNDLGtCQUFNLFVBQVUsV0FBVyxTQUFTLElBQUk7QUFDeEMsdUJBQVcsT0FBTyxpQkFBaUIsU0FBUyxNQUFNO0FBQ2hELDJCQUFhLE9BQU87QUFDcEIscUJBQU8sSUFBSSxhQUFhLFdBQVcsWUFBWSxDQUFDO0FBQUEsWUFDbEQsQ0FBQztBQUFBLFVBQ0gsQ0FBQztBQUFBLFFBQ0g7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUVBLHVCQUFtQixVQUFVO0FBQzdCLGVBQVcsS0FBSztBQUFBLEVBQ2xCO0FBRUEsUUFBTSxhQUFhLFlBQVk7QUFDN0IsUUFBSSxDQUFDLFdBQVk7QUFFakIsZ0JBQVksSUFBSTtBQUNoQixhQUFTLElBQUk7QUFFYixVQUFNLGlCQUFpQjtBQUN2QixRQUFJLGNBQWM7QUFDbEIsUUFBSSxVQUFVO0FBQ2QsUUFBSSxhQUEwQjtBQUc5QixVQUFNLGFBQWEsSUFBSSxnQkFBZ0I7QUFDdkMsdUJBQW1CLFVBQVU7QUFFN0IsV0FBTyxjQUFjLGdCQUFnQjtBQUNuQztBQUNBO0FBQUEsUUFDRSxPQUFPLE9BQU8sWUFBWSxDQUFDLHNCQUMxQixjQUFjLElBQUksWUFBWSxXQUFXLElBQUksY0FBYyxRQUFRO0FBQUEsTUFDdEU7QUFFQSxVQUFJO0FBQ0YsY0FBTSxVQUFVLE1BQU0sTUFBTSxXQUFXLFdBQVc7QUFBQSxVQUNoRCxRQUFRLFdBQVc7QUFBQSxRQUNyQixDQUFDO0FBRUQsWUFBSSxDQUFDLFFBQVEsSUFBSTtBQUNmLGdCQUFNLElBQUksTUFBTSwrQkFBK0IsUUFBUSxNQUFNLEdBQUc7QUFBQSxRQUNsRTtBQUVBLGNBQU0sVUFBVSxNQUFNLFFBQVEsS0FBSztBQUVuQyxZQUFJLFdBQVcsT0FBTyxTQUFTO0FBQzdCLGdCQUFNLElBQUksYUFBYSxXQUFXLFlBQVk7QUFBQSxRQUNoRDtBQUdBLGNBQU0sY0FBYyxRQUFRLFFBQVEsSUFBSSxjQUFjLEtBQUssUUFBUSxRQUFRO0FBQzNFLFlBQUksWUFBWSxTQUFTLE1BQU0sS0FBSyxZQUFZLFNBQVMsTUFBTSxLQUFLLFlBQVksU0FBUyxNQUFNLEdBQUc7QUFDaEcsZ0JBQU0sT0FBTyxNQUFNLFFBQVEsS0FBSyxFQUFFLE1BQU0sTUFBTSxFQUFFO0FBQ2hELGtCQUFRLE1BQU0sNENBQTRDLGFBQWEsWUFBWSxJQUFJO0FBQ3ZGLGNBQUk7QUFDRixrQkFBTSxTQUFTLEtBQUssTUFBTSxJQUFJO0FBQzlCLGdCQUFJLE9BQU8sT0FBTztBQUNoQixvQkFBTSxJQUFJLE1BQU0sT0FBTyxLQUFLO0FBQUEsWUFDOUI7QUFBQSxVQUNGLFNBQVMsR0FBRztBQUFBLFVBQUM7QUFDYixnQkFBTSxJQUFJLE1BQU0scUNBQXFDO0FBQUEsUUFDdkQ7QUFHQSxZQUFJLFFBQVEsT0FBTyxLQUFPO0FBQ3hCLGdCQUFNLElBQUksTUFBTSw2Q0FBNkM7QUFBQSxRQUMvRDtBQUdBLGNBQU0sZUFBZSxNQUFNLGVBQWUsT0FBTztBQUNqRCxxQkFBYSxJQUFJLEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN2RCxrQkFBVTtBQUNWO0FBQUEsTUFFRixTQUFTLEtBQVU7QUFDakIsWUFBSSxJQUFJLFNBQVMsZ0JBQWdCLFdBQVcsT0FBTyxTQUFTO0FBQzFELG1CQUFTLG9CQUFvQjtBQUM3QixrQkFBUSxFQUFFO0FBQ1Ysc0JBQVksS0FBSztBQUNqQiw2QkFBbUIsVUFBVTtBQUM3QjtBQUFBLFFBQ0Y7QUFFQSxnQkFBUSxLQUFLLG9CQUFvQixXQUFXLFlBQVksR0FBRztBQUUzRCxZQUFJLGVBQWUsZ0JBQWdCO0FBQ2pDLG1CQUFTLElBQUksV0FBVyx1Q0FBdUM7QUFDL0Qsa0JBQVEsRUFBRTtBQUFBLFFBQ1osT0FBTztBQUNMLGtCQUFRLHFDQUFxQyxXQUFXLElBQUksY0FBYyxLQUFLO0FBQy9FLGdCQUFNLElBQUksUUFBYyxDQUFDLFNBQVMsV0FBVztBQUMzQyxrQkFBTSxVQUFVLFdBQVcsU0FBUyxJQUFJO0FBQ3hDLHVCQUFXLE9BQU8saUJBQWlCLFNBQVMsTUFBTTtBQUNoRCwyQkFBYSxPQUFPO0FBQ3BCLHFCQUFPLElBQUksYUFBYSxXQUFXLFlBQVksQ0FBQztBQUFBLFlBQ2xELENBQUM7QUFBQSxVQUNILENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFFQSx1QkFBbUIsVUFBVTtBQUU3QixRQUFJLENBQUMsV0FBVyxDQUFDLFlBQVk7QUFDM0Isa0JBQVksS0FBSztBQUNqQjtBQUFBLElBQ0Y7QUFFQSxRQUFJO0FBQ0YsY0FBUSxtQ0FBbUM7QUFFM0MsWUFBTSxpQkFBaUIsTUFBTSxVQUFVO0FBQ3ZDLFlBQU0sY0FBYyxlQUFlLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxXQUFXLEVBQUU7QUFDckUsWUFBTSxVQUFVLGNBQWMsR0FBRyxXQUFXLEVBQUUsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLFdBQVc7QUFFNUUsWUFBTSxXQUFrQjtBQUFBLFFBQ3RCLElBQUk7QUFBQSxRQUNKLE9BQU8sWUFBWSxLQUFLLEtBQUssV0FBVztBQUFBLFFBQ3hDLFFBQVEsYUFBYSxLQUFLLEtBQUssV0FBVyxVQUFVO0FBQUEsUUFDcEQsT0FBTztBQUFBLFFBQ1AsWUFBWSxXQUFXO0FBQUEsUUFDdkIsTUFBTTtBQUFBLFFBQ04sU0FBUyxLQUFLLElBQUk7QUFBQSxNQUNwQjtBQUVBLFlBQU0sVUFBVSxRQUFRO0FBR3hCLFlBQU0sV0FBVyxnQkFBZ0I7QUFDakMsVUFBSSxTQUFTLFlBQVksbUJBQW1CLFFBQVEsR0FBRztBQUNyRCxZQUFJO0FBQ0Ysa0JBQVEsd0JBQXdCO0FBQ2hDLGdCQUFNLG9CQUFvQixVQUFVLFVBQVUsQ0FBQyxRQUFRLFFBQVEsR0FBRyxDQUFDO0FBQUEsUUFDckUsU0FBUyxPQUFZO0FBQ25CLGtCQUFRLEtBQUssNkJBQTZCLEtBQUs7QUFBQSxRQUNqRDtBQUFBLE1BQ0Y7QUFFQSxjQUFRLEVBQUU7QUFDVixhQUFPLEVBQUU7QUFDVCxvQkFBYyxJQUFJO0FBQ2xCLHFCQUFlLEVBQUU7QUFDakIsc0JBQWdCLEVBQUU7QUFDbEIsZ0JBQVU7QUFFVixZQUFNLGNBQWMsU0FBUyxZQUFZLG1CQUFtQixRQUFRLElBQ2hFLG1DQUNBO0FBQ0osWUFBTSxXQUFXO0FBQUEsSUFFbkIsU0FBUyxLQUFVO0FBQ2pCLGNBQVEsTUFBTSxHQUFHO0FBQ2pCLGVBQVMscUJBQXFCLElBQUksT0FBTztBQUFBLElBQzNDLFVBQUU7QUFDQSxrQkFBWSxLQUFLO0FBQUEsSUFDbkI7QUFBQSxFQUNGO0FBRUEsU0FDRSx1QkFBQyxTQUFJLFdBQVUsaUZBQ2I7QUFBQSwyQkFBQyxTQUFJLFdBQVUsa0VBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUsMkJBQ2I7QUFBQSwrQkFBQyxTQUFJLFdBQVUsbURBQ2IsaUNBQUMsV0FBUSxXQUFVLGFBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNkIsS0FEL0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFDQSx1QkFBQyxTQUNDO0FBQUEsaUNBQUMsVUFBSyxXQUFVLCtFQUE4RSw0QkFBOUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMEc7QUFBQSxVQUMxRyx1QkFBQyxRQUFHLFdBQVUsK0NBQThDLHlDQUE1RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFxRjtBQUFBLGFBRnZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFHQTtBQUFBLFdBUEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVFBO0FBQUEsTUFDQSx1QkFBQyxTQUFJLFdBQVUseUVBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFxRjtBQUFBLFNBVnZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FXQTtBQUFBLElBRUEsdUJBQUMsVUFBSyxVQUFVLGVBQWUsV0FBVSxhQUN2QyxpQ0FBQyxTQUFJLFdBQVUsdUJBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUsWUFDYjtBQUFBLCtCQUFDLFVBQU8sV0FBVSxxRUFBbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFvRjtBQUFBLFFBQ3BGO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFDQyxNQUFLO0FBQUEsWUFDTCxhQUFZO0FBQUEsWUFDWixPQUFPO0FBQUEsWUFDUCxVQUFVLENBQUMsTUFBTSxPQUFPLEVBQUUsT0FBTyxLQUFLO0FBQUEsWUFDdEMsVUFBVSxXQUFXO0FBQUEsWUFDckIsV0FBVTtBQUFBO0FBQUEsVUFOWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFPQTtBQUFBLFdBVEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVVBO0FBQUEsTUFFQTtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBQ0MsTUFBSztBQUFBLFVBQ0wsVUFBVSxXQUFXLFlBQVksQ0FBQyxJQUFJLEtBQUs7QUFBQSxVQUMzQyxXQUFVO0FBQUEsVUFFVCxvQkFDQyxtQ0FDRTtBQUFBLG1DQUFDLFdBQVEsV0FBVSwwQkFBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMEM7QUFBQSxZQUMxQyx1QkFBQyxVQUFLLDBCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWdCO0FBQUEsZUFGbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFHQSxJQUVBLG1DQUNFO0FBQUEsbUNBQUMsVUFBSywyQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFpQjtBQUFBLFlBQ2pCLHVCQUFDLGNBQVcsV0FBVSxhQUF0QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFnQztBQUFBLGVBRmxDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQTtBQUFBLFFBZEo7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BZ0JBO0FBQUEsU0E3QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQThCQSxLQS9CRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBZ0NBO0FBQUEsS0FHRSxXQUFXLFNBQ1gsdUJBQUMsU0FBSSxXQUFVLDJGQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHlDQUNYO0FBQUEsbUJBQVcsV0FDWCx1QkFBQyxXQUFRLFdBQVUsOERBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBOEUsSUFFOUUsdUJBQUMsZ0JBQWEsV0FBVSxpREFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFzRTtBQUFBLFFBRXhFLHVCQUFDLFNBQUksV0FBVSw0QkFDYjtBQUFBLGlDQUFDLE9BQUUsV0FBVSw2REFDVixxQkFBVyxXQUFXLHFCQUFxQiwyQkFEOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsT0FBRSxXQUFVLDhEQUE4RCxrQkFBM0U7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBZ0Y7QUFBQSxhQUpsRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBS0E7QUFBQSxXQVhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFZQTtBQUFBLE9BQ0UsV0FBVyxhQUNYO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxNQUFLO0FBQUEsVUFDTCxTQUFTO0FBQUEsVUFDVCxXQUFVO0FBQUEsVUFDVixPQUFNO0FBQUEsVUFFTjtBQUFBLG1DQUFDLEtBQUUsV0FBVSxpQkFBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUEyQjtBQUFBLFlBQzNCLHVCQUFDLFVBQUsscUJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBVztBQUFBO0FBQUE7QUFBQSxRQVBiO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQVFBO0FBQUEsU0F2Qko7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXlCQTtBQUFBLElBSUQsU0FDQyx1QkFBQyxTQUFJLFdBQVUsZ0dBQ2I7QUFBQSw2QkFBQyxlQUFZLFdBQVUsa0NBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBc0Q7QUFBQSxNQUN0RCx1QkFBQyxTQUFJLFdBQVUsYUFDYjtBQUFBLCtCQUFDLE9BQUUsV0FBVSw4Q0FBNkMsaUNBQTFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMkU7QUFBQSxRQUMzRSx1QkFBQyxPQUFFLFdBQVUsbURBQW1ELG1CQUFoRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXNFO0FBQUEsV0FGeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUdBO0FBQUEsU0FMRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBTUE7QUFBQSxJQUlELGNBQ0MsdUJBQUMsU0FBSSxXQUFVLCtEQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLDJCQUNiO0FBQUEsK0JBQUMsU0FBSSxXQUFVLG1GQUNaLG9CQURIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFFBQ0EsdUJBQUMsU0FBSSxXQUFVLGtCQUNiO0FBQUEsaUNBQUMsVUFBSyxXQUFVLDZHQUE0Ryw4QkFBNUg7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsUUFBRyxXQUFVLGdFQUNYLHFCQUFXLFNBRGQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLGFBTkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQU9BO0FBQUEsV0FYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBWUE7QUFBQSxNQUVBLHVCQUFDLFNBQUksV0FBVSx5Q0FDYjtBQUFBLCtCQUFDLFNBQUksV0FBVSxhQUNiO0FBQUEsaUNBQUMsV0FBTSxXQUFVLHVFQUFzRSxrQkFBdkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0E7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLE1BQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLFVBQVUsQ0FBQyxNQUFNLGVBQWUsRUFBRSxPQUFPLEtBQUs7QUFBQSxjQUM5QyxVQUFVO0FBQUEsY0FDVixXQUFVO0FBQUEsY0FDVixhQUFZO0FBQUE7QUFBQSxZQU5kO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQU9BO0FBQUEsYUFYRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBWUE7QUFBQSxRQUNBLHVCQUFDLFNBQUksV0FBVSxhQUNiO0FBQUEsaUNBQUMsU0FBSSxXQUFVLHFDQUNiO0FBQUEsbUNBQUMsV0FBTSxXQUFVLHVFQUFzRSx1QkFBdkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLFlBQ0E7QUFBQSxjQUFDO0FBQUE7QUFBQSxnQkFDQyxNQUFLO0FBQUEsZ0JBQ0wsU0FBUztBQUFBLGdCQUNULFVBQVU7QUFBQSxnQkFDVixXQUFVO0FBQUEsZ0JBQ1YsT0FBTTtBQUFBLGdCQUNQO0FBQUE7QUFBQSxjQU5EO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQVFBO0FBQUEsZUFaRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQWFBO0FBQUEsVUFDQTtBQUFBLFlBQUM7QUFBQTtBQUFBLGNBQ0MsTUFBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsVUFBVSxDQUFDLE1BQU0sZ0JBQWdCLEVBQUUsT0FBTyxLQUFLO0FBQUEsY0FDL0MsVUFBVTtBQUFBLGNBQ1YsV0FBVTtBQUFBLGNBQ1YsYUFBWTtBQUFBO0FBQUEsWUFOZDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFPQTtBQUFBLGFBdEJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUF1QkE7QUFBQSxRQUNBLHVCQUFDLFNBQUksV0FBVSxhQUNiO0FBQUEsaUNBQUMsV0FBTSxXQUFVLHVFQUFzRSxzQkFBdkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLGtHQUNiO0FBQUE7QUFBQSxjQUFDO0FBQUE7QUFBQSxnQkFDQyxNQUFLO0FBQUEsZ0JBQ0wsU0FBUyxNQUFNLGVBQWUsSUFBSTtBQUFBLGdCQUNsQyxVQUFVO0FBQUEsZ0JBQ1YsV0FBVyxzR0FDVCxnQkFBZ0IsT0FDWixrREFDQSxpQ0FDTjtBQUFBLGdCQUNEO0FBQUE7QUFBQSxjQVREO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQVdBO0FBQUEsWUFDQTtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUNDLE1BQUs7QUFBQSxnQkFDTCxTQUFTLE1BQU0sZUFBZSxJQUFJO0FBQUEsZ0JBQ2xDLFVBQVU7QUFBQSxnQkFDVixXQUFXLHNHQUNULGdCQUFnQixPQUNaLGtEQUNBLGlDQUNOO0FBQUEsZ0JBQ0Q7QUFBQTtBQUFBLGNBVEQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBV0E7QUFBQSxlQXhCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQXlCQTtBQUFBLGFBN0JGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUE4QkE7QUFBQSxXQXBFRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBcUVBO0FBQUEsTUFFQTtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBQ0MsU0FBUztBQUFBLFVBQ1QsVUFBVSxZQUFZLENBQUMsWUFBWSxLQUFLO0FBQUEsVUFDeEMsV0FBVTtBQUFBLFVBRVQscUJBQ0MsbUNBQ0U7QUFBQSxtQ0FBQyxXQUFRLFdBQVUsMEJBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTBDO0FBQUEsWUFDMUMsdUJBQUMsVUFBSyw2QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFtQjtBQUFBLGVBRnJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0EsSUFFQSx1QkFBQyxVQUFLLCtCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXFCO0FBQUE7QUFBQSxRQVh6QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFhQTtBQUFBLFNBbkdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FvR0E7QUFBQSxPQS9MSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBaU1BO0FBRUo7IiwibmFtZXMiOltdfQ==