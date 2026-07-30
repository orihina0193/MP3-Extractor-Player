import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=1f31155a"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=1f31155a"; const useState = __vite__cjsImport1_react["useState"]; const useEffect = __vite__cjsImport1_react["useEffect"];
import { Disc, Database, HelpCircle, Github } from "/node_modules/.vite/deps/lucide-react.js?v=1f31155a";
import { AppMode } from "/src/types.ts";
import { getTracks } from "/src/lib/db.ts";
import Extractor from "/src/components/Extractor.tsx";
import Player from "/src/components/Player.tsx";
import BackupRestore from "/src/components/BackupRestore.tsx";
import GitHubSettings from "/src/components/GitHubSettings.tsx";
import soundBoxIcon from "/src/assets/images/soundbox_app_icon_flat_1783522740605.jpg?import";
export default function App() {
  const [activeMode, setActiveMode] = useState(AppMode.Play);
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGithubSettings, setShowGithubSettings] = useState(false);
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
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen bg-[#050505] radial-glow text-[#e0e0e0] font-sans selection:bg-[#FF5F1F]/20 selection:text-[#FF5F1F] relative", children: [
    /* @__PURE__ */ jsxDEV("header", { className: "sticky top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-md px-4 sm:px-8 py-5", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxDEV(
          "img",
          {
            src: soundBoxIcon,
            alt: "SoundBox Logo",
            className: "w-10 h-10 rounded-xl object-cover shadow-lg shadow-[#FF5F1F]/20 border border-white/10"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 43,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-light tracking-tighter text-white", children: [
            "SOUND",
            /* @__PURE__ */ jsxDEV("span", { className: "text-[#FF5F1F] font-bold", children: "BOX" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 50,
              columnNumber: 22
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 49,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] uppercase tracking-[0.3em] opacity-40", children: "Hybrid Extraction & Playback Engine" }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 52,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 48,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 42,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1 p-1 bg-white/5 rounded-full border border-white/10", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setActiveMode(AppMode.Play),
            className: `px-6 py-2 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${activeMode === AppMode.Play ? "bg-[#FF5F1F] text-black shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`,
            children: "PLAYBACK"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 60,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setActiveMode(AppMode.Extract),
            className: `px-6 py-2 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${activeMode === AppMode.Extract ? "bg-[#FF5F1F] text-black shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`,
            children: "EXTRACTION"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 70,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 59,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setShowGithubSettings(!showGithubSettings);
              if (!showGithubSettings) setShowSettings(false);
            },
            className: `flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer text-xs font-bold ${showGithubSettings ? "bg-[#FF5F1F]/20 border-[#FF5F1F]/40 text-[#FF5F1F] glow-orange" : "bg-white/5 border-white/10 text-slate-300 hover:text-[#FF5F1F] hover:bg-white/10"}`,
            title: "GitHub クラウドストレージ設定",
            children: [
              /* @__PURE__ */ jsxDEV(Github, { className: "w-4 h-4 text-[#FF5F1F]" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 96,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "hidden md:inline", children: "GitHub同期" }, void 0, false, {
                fileName: "/app/applet/src/App.tsx",
                lineNumber: 97,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 84,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setShowSettings(!showSettings);
              if (!showSettings) setShowGithubSettings(false);
            },
            className: `p-2.5 rounded-xl border transition cursor-pointer ${showSettings ? "bg-[#FF5F1F]/20 border-[#FF5F1F]/40 text-[#FF5F1F] glow-orange" : "bg-white/5 border-white/10 text-slate-400 hover:text-[#FF5F1F] hover:bg-white/10"}`,
            title: "ZIPバックアップとデータ管理",
            children: /* @__PURE__ */ jsxDEV(Database, { className: "w-5 h-5" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 112,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 100,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 83,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 39,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 38,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("main", { className: "max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8", children: isLoading ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center py-24 space-y-4", children: [
      /* @__PURE__ */ jsxDEV(Disc, { className: "w-12 h-12 text-[#FF5F1F] animate-spin" }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 125,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-mono tracking-widest text-[#FF5F1F]/60", children: "LOADING STORAGE_CACHE..." }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 126,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 124,
      columnNumber: 11
    }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
      activeMode === AppMode.Extract ? /* @__PURE__ */ jsxDEV("div", { className: "max-w-3xl mx-auto space-y-6", children: [
        /* @__PURE__ */ jsxDEV(Extractor, { onRefresh: fetchTracks }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 133,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3", children: [
          /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-[#FF5F1F] tracking-widest flex items-center gap-2 uppercase", children: [
            /* @__PURE__ */ jsxDEV(HelpCircle, { className: "w-4 h-4 text-[#FF5F1F]" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 136,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "抽出モードの使い方・仕様" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 137,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 135,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("ul", { className: "text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed font-sans opacity-80", children: [
            /* @__PURE__ */ jsxDEV("li", { children: "YouTube動画の共有リンクまたはURLを貼り付けて「音声を抽出」をクリックします。" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 140,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("li", { children: "変換が完了すると曲名確認画面が表示されます。お好みの名前にクリーンアップしてキャッシュへ保存してください。" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 141,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ jsxDEV("li", { children: "保存された音声は最高音質なM4A形式として安全にブラウザ内部にのみキャッシュ（保存）されます。パケットを消費せず、オフライン環境でも再生可能です。" }, void 0, false, {
              fileName: "/app/applet/src/App.tsx",
              lineNumber: 142,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 139,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 134,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 132,
        columnNumber: 15
      }, this) : /* @__PURE__ */ jsxDEV(
        Player,
        {
          tracks,
          onRefresh: fetchTracks,
          currentTrack,
          onSelectTrack: setCurrentTrack
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 147,
          columnNumber: 15
        },
        this
      ),
      showGithubSettings && /* @__PURE__ */ jsxDEV("div", { className: "max-w-3xl mx-auto mt-6 pt-4 border-t border-white/10 animate-fade-in", children: /* @__PURE__ */ jsxDEV(GitHubSettings, { onRefresh: fetchTracks }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 158,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 157,
        columnNumber: 15
      }, this),
      showSettings && /* @__PURE__ */ jsxDEV("div", { className: "max-w-3xl mx-auto mt-6 pt-4 border-t border-white/10 animate-fade-in", children: /* @__PURE__ */ jsxDEV(BackupRestore, { onRefresh: fetchTracks }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 165,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 164,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 129,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 120,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("footer", { className: "max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 text-[10px] font-mono text-white/30 gap-4", children: [
      /* @__PURE__ */ jsxDEV("div", { children: "SYSTEM_V2.1.2 // CACHE_STATUS: NOMINAL" }, void 0, false, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 174,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-6", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "uppercase hover:text-[#FF5F1F] transition-colors cursor-pointer", children: "Privacy" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 176,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "uppercase hover:text-[#FF5F1F] transition-colors cursor-pointer", children: "Support" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 177,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "uppercase text-[#FF5F1F] font-bold", children: "Premium Audio Engine" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 178,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 175,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 173,
      columnNumber: 7
    }, this),
    currentTrack && activeMode === AppMode.Extract && /* @__PURE__ */ jsxDEV("div", { className: "fixed bottom-4 right-4 max-w-sm w-full bg-[#050505]/95 backdrop-blur-md border border-[#FF5F1F]/30 p-4 rounded-xl shadow-2xl z-50 flex items-center justify-between gap-3 animate-fade-in glow-orange", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 min-w-0", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-lg bg-[#FF5F1F]/10 text-[#FF5F1F] flex items-center justify-center flex-shrink-0 animate-spin-slow", children: /* @__PURE__ */ jsxDEV(Disc, { className: "w-5 h-5" }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 187,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 186,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] uppercase tracking-wider text-[#FF5F1F] font-bold", children: "NOW PLAYING" }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 190,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold text-slate-100 truncate mt-0.5", children: currentTrack.title }, void 0, false, {
            fileName: "/app/applet/src/App.tsx",
            lineNumber: 191,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 189,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/App.tsx",
        lineNumber: 185,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setActiveMode(AppMode.Play),
          className: "bg-white hover:bg-[#FF5F1F] text-black text-xs font-bold py-1.5 px-3 rounded-lg flex-shrink-0 transition cursor-pointer",
          children: "PLAYER"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/App.tsx",
          lineNumber: 196,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/App.tsx",
      lineNumber: 184,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/App.tsx",
    lineNumber: 35,
    columnNumber: 5
  }, this);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkFwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IE11c2ljLCBZb3V0dWJlLCBTZXR0aW5ncywgRGlzYywgVm9sdW1lMiwgRGF0YWJhc2UsIEhlbHBDaXJjbGUsIEdpdGh1YiB9IGZyb20gXCJsdWNpZGUtcmVhY3RcIjtcbmltcG9ydCB7IEFwcE1vZGUsIFRyYWNrIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IGdldFRyYWNrcyB9IGZyb20gXCIuL2xpYi9kYlwiO1xuaW1wb3J0IEV4dHJhY3RvciBmcm9tIFwiLi9jb21wb25lbnRzL0V4dHJhY3RvclwiO1xuaW1wb3J0IFBsYXllciBmcm9tIFwiLi9jb21wb25lbnRzL1BsYXllclwiO1xuaW1wb3J0IEJhY2t1cFJlc3RvcmUgZnJvbSBcIi4vY29tcG9uZW50cy9CYWNrdXBSZXN0b3JlXCI7XG5pbXBvcnQgR2l0SHViU2V0dGluZ3MgZnJvbSBcIi4vY29tcG9uZW50cy9HaXRIdWJTZXR0aW5nc1wiO1xuaW1wb3J0IHNvdW5kQm94SWNvbiBmcm9tIFwiLi9hc3NldHMvaW1hZ2VzL3NvdW5kYm94X2FwcF9pY29uX2ZsYXRfMTc4MzUyMjc0MDYwNS5qcGdcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKCkge1xuICBjb25zdCBbYWN0aXZlTW9kZSwgc2V0QWN0aXZlTW9kZV0gPSB1c2VTdGF0ZTxBcHBNb2RlPihBcHBNb2RlLlBsYXkpO1xuICBjb25zdCBbdHJhY2tzLCBzZXRUcmFja3NdID0gdXNlU3RhdGU8VHJhY2tbXT4oW10pO1xuICBjb25zdCBbY3VycmVudFRyYWNrLCBzZXRDdXJyZW50VHJhY2tdID0gdXNlU3RhdGU8VHJhY2sgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW3Nob3dTZXR0aW5ncywgc2V0U2hvd1NldHRpbmdzXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3Nob3dHaXRodWJTZXR0aW5ncywgc2V0U2hvd0dpdGh1YlNldHRpbmdzXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpO1xuXG4gIGNvbnN0IGZldGNoVHJhY2tzID0gYXN5bmMgKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYlRyYWNrcyA9IGF3YWl0IGdldFRyYWNrcygpO1xuICAgICAgc2V0VHJhY2tzKGRiVHJhY2tzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCB0cmFja3MgZnJvbSBJbmRleGVkREI6XCIsIGVycik7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgfVxuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZmV0Y2hUcmFja3MoKTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyMwNTA1MDVdIHJhZGlhbC1nbG93IHRleHQtWyNlMGUwZTBdIGZvbnQtc2FucyBzZWxlY3Rpb246YmctWyNGRjVGMUZdLzIwIHNlbGVjdGlvbjp0ZXh0LVsjRkY1RjFGXSByZWxhdGl2ZVwiPlxuICAgICAgXG4gICAgICB7LyogVXBwZXIgc3VidGxlIGdsYXNzIGhlYWRlciBiYXIgKi99XG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cInN0aWNreSB0b3AtMCB6LTQwIGJvcmRlci1iIGJvcmRlci13aGl0ZS8xMCBiZy1bIzA1MDUwNV0vOTAgYmFja2Ryb3AtYmx1ci1tZCBweC00IHNtOnB4LTggcHktNVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIGZsZXggZmxleC1jb2wgc206ZmxleC1yb3cgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgIFxuICAgICAgICAgIHsvKiBMb2dvICYgdGl0bGUgZnJvbSBEZXNpZ24gSFRNTCAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICA8aW1nIFxuICAgICAgICAgICAgICBzcmM9e3NvdW5kQm94SWNvbn0gXG4gICAgICAgICAgICAgIGFsdD1cIlNvdW5kQm94IExvZ29cIiBcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy0xMCBoLTEwIHJvdW5kZWQteGwgb2JqZWN0LWNvdmVyIHNoYWRvdy1sZyBzaGFkb3ctWyNGRjVGMUZdLzIwIGJvcmRlciBib3JkZXItd2hpdGUvMTBcIiBcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1saWdodCB0cmFja2luZy10aWdodGVyIHRleHQtd2hpdGVcIj5cbiAgICAgICAgICAgICAgICBTT1VORDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWyNGRjVGMUZdIGZvbnQtYm9sZFwiPkJPWDwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9oMT5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuM2VtXSBvcGFjaXR5LTQwXCI+XG4gICAgICAgICAgICAgICAgSHlicmlkIEV4dHJhY3Rpb24gJiBQbGF5YmFjayBFbmdpbmVcbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7LyogTW9kZSBTd2l0Y2hlciBUYWJzIGJhc2VkIG9uIGRlc2lnbiBIVE1MICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMSBwLTEgYmctd2hpdGUvNSByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci13aGl0ZS8xMFwiPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVNb2RlKEFwcE1vZGUuUGxheSl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YHB4LTYgcHktMiByb3VuZGVkLWZ1bGwgZm9udC1ib2xkIHRleHQteHMgc206dGV4dC1zbSB0cmFja2luZy13aWRlIHRyYW5zaXRpb24tYWxsIGN1cnNvci1wb2ludGVyICR7XG4gICAgICAgICAgICAgICAgYWN0aXZlTW9kZSA9PT0gQXBwTW9kZS5QbGF5XG4gICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgc2hhZG93LWxnXCJcbiAgICAgICAgICAgICAgICAgIDogXCJ0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXNsYXRlLTIwMCBob3ZlcjpiZy13aGl0ZS81XCJcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIFBMQVlCQUNLXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlTW9kZShBcHBNb2RlLkV4dHJhY3QpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BweC02IHB5LTIgcm91bmRlZC1mdWxsIGZvbnQtYm9sZCB0ZXh0LXhzIHNtOnRleHQtc20gdHJhY2tpbmctd2lkZSB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciAke1xuICAgICAgICAgICAgICAgIGFjdGl2ZU1vZGUgPT09IEFwcE1vZGUuRXh0cmFjdFxuICAgICAgICAgICAgICAgICAgPyBcImJnLVsjRkY1RjFGXSB0ZXh0LWJsYWNrIHNoYWRvdy1sZ1wiXG4gICAgICAgICAgICAgICAgICA6IFwidGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC1zbGF0ZS0yMDAgaG92ZXI6Ymctd2hpdGUvNVwiXG4gICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBFWFRSQUNUSU9OXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHsvKiBBY3Rpb25zIC8gU2V0dGluZ3MgVG9nZ2xlcyAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICBzZXRTaG93R2l0aHViU2V0dGluZ3MoIXNob3dHaXRodWJTZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgaWYgKCFzaG93R2l0aHViU2V0dGluZ3MpIHNldFNob3dTZXR0aW5ncyhmYWxzZSk7XG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMiByb3VuZGVkLXhsIGJvcmRlciB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIHRleHQteHMgZm9udC1ib2xkICR7XG4gICAgICAgICAgICAgICAgc2hvd0dpdGh1YlNldHRpbmdzXG4gICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdLzIwIGJvcmRlci1bI0ZGNUYxRl0vNDAgdGV4dC1bI0ZGNUYxRl0gZ2xvdy1vcmFuZ2VcIlxuICAgICAgICAgICAgICAgICAgOiBcImJnLXdoaXRlLzUgYm9yZGVyLXdoaXRlLzEwIHRleHQtc2xhdGUtMzAwIGhvdmVyOnRleHQtWyNGRjVGMUZdIGhvdmVyOmJnLXdoaXRlLzEwXCJcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgIHRpdGxlPVwiR2l0SHViIOOCr+ODqeOCpuODieOCueODiOODrOODvOOCuOioreWumlwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxHaXRodWIgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LVsjRkY1RjFGXVwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImhpZGRlbiBtZDppbmxpbmVcIj5HaXRIdWLlkIzmnJ88L3NwYW4+XG4gICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0U2hvd1NldHRpbmdzKCFzaG93U2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvd1NldHRpbmdzKSBzZXRTaG93R2l0aHViU2V0dGluZ3MoZmFsc2UpO1xuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwLTIuNSByb3VuZGVkLXhsIGJvcmRlciB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyICR7XG4gICAgICAgICAgICAgICAgc2hvd1NldHRpbmdzXG4gICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdLzIwIGJvcmRlci1bI0ZGNUYxRl0vNDAgdGV4dC1bI0ZGNUYxRl0gZ2xvdy1vcmFuZ2VcIlxuICAgICAgICAgICAgICAgICAgOiBcImJnLXdoaXRlLzUgYm9yZGVyLXdoaXRlLzEwIHRleHQtc2xhdGUtNDAwIGhvdmVyOnRleHQtWyNGRjVGMUZdIGhvdmVyOmJnLXdoaXRlLzEwXCJcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgIHRpdGxlPVwiWklQ44OQ44OD44Kv44Ki44OD44OX44Go44OH44O844K/566h55CGXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPERhdGFiYXNlIGNsYXNzTmFtZT1cInctNSBoLTVcIiAvPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAgey8qIE1haW4gQm9keSAqL31cbiAgICAgIDxtYWluIGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtOCBweS04IHNwYWNlLXktOFwiPlxuICAgICAgICBcbiAgICAgICAgey8qIExvYWRpbmcgU3Bpbm5lciAqL31cbiAgICAgICAge2lzTG9hZGluZyA/IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHB5LTI0IHNwYWNlLXktNFwiPlxuICAgICAgICAgICAgPERpc2MgY2xhc3NOYW1lPVwidy0xMiBoLTEyIHRleHQtWyNGRjVGMUZdIGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtbW9ubyB0cmFja2luZy13aWRlc3QgdGV4dC1bI0ZGNUYxRl0vNjBcIj5MT0FESU5HIFNUT1JBR0VfQ0FDSEUuLi48L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgPD5cbiAgICAgICAgICAgIHsvKiBDb25kaXRpb25hbCBNb2RlIFJlbmRlcmluZyAqL31cbiAgICAgICAgICAgIHthY3RpdmVNb2RlID09PSBBcHBNb2RlLkV4dHJhY3QgPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctM3hsIG14LWF1dG8gc3BhY2UteS02XCI+XG4gICAgICAgICAgICAgICAgPEV4dHJhY3RvciBvblJlZnJlc2g9e2ZldGNoVHJhY2tzfSAvPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtMnhsIHAtNSBzcGFjZS15LTNcIj5cbiAgICAgICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LVsjRkY1RjFGXSB0cmFja2luZy13aWRlc3QgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdXBwZXJjYXNlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxIZWxwQ2lyY2xlIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1bI0ZGNUYxRl1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj7mir3lh7rjg6Ljg7zjg4njga7kvb/jgYTmlrnjg7vku5Xmp5g8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2g0PlxuICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS0zMDAgc3BhY2UteS0yIGxpc3QtZGlzYyBwbC00IGxlYWRpbmctcmVsYXhlZCBmb250LXNhbnMgb3BhY2l0eS04MFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGk+WW91VHViZeWLleeUu+OBruWFseacieODquODs+OCr+OBvuOBn+OBr1VSTOOCkuiyvOOCiuS7mOOBkeOBpuOAjOmfs+WjsOOCkuaKveWHuuOAjeOCkuOCr+ODquODg+OCr+OBl+OBvuOBmeOAgjwvbGk+XG4gICAgICAgICAgICAgICAgICAgIDxsaT7lpInmj5vjgYzlrozkuobjgZnjgovjgajmm7LlkI3norroqo3nlLvpnaLjgYzooajnpLrjgZXjgozjgb7jgZnjgILjgYrlpb3jgb/jga7lkI3liY3jgavjgq/jg6rjg7zjg7PjgqLjg4Pjg5fjgZfjgabjgq3jg6Pjg4Pjgrfjg6Xjgbjkv53lrZjjgZfjgabjgY/jgaDjgZXjgYTjgII8L2xpPlxuICAgICAgICAgICAgICAgICAgICA8bGk+5L+d5a2Y44GV44KM44Gf6Z+z5aOw44Gv5pyA6auY6Z+z6LOq44GqTTRB5b2i5byP44Go44GX44Gm5a6J5YWo44Gr44OW44Op44Km44K25YaF6YOo44Gr44Gu44G/44Kt44Oj44OD44K344Ol77yI5L+d5a2Y77yJ44GV44KM44G+44GZ44CC44OR44Kx44OD44OI44KS5raI6LK744Gb44Ga44CB44Kq44OV44Op44Kk44Oz55Kw5aKD44Gn44KC5YaN55Sf5Y+v6IO944Gn44GZ44CCPC9saT5cbiAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgPFBsYXllclxuICAgICAgICAgICAgICAgIHRyYWNrcz17dHJhY2tzfVxuICAgICAgICAgICAgICAgIG9uUmVmcmVzaD17ZmV0Y2hUcmFja3N9XG4gICAgICAgICAgICAgICAgY3VycmVudFRyYWNrPXtjdXJyZW50VHJhY2t9XG4gICAgICAgICAgICAgICAgb25TZWxlY3RUcmFjaz17c2V0Q3VycmVudFRyYWNrfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgey8qIEdpdEh1YiBDbG91ZCBTdG9yYWdlIFBhbmVsICovfVxuICAgICAgICAgICAge3Nob3dHaXRodWJTZXR0aW5ncyAmJiAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctM3hsIG14LWF1dG8gbXQtNiBwdC00IGJvcmRlci10IGJvcmRlci13aGl0ZS8xMCBhbmltYXRlLWZhZGUtaW5cIj5cbiAgICAgICAgICAgICAgICA8R2l0SHViU2V0dGluZ3Mgb25SZWZyZXNoPXtmZXRjaFRyYWNrc30gLz5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICB7LyogU2xpZGUtb3V0IG9yIGNvbGxhcHNpYmxlIEJhY2t1cCBNYW5hZ2VtZW50IFBhbmVsICovfVxuICAgICAgICAgICAge3Nob3dTZXR0aW5ncyAmJiAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctM3hsIG14LWF1dG8gbXQtNiBwdC00IGJvcmRlci10IGJvcmRlci13aGl0ZS8xMCBhbmltYXRlLWZhZGUtaW5cIj5cbiAgICAgICAgICAgICAgICA8QmFja3VwUmVzdG9yZSBvblJlZnJlc2g9e2ZldGNoVHJhY2tzfSAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC8+XG4gICAgICAgICl9XG4gICAgICA8L21haW4+XG5cbiAgICAgIHsvKiBGb290ZXIgbWF0Y2hpbmcgRGVzaWduIEhUTUwgKi99XG4gICAgICA8Zm9vdGVyIGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgc206cHgtOCBweS04IGZsZXggZmxleC1jb2wgc206ZmxleC1yb3cganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBib3JkZXItdCBib3JkZXItd2hpdGUvNSB0ZXh0LVsxMHB4XSBmb250LW1vbm8gdGV4dC13aGl0ZS8zMCBnYXAtNFwiPlxuICAgICAgICA8ZGl2PlNZU1RFTV9WMi4xLjIgLy8gQ0FDSEVfU1RBVFVTOiBOT01JTkFMPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtNlwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInVwcGVyY2FzZSBob3Zlcjp0ZXh0LVsjRkY1RjFGXSB0cmFuc2l0aW9uLWNvbG9ycyBjdXJzb3ItcG9pbnRlclwiPlByaXZhY3k8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidXBwZXJjYXNlIGhvdmVyOnRleHQtWyNGRjVGMUZdIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyXCI+U3VwcG9ydDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ1cHBlcmNhc2UgdGV4dC1bI0ZGNUYxRl0gZm9udC1ib2xkXCI+UHJlbWl1bSBBdWRpbyBFbmdpbmU8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9mb290ZXI+XG5cbiAgICAgIHsvKiBGbG9hdGluZyBnbG9iYWwgcGxheWJhY2sgYmFubmVyIHdoZW4gaW4gRXh0cmFjdCBNb2RlICovfVxuICAgICAge2N1cnJlbnRUcmFjayAmJiBhY3RpdmVNb2RlID09PSBBcHBNb2RlLkV4dHJhY3QgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGJvdHRvbS00IHJpZ2h0LTQgbWF4LXctc20gdy1mdWxsIGJnLVsjMDUwNTA1XS85NSBiYWNrZHJvcC1ibHVyLW1kIGJvcmRlciBib3JkZXItWyNGRjVGMUZdLzMwIHAtNCByb3VuZGVkLXhsIHNoYWRvdy0yeGwgei01MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTMgYW5pbWF0ZS1mYWRlLWluIGdsb3ctb3JhbmdlXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtaW4tdy0wXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTAgaC0xMCByb3VuZGVkLWxnIGJnLVsjRkY1RjFGXS8xMCB0ZXh0LVsjRkY1RjFGXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wIGFuaW1hdGUtc3Bpbi1zbG93XCI+XG4gICAgICAgICAgICAgIDxEaXNjIGNsYXNzTmFtZT1cInctNSBoLTVcIiAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi13LTBcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtWyNGRjVGMUZdIGZvbnQtYm9sZFwiPk5PVyBQTEFZSU5HPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS0xMDAgdHJ1bmNhdGUgbXQtMC41XCI+XG4gICAgICAgICAgICAgICAge2N1cnJlbnRUcmFjay50aXRsZX1cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0QWN0aXZlTW9kZShBcHBNb2RlLlBsYXkpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiYmctd2hpdGUgaG92ZXI6YmctWyNGRjVGMUZdIHRleHQtYmxhY2sgdGV4dC14cyBmb250LWJvbGQgcHktMS41IHB4LTMgcm91bmRlZC1sZyBmbGV4LXNocmluay0wIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIFBMQVlFUlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwibWFwcGluZ3MiOiJBQTBDWSxTQXNGRixVQXRGRTtBQTFDWixTQUFnQixVQUFVLGlCQUFpQjtBQUMzQyxTQUFtQyxNQUFlLFVBQVUsWUFBWSxjQUFjO0FBQ3RGLFNBQVMsZUFBc0I7QUFDL0IsU0FBUyxpQkFBaUI7QUFDMUIsT0FBTyxlQUFlO0FBQ3RCLE9BQU8sWUFBWTtBQUNuQixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLG9CQUFvQjtBQUMzQixPQUFPLGtCQUFrQjtBQUV6Qix3QkFBd0IsTUFBTTtBQUM1QixRQUFNLENBQUMsWUFBWSxhQUFhLElBQUksU0FBa0IsUUFBUSxJQUFJO0FBQ2xFLFFBQU0sQ0FBQyxRQUFRLFNBQVMsSUFBSSxTQUFrQixDQUFDLENBQUM7QUFDaEQsUUFBTSxDQUFDLGNBQWMsZUFBZSxJQUFJLFNBQXVCLElBQUk7QUFDbkUsUUFBTSxDQUFDLGNBQWMsZUFBZSxJQUFJLFNBQVMsS0FBSztBQUN0RCxRQUFNLENBQUMsb0JBQW9CLHFCQUFxQixJQUFJLFNBQVMsS0FBSztBQUNsRSxRQUFNLENBQUMsV0FBVyxZQUFZLElBQUksU0FBUyxJQUFJO0FBRS9DLFFBQU0sY0FBYyxZQUFZO0FBQzlCLFFBQUk7QUFDRixZQUFNLFdBQVcsTUFBTSxVQUFVO0FBQ2pDLGdCQUFVLFFBQVE7QUFBQSxJQUNwQixTQUFTLEtBQUs7QUFDWixjQUFRLE1BQU0seUNBQXlDLEdBQUc7QUFBQSxJQUM1RCxVQUFFO0FBQ0EsbUJBQWEsS0FBSztBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUVBLFlBQVUsTUFBTTtBQUNkLGdCQUFZO0FBQUEsRUFDZCxHQUFHLENBQUMsQ0FBQztBQUVMLFNBQ0UsdUJBQUMsU0FBSSxXQUFVLDhIQUdiO0FBQUEsMkJBQUMsWUFBTyxXQUFVLGlHQUNoQixpQ0FBQyxTQUFJLFdBQVUsa0ZBR2I7QUFBQSw2QkFBQyxT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