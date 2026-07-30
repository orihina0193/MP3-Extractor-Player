import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=1f31155a"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=1f31155a"; const useState = __vite__cjsImport1_react["useState"]; const useRef = __vite__cjsImport1_react["useRef"];
import { Download, Upload, Trash2, AlertTriangle, Loader2, RefreshCw, FileAudio } from "/node_modules/.vite/deps/lucide-react.js?v=1f31155a";
import { exportBackup, importBackup, importExternalBackup } from "/src/lib/backup.ts";
import { clearAllTracks } from "/src/lib/db.ts";
export default function BackupRestore({ onRefresh }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedZipBlob, setConvertedZipBlob] = useState(null);
  const [conversionProgress, setConversionProgress] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);
  const externalFileInputRef = useRef(null);
  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8e3);
  };
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      const blob = await exportBackup((percent) => {
        setExportProgress(percent);
      });
      const fileName = `m4a_audio_backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`;
      const file = new File([blob], fileName, { type: "application/zip" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "SoundBox バックアップ",
          text: "SoundBoxの音声バックアップデータです。"
        });
        showMsg("バックアップファイルを共有・保存しました！", "success");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1e4);
        showMsg("バックアップをZIPファイルとして保存しました！", "success");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      console.error(err);
      showMsg("バックアップの作成に失敗しました: " + (err.message || "メモリ不足または通信エラー"), "error");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await importBackup(file);
      showMsg(`復元完了: ${result.totalCount}個中 ${result.successCount}個のトラックを復元しました！`, "success");
      onRefresh();
    } catch (err) {
      console.error(err);
      showMsg("復元に失敗しました。ZIPファイルが正しいバックアップであることを確認してください。" + err.message, "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const handleExternalImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsConverting(true);
    setConvertedZipBlob(null);
    setConversionProgress(null);
    try {
      const result = await importExternalBackup(file, (current, total) => {
        setConversionProgress({ current, total });
      });
      setConvertedZipBlob(result.convertedZipBlob);
      showMsg(
        `変換・合流完了: 他アプリのバックアップから ${result.totalCount}個中 ${result.successCount}個のトラックを検出し、SoundBoxライブラリに直接マージしました！`,
        "success"
      );
      onRefresh();
    } catch (err) {
      console.error(err);
      showMsg("他アプリZIPの変換に失敗しました: " + err.message, "error");
    } finally {
      setIsConverting(false);
      setConversionProgress(null);
      if (externalFileInputRef.current) {
        externalFileInputRef.current.value = "";
      }
    }
  };
  const handleDownloadConverted = () => {
    if (!convertedZipBlob) return;
    const url = URL.createObjectURL(convertedZipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundbox_converted_backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg("SoundBox規格に適合させたバックアップZIPを保存しました！次回からは通常の「ZIPから復元」で安全に取り込めます。", "success");
  };
  const handleClearAll = async () => {
    try {
      await clearAllTracks();
      showMsg("すべてのデータを削除しました。", "info");
      setShowClearConfirm(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      showMsg("削除に失敗しました: " + err.message, "error");
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1", children: [
      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-[#FF5F1F] tracking-widest uppercase flex items-center gap-2", children: "バックアップとデータ管理" }, void 0, false, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 151,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-400 font-mono", children: "いつでもお使いの音楽データをZIPファイルでエクスポート・インポートできます。" }, void 0, false, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 154,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/BackupRestore.tsx",
      lineNumber: 150,
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
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 160,
        columnNumber: 9
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handleExport,
          disabled: isExporting || isImporting || isConverting,
          className: "flex items-center justify-center gap-3 bg-[#FF5F1F] hover:bg-amber-500 disabled:opacity-50 text-black py-4 px-4 rounded-xl font-bold transition cursor-pointer",
          children: isExporting ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 animate-spin" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 183,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: exportProgress > 0 ? `ZIP作成中... ${exportProgress}%` : "データ集約中..." }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 184,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 182,
            columnNumber: 13
          }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Download, { className: "w-5 h-5" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 188,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "ZIPバックアップを保存" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 189,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 187,
            columnNumber: 13
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 176,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => fileInputRef.current?.click(),
          disabled: isExporting || isImporting || isConverting,
          className: "flex items-center justify-center gap-3 bg-white hover:bg-[#FF5F1F] hover:text-black disabled:opacity-50 text-black py-4 px-4 rounded-xl font-bold transition cursor-pointer",
          children: isImporting ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Loader2, { className: "w-5 h-5 animate-spin" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 202,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "復元中..." }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 203,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 201,
            columnNumber: 13
          }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(Upload, { className: "w-5 h-5" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 207,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "ZIPから復元" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 208,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 206,
            columnNumber: 13
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 195,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "file",
          ref: fileInputRef,
          onChange: handleImport,
          accept: ".zip",
          className: "hidden"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 212,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/BackupRestore.tsx",
      lineNumber: 174,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "border-t border-white/10 pt-6 space-y-4", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1", children: [
        /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-amber-500 tracking-wider uppercase flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(RefreshCw, { className: "w-4 h-4 text-amber-500 animate-spin-slow" }, void 0, false, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 225,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "他アプリ（.bin形式）ZIPの取り込み・規格変換" }, void 0, false, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 226,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 224,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-slate-400 leading-relaxed font-sans", children: [
          "別アプリで作成された、拡張子 ",
          /* @__PURE__ */ jsxDEV("code", { className: "font-mono bg-white/5 px-1 py-0.5 rounded text-amber-400", children: ".bin" }, void 0, false, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 229,
            columnNumber: 28
          }, this),
          " の音声とカスタムJSONが含まれるバックアップZIPを、SoundBoxに適合するフォーマット（.mp3 + 規格化メタデータ）へ変換し、",
          /* @__PURE__ */ jsxDEV("strong", { children: "同時にこのライブラリへ直接マージ（追加）" }, void 0, false, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 229,
            columnNumber: 183
          }, this),
          "します。"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 228,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 223,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold text-slate-200", children: "他アプリのバックアップZIPを取り込む" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 236,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 font-mono mt-0.5", children: '対応: "name", "fileName", .bin 拡張子' }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 237,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 235,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => externalFileInputRef.current?.click(),
              disabled: isExporting || isImporting || isConverting,
              className: "flex items-center gap-2 bg-amber-600/20 border border-amber-500/40 hover:bg-amber-500 hover:text-black disabled:opacity-50 text-amber-300 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer",
              children: isConverting ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(Loader2, { className: "w-4 h-4 animate-spin" }, void 0, false, {
                  fileName: "/app/applet/src/components/BackupRestore.tsx",
                  lineNumber: 247,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: conversionProgress ? `変換・合流中 (${conversionProgress.current}/${conversionProgress.total})` : "パース・変換中..." }, void 0, false, {
                  fileName: "/app/applet/src/components/BackupRestore.tsx",
                  lineNumber: 248,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/BackupRestore.tsx",
                lineNumber: 246,
                columnNumber: 17
              }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV(FileAudio, { className: "w-4 h-4" }, void 0, false, {
                  fileName: "/app/applet/src/components/BackupRestore.tsx",
                  lineNumber: 256,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "他アプリZIPを選択して合流" }, void 0, false, {
                  fileName: "/app/applet/src/components/BackupRestore.tsx",
                  lineNumber: 257,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/BackupRestore.tsx",
                lineNumber: 255,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 240,
              columnNumber: 13
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "file",
              ref: externalFileInputRef,
              onChange: handleExternalImport,
              accept: ".zip",
              className: "hidden"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 261,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 234,
          columnNumber: 11
        }, this),
        convertedZipBlob && /* @__PURE__ */ jsxDEV("div", { className: "border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-emerald-400 font-medium", children: "🎉 SoundBox規格に変換された、新しい適合バックアップファイルが生成されました！" }, void 0, false, {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 273,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: handleDownloadConverted,
              className: "flex items-center gap-2 bg-[#FF5F1F] hover:bg-amber-500 text-black py-2 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-lg shadow-[#FF5F1F]/15",
              children: [
                /* @__PURE__ */ jsxDEV(Download, { className: "w-3.5 h-3.5" }, void 0, false, {
                  fileName: "/app/applet/src/components/BackupRestore.tsx",
                  lineNumber: 280,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "変換後のZIPを保存（推奨）" }, void 0, false, {
                  fileName: "/app/applet/src/components/BackupRestore.tsx",
                  lineNumber: 281,
                  columnNumber: 17
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 276,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 272,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 233,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/BackupRestore.tsx",
      lineNumber: 222,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "border-t border-white/15 pt-4 flex justify-between items-center", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400 font-mono", children: "全データをブラウザキャッシュからクリア" }, void 0, false, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 289,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setShowClearConfirm(true),
          className: "flex items-center gap-2 text-rose-400 hover:text-rose-300 text-xs py-2 px-3 hover:bg-rose-500/10 rounded-lg transition font-medium cursor-pointer",
          children: [
            /* @__PURE__ */ jsxDEV(Trash2, { className: "w-4 h-4" }, void 0, false, {
              fileName: "/app/applet/src/components/BackupRestore.tsx",
              lineNumber: 296,
              columnNumber: 11
            }, this),
            "データを全消去"
          ]
        },
        void 0,
        true,
        {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 292,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/BackupRestore.tsx",
      lineNumber: 288,
      columnNumber: 7
    }, this),
    showClearConfirm && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-[#050505] border border-white/10 max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 text-rose-400", children: [
        /* @__PURE__ */ jsxDEV(AlertTriangle, { className: "w-6 h-6 flex-shrink-0" }, void 0, false, {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 306,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("h4", { className: "text-sm font-bold uppercase tracking-wider", children: "データを全消去しますか？" }, void 0, false, {
          fileName: "/app/applet/src/components/BackupRestore.tsx",
          lineNumber: 307,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 305,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-300 leading-relaxed font-sans", children: "保存したすべての音楽（M4Aファイル）がブラウザから削除されます。この操作は取り消せません。" }, void 0, false, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 309,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex justify-end gap-3 pt-2 font-mono text-xs", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setShowClearConfirm(false),
            className: "px-4 py-2 bg-white/5 hover:bg-white/15 text-slate-300 rounded-lg transition cursor-pointer",
            children: "キャンセル"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 313,
            columnNumber: 15
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: handleClearAll,
            className: "px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer",
            children: "消去する"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/BackupRestore.tsx",
            lineNumber: 319,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/BackupRestore.tsx",
        lineNumber: 312,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/BackupRestore.tsx",
      lineNumber: 304,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/BackupRestore.tsx",
      lineNumber: 303,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/components/BackupRestore.tsx",
    lineNumber: 149,
    columnNumber: 5
  }, this);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkJhY2t1cFJlc3RvcmUudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyB1c2VTdGF0ZSwgdXNlUmVmIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBEb3dubG9hZCwgVXBsb2FkLCBUcmFzaDIsIEFsZXJ0VHJpYW5nbGUsIExvYWRlcjIsIFJlZnJlc2hDdywgRmlsZUF1ZGlvIH0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xuaW1wb3J0IHsgZXhwb3J0QmFja3VwLCBpbXBvcnRCYWNrdXAsIGltcG9ydEV4dGVybmFsQmFja3VwIH0gZnJvbSBcIi4uL2xpYi9iYWNrdXBcIjtcbmltcG9ydCB7IGNsZWFyQWxsVHJhY2tzIH0gZnJvbSBcIi4uL2xpYi9kYlwiO1xuXG5pbnRlcmZhY2UgQmFja3VwUmVzdG9yZVByb3BzIHtcbiAgb25SZWZyZXNoOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCYWNrdXBSZXN0b3JlKHsgb25SZWZyZXNoIH06IEJhY2t1cFJlc3RvcmVQcm9wcykge1xuICBjb25zdCBbaXNFeHBvcnRpbmcsIHNldElzRXhwb3J0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2V4cG9ydFByb2dyZXNzLCBzZXRFeHBvcnRQcm9ncmVzc10gPSB1c2VTdGF0ZTxudW1iZXI+KDApO1xuICBjb25zdCBbaXNJbXBvcnRpbmcsIHNldElzSW1wb3J0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2lzQ29udmVydGluZywgc2V0SXNDb252ZXJ0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2NvbnZlcnRlZFppcEJsb2IsIHNldENvbnZlcnRlZFppcEJsb2JdID0gdXNlU3RhdGU8QmxvYiB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbY29udmVyc2lvblByb2dyZXNzLCBzZXRDb252ZXJzaW9uUHJvZ3Jlc3NdID0gdXNlU3RhdGU8eyBjdXJyZW50OiBudW1iZXI7IHRvdGFsOiBudW1iZXIgfSB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbc2hvd0NsZWFyQ29uZmlybSwgc2V0U2hvd0NsZWFyQ29uZmlybV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFttZXNzYWdlLCBzZXRNZXNzYWdlXSA9IHVzZVN0YXRlPHsgdGV4dDogc3RyaW5nOyB0eXBlOiBcInN1Y2Nlc3NcIiB8IFwiZXJyb3JcIiB8IFwiaW5mb1wiIH0gfCBudWxsPihudWxsKTtcbiAgXG4gIGNvbnN0IGZpbGVJbnB1dFJlZiA9IHVzZVJlZjxIVE1MSW5wdXRFbGVtZW50PihudWxsKTtcbiAgY29uc3QgZXh0ZXJuYWxGaWxlSW5wdXRSZWYgPSB1c2VSZWY8SFRNTElucHV0RWxlbWVudD4obnVsbCk7XG5cbiAgY29uc3Qgc2hvd01zZyA9ICh0ZXh0OiBzdHJpbmcsIHR5cGU6IFwic3VjY2Vzc1wiIHwgXCJlcnJvclwiIHwgXCJpbmZvXCIpID0+IHtcbiAgICBzZXRNZXNzYWdlKHsgdGV4dCwgdHlwZSB9KTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHNldE1lc3NhZ2UobnVsbCksIDgwMDApOyAvLyBHaXZlIGEgYml0IG1vcmUgdGltZSB0byByZWFkIGxvbmcgc3VjY2Vzcy9pbmZvIG1lc3NhZ2VzXG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRXhwb3J0ID0gYXN5bmMgKCkgPT4ge1xuICAgIHNldElzRXhwb3J0aW5nKHRydWUpO1xuICAgIHNldEV4cG9ydFByb2dyZXNzKDApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBibG9iID0gYXdhaXQgZXhwb3J0QmFja3VwKChwZXJjZW50KSA9PiB7XG4gICAgICAgIHNldEV4cG9ydFByb2dyZXNzKHBlcmNlbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gYG00YV9hdWRpb19iYWNrdXBfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApfS56aXBgO1xuICAgICAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFtibG9iXSwgZmlsZU5hbWUsIHsgdHlwZTogXCJhcHBsaWNhdGlvbi96aXBcIiB9KTtcblxuICAgICAgLy8gaU9TIFNhZmFyaeetieOBrldlYiBDb250ZW5044OX44Ot44K744K544Gu44Oh44Oi44Oq5LiK6ZmQ44Gr44KI44KL44Kv44Op44OD44K344Ol44KS6Ziy44GQ44Gf44KB44CBXG4gICAgICAvLyDlhbHmnInmqZ/og70obmF2aWdhdG9yLnNoYXJlKeOBjOS9v+OBiOOCi+WgtOWQiOOBr+ODjeOCpOODhuOCo+ODluWFseacieODgOOCpOOCouODreOCsOOCkumWi+OBhOOBpuOAjOODleOCoeOCpOODq+OBq+S/neWtmOOAjeOBleOBm+OCi1xuICAgICAgaWYgKG5hdmlnYXRvci5jYW5TaGFyZSAmJiBuYXZpZ2F0b3IuY2FuU2hhcmUoeyBmaWxlczogW2ZpbGVdIH0pKSB7XG4gICAgICAgIGF3YWl0IG5hdmlnYXRvci5zaGFyZSh7XG4gICAgICAgICAgZmlsZXM6IFtmaWxlXSxcbiAgICAgICAgICB0aXRsZTogXCJTb3VuZEJveCDjg5Djg4Pjgq/jgqLjg4Pjg5dcIixcbiAgICAgICAgICB0ZXh0OiBcIlNvdW5kQm9444Gu6Z+z5aOw44OQ44OD44Kv44Ki44OD44OX44OH44O844K/44Gn44GZ44CCXCJcbiAgICAgICAgfSk7XG4gICAgICAgIHNob3dNc2coXCLjg5Djg4Pjgq/jgqLjg4Pjg5fjg5XjgqHjgqTjg6vjgpLlhbHmnInjg7vkv53lrZjjgZfjgb7jgZfjgZ/vvIFcIiwgXCJzdWNjZXNzXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8g44OV44Kp44O844Or44OQ44OD44KvOiDlvpPmnaXlnovjga7jg4Djgqbjg7Pjg63jg7zjg4njg6rjg7Pjgq/nmbrngatcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICBhLmhyZWYgPSB1cmw7XG4gICAgICAgIGEuZG93bmxvYWQgPSBmaWxlTmFtZTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgYS5jbGljaygpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGEpO1xuICAgICAgICBcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCksIDEwMDAwKTtcbiAgICAgICAgc2hvd01zZyhcIuODkOODg+OCr+OCouODg+ODl+OCklpJUOODleOCoeOCpOODq+OBqOOBl+OBpuS/neWtmOOBl+OBvuOBl+OBn++8gVwiLCBcInN1Y2Nlc3NcIik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGlmIChlcnIubmFtZSA9PT0gXCJBYm9ydEVycm9yXCIpIHtcbiAgICAgICAgLy8g44Om44O844K244O844GM5YWx5pyJ44K344O844OI44KS44Kt44Oj44Oz44K744Or44GX44Gf5aC05ZCIXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHNob3dNc2coXCLjg5Djg4Pjgq/jgqLjg4Pjg5fjga7kvZzmiJDjgavlpLHmlZfjgZfjgb7jgZfjgZ86IFwiICsgKGVyci5tZXNzYWdlIHx8IFwi44Oh44Oi44Oq5LiN6Laz44G+44Gf44Gv6YCa5L+h44Ko44Op44O8XCIpLCBcImVycm9yXCIpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc0V4cG9ydGluZyhmYWxzZSk7XG4gICAgICBzZXRFeHBvcnRQcm9ncmVzcygwKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlSW1wb3J0ID0gYXN5bmMgKGU6IFJlYWN0LkNoYW5nZUV2ZW50PEhUTUxJbnB1dEVsZW1lbnQ+KSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IGUudGFyZ2V0LmZpbGVzPy5bMF07XG4gICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICBzZXRJc0ltcG9ydGluZyh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaW1wb3J0QmFja3VwKGZpbGUpO1xuICAgICAgc2hvd01zZyhg5b6p5YWD5a6M5LqGOiAke3Jlc3VsdC50b3RhbENvdW50feWAi+S4rSAke3Jlc3VsdC5zdWNjZXNzQ291bnR95YCL44Gu44OI44Op44OD44Kv44KS5b6p5YWD44GX44G+44GX44Gf77yBYCwgXCJzdWNjZXNzXCIpO1xuICAgICAgb25SZWZyZXNoKCk7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHNob3dNc2coXCLlvqnlhYPjgavlpLHmlZfjgZfjgb7jgZfjgZ/jgIJaSVDjg5XjgqHjgqTjg6vjgYzmraPjgZfjgYTjg5Djg4Pjgq/jgqLjg4Pjg5fjgafjgYLjgovjgZPjgajjgpLnorroqo3jgZfjgabjgY/jgaDjgZXjgYTjgIJcIiArIGVyci5tZXNzYWdlLCBcImVycm9yXCIpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRJc0ltcG9ydGluZyhmYWxzZSk7XG4gICAgICBpZiAoZmlsZUlucHV0UmVmLmN1cnJlbnQpIHtcbiAgICAgICAgZmlsZUlucHV0UmVmLmN1cnJlbnQudmFsdWUgPSBcIlwiO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBjb25zdCBoYW5kbGVFeHRlcm5hbEltcG9ydCA9IGFzeW5jIChlOiBSZWFjdC5DaGFuZ2VFdmVudDxIVE1MSW5wdXRFbGVtZW50PikgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSBlLnRhcmdldC5maWxlcz8uWzBdO1xuICAgIGlmICghZmlsZSkgcmV0dXJuO1xuXG4gICAgc2V0SXNDb252ZXJ0aW5nKHRydWUpO1xuICAgIHNldENvbnZlcnRlZFppcEJsb2IobnVsbCk7XG4gICAgc2V0Q29udmVyc2lvblByb2dyZXNzKG51bGwpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbXBvcnRFeHRlcm5hbEJhY2t1cChmaWxlLCAoY3VycmVudCwgdG90YWwpID0+IHtcbiAgICAgICAgc2V0Q29udmVyc2lvblByb2dyZXNzKHsgY3VycmVudCwgdG90YWwgfSk7XG4gICAgICB9KTtcbiAgICAgIHNldENvbnZlcnRlZFppcEJsb2IocmVzdWx0LmNvbnZlcnRlZFppcEJsb2IpO1xuICAgICAgc2hvd01zZyhcbiAgICAgICAgYOWkieaPm+ODu+WQiOa1geWujOS6hjog5LuW44Ki44OX44Oq44Gu44OQ44OD44Kv44Ki44OD44OX44GL44KJICR7cmVzdWx0LnRvdGFsQ291bnR95YCL5LitICR7cmVzdWx0LnN1Y2Nlc3NDb3VudH3lgIvjga7jg4jjg6njg4Pjgq/jgpLmpJzlh7rjgZfjgIFTb3VuZEJveOODqeOCpOODluODqeODquOBq+ebtOaOpeODnuODvOOCuOOBl+OBvuOBl+OBn++8gWAsXG4gICAgICAgIFwic3VjY2Vzc1wiXG4gICAgICApO1xuICAgICAgb25SZWZyZXNoKCk7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIHNob3dNc2coXCLku5bjgqLjg5fjg6paSVDjga7lpInmj5vjgavlpLHmlZfjgZfjgb7jgZfjgZ86IFwiICsgZXJyLm1lc3NhZ2UsIFwiZXJyb3JcIik7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldElzQ29udmVydGluZyhmYWxzZSk7XG4gICAgICBzZXRDb252ZXJzaW9uUHJvZ3Jlc3MobnVsbCk7XG4gICAgICBpZiAoZXh0ZXJuYWxGaWxlSW5wdXRSZWYuY3VycmVudCkge1xuICAgICAgICBleHRlcm5hbEZpbGVJbnB1dFJlZi5jdXJyZW50LnZhbHVlID0gXCJcIjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRG93bmxvYWRDb252ZXJ0ZWQgPSAoKSA9PiB7XG4gICAgaWYgKCFjb252ZXJ0ZWRaaXBCbG9iKSByZXR1cm47XG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChjb252ZXJ0ZWRaaXBCbG9iKTtcbiAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgYS5ocmVmID0gdXJsO1xuICAgIGEuZG93bmxvYWQgPSBgc291bmRib3hfY29udmVydGVkX2JhY2t1cF8ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCl9LnppcGA7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICBhLmNsaWNrKCk7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcbiAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgc2hvd01zZyhcIlNvdW5kQm946KaP5qC844Gr6YGp5ZCI44GV44Gb44Gf44OQ44OD44Kv44Ki44OD44OXWklQ44KS5L+d5a2Y44GX44G+44GX44Gf77yB5qyh5Zue44GL44KJ44Gv6YCa5bi444Gu44CMWklQ44GL44KJ5b6p5YWD44CN44Gn5a6J5YWo44Gr5Y+W44KK6L6844KB44G+44GZ44CCXCIsIFwic3VjY2Vzc1wiKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVDbGVhckFsbCA9IGFzeW5jICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY2xlYXJBbGxUcmFja3MoKTtcbiAgICAgIHNob3dNc2coXCLjgZnjgbnjgabjga7jg4fjg7zjgr/jgpLliYrpmaTjgZfjgb7jgZfjgZ/jgIJcIiwgXCJpbmZvXCIpO1xuICAgICAgc2V0U2hvd0NsZWFyQ29uZmlybShmYWxzZSk7XG4gICAgICBvblJlZnJlc2goKTtcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgc2hvd01zZyhcIuWJiumZpOOBq+WkseaVl+OBl+OBvuOBl+OBnzogXCIgKyBlcnIubWVzc2FnZSwgXCJlcnJvclwiKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLTN4bCBwLTYgc206cC04IHNwYWNlLXktNlwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xXCI+XG4gICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LVsjRkY1RjFGXSB0cmFja2luZy13aWRlc3QgdXBwZXJjYXNlIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAg44OQ44OD44Kv44Ki44OD44OX44Go44OH44O844K/566h55CGXG4gICAgICAgIDwvaDM+XG4gICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS00MDAgZm9udC1tb25vXCI+XG4gICAgICAgICAg44GE44Gk44Gn44KC44GK5L2/44GE44Gu6Z+z5qW944OH44O844K/44KSWklQ44OV44Kh44Kk44Or44Gn44Ko44Kv44K544Od44O844OI44O744Kk44Oz44Od44O844OI44Gn44GN44G+44GZ44CCXG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuXG4gICAgICB7bWVzc2FnZSAmJiAoXG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9e2BwLTQgcm91bmRlZC14bCB0ZXh0LXhzIGZvbnQtbW9ubyBib3JkZXIgbGVhZGluZy1yZWxheGVkICR7XG4gICAgICAgICAgICBtZXNzYWdlLnR5cGUgPT09IFwic3VjY2Vzc1wiXG4gICAgICAgICAgICAgID8gXCJiZy1bI0ZGNUYxRl0vMTAgYm9yZGVyLVsjRkY1RjFGXS8zMCB0ZXh0LVsjRkY1RjFGXVwiXG4gICAgICAgICAgICAgIDogbWVzc2FnZS50eXBlID09PSBcImVycm9yXCJcbiAgICAgICAgICAgICAgPyBcImJnLXJvc2UtNTAwLzEwIGJvcmRlciBib3JkZXItcm9zZS01MDAvMjAgdGV4dC1yb3NlLTQwMFwiXG4gICAgICAgICAgICAgIDogXCJiZy1hbWJlci01MDAvMTAgYm9yZGVyIGJvcmRlci1hbWJlci01MDAvMjAgdGV4dC1hbWJlci00MDBcIlxuICAgICAgICAgIH1gfVxuICAgICAgICA+XG4gICAgICAgICAge21lc3NhZ2UudGV4dH1cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICB7LyogUHJpbWFyeSBCYWNrdXAgYW5kIFJlc3RvcmUgKi99XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgZ2FwLTRcIj5cbiAgICAgICAgey8qIEV4cG9ydCBCdXR0b24gKi99XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVFeHBvcnR9XG4gICAgICAgICAgZGlzYWJsZWQ9e2lzRXhwb3J0aW5nIHx8IGlzSW1wb3J0aW5nIHx8IGlzQ29udmVydGluZ31cbiAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyBiZy1bI0ZGNUYxRl0gaG92ZXI6YmctYW1iZXItNTAwIGRpc2FibGVkOm9wYWNpdHktNTAgdGV4dC1ibGFjayBweS00IHB4LTQgcm91bmRlZC14bCBmb250LWJvbGQgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgID5cbiAgICAgICAgICB7aXNFeHBvcnRpbmcgPyAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJ3LTUgaC01IGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuPntleHBvcnRQcm9ncmVzcyA+IDAgPyBgWklQ5L2c5oiQ5LitLi4uICR7ZXhwb3J0UHJvZ3Jlc3N9JWAgOiBcIuODh+ODvOOCv+mbhue0hOS4rS4uLlwifTwvc3Bhbj5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8RG93bmxvYWQgY2xhc3NOYW1lPVwidy01IGgtNVwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuPlpJUOODkOODg+OCr+OCouODg+ODl+OCkuS/neWtmDwvc3Bhbj5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICl9XG4gICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgIHsvKiBJbXBvcnQgQnV0dG9uIFRyaWdnZXIgKi99XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBmaWxlSW5wdXRSZWYuY3VycmVudD8uY2xpY2soKX1cbiAgICAgICAgICBkaXNhYmxlZD17aXNFeHBvcnRpbmcgfHwgaXNJbXBvcnRpbmcgfHwgaXNDb252ZXJ0aW5nfVxuICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0zIGJnLXdoaXRlIGhvdmVyOmJnLVsjRkY1RjFGXSBob3Zlcjp0ZXh0LWJsYWNrIGRpc2FibGVkOm9wYWNpdHktNTAgdGV4dC1ibGFjayBweS00IHB4LTQgcm91bmRlZC14bCBmb250LWJvbGQgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgID5cbiAgICAgICAgICB7aXNJbXBvcnRpbmcgPyAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJ3LTUgaC01IGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuPuW+qeWFg+S4rS4uLjwvc3Bhbj5cbiAgICAgICAgICAgIDwvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8PlxuICAgICAgICAgICAgICA8VXBsb2FkIGNsYXNzTmFtZT1cInctNSBoLTVcIiAvPlxuICAgICAgICAgICAgICA8c3Bhbj5aSVDjgYvjgonlvqnlhYM8L3NwYW4+XG4gICAgICAgICAgICA8Lz5cbiAgICAgICAgICApfVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgdHlwZT1cImZpbGVcIlxuICAgICAgICAgIHJlZj17ZmlsZUlucHV0UmVmfVxuICAgICAgICAgIG9uQ2hhbmdlPXtoYW5kbGVJbXBvcnR9XG4gICAgICAgICAgYWNjZXB0PVwiLnppcFwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCJcbiAgICAgICAgLz5cbiAgICAgIDwvZGl2PlxuXG4gICAgICB7LyogQWR2YW5jZWQgQnJpZGdlIC8gRXh0ZXJuYWwgYXBwIGltcG9ydCBwYW5lbCBzdWdnZXN0ZWQgYnkgdXNlciAqL31cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYm9yZGVyLXQgYm9yZGVyLXdoaXRlLzEwIHB0LTYgc3BhY2UteS00XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMVwiPlxuICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTUwMCB0cmFja2luZy13aWRlciB1cHBlcmNhc2UgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgIDxSZWZyZXNoQ3cgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LWFtYmVyLTUwMCBhbmltYXRlLXNwaW4tc2xvd1wiIC8+XG4gICAgICAgICAgICA8c3Bhbj7ku5bjgqLjg5fjg6rvvIguYmlu5b2i5byP77yJWklQ44Gu5Y+W44KK6L6844G/44O76KaP5qC85aSJ5o+bPC9zcGFuPlxuICAgICAgICAgIDwvaDQ+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zbGF0ZS00MDAgbGVhZGluZy1yZWxheGVkIGZvbnQtc2Fuc1wiPlxuICAgICAgICAgICAg5Yil44Ki44OX44Oq44Gn5L2c5oiQ44GV44KM44Gf44CB5ouh5by15a2QIDxjb2RlIGNsYXNzTmFtZT1cImZvbnQtbW9ubyBiZy13aGl0ZS81IHB4LTEgcHktMC41IHJvdW5kZWQgdGV4dC1hbWJlci00MDBcIj4uYmluPC9jb2RlPiDjga7pn7Plo7Djgajjgqvjgrnjgr/jg6BKU09O44GM5ZCr44G+44KM44KL44OQ44OD44Kv44Ki44OD44OXWklQ44KS44CBU291bmRCb3jjgavpganlkIjjgZnjgovjg5Xjgqnjg7zjg57jg4Pjg4jvvIgubXAzICsg6KaP5qC85YyW44Oh44K/44OH44O844K/77yJ44G45aSJ5o+b44GX44CBPHN0cm9uZz7lkIzmmYLjgavjgZPjga7jg6njgqTjg5bjg6njg6rjgbjnm7TmjqXjg57jg7zjgrjvvIjov73liqDvvIk8L3N0cm9uZz7jgZfjgb7jgZnjgIJcbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzUgcm91bmRlZC0yeGwgcC00IHNtOnAtNSBzcGFjZS15LTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTNcIj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTIwMFwiPuS7luOCouODl+ODquOBruODkOODg+OCr+OCouODg+ODl1pJUOOCkuWPluOCiui+vOOCgDwvcD5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1tb25vIG10LTAuNVwiPuWvvuW/nDogXCJuYW1lXCIsIFwiZmlsZU5hbWVcIiwgLmJpbiDmi6HlvLXlrZA8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBleHRlcm5hbEZpbGVJbnB1dFJlZi5jdXJyZW50Py5jbGljaygpfVxuICAgICAgICAgICAgICBkaXNhYmxlZD17aXNFeHBvcnRpbmcgfHwgaXNJbXBvcnRpbmcgfHwgaXNDb252ZXJ0aW5nfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBiZy1hbWJlci02MDAvMjAgYm9yZGVyIGJvcmRlci1hbWJlci01MDAvNDAgaG92ZXI6YmctYW1iZXItNTAwIGhvdmVyOnRleHQtYmxhY2sgZGlzYWJsZWQ6b3BhY2l0eS01MCB0ZXh0LWFtYmVyLTMwMCBweS0yLjUgcHgtNCByb3VuZGVkLXhsIHRleHQteHMgZm9udC1ib2xkIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7aXNDb252ZXJ0aW5nID8gKFxuICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICA8TG9hZGVyMiBjbGFzc05hbWU9XCJ3LTQgaC00IGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj5cbiAgICAgICAgICAgICAgICAgICAge2NvbnZlcnNpb25Qcm9ncmVzcyBcbiAgICAgICAgICAgICAgICAgICAgICA/IGDlpInmj5vjg7vlkIjmtYHkuK0gKCR7Y29udmVyc2lvblByb2dyZXNzLmN1cnJlbnR9LyR7Y29udmVyc2lvblByb2dyZXNzLnRvdGFsfSlgIFxuICAgICAgICAgICAgICAgICAgICAgIDogXCLjg5Hjg7zjgrnjg7vlpInmj5vkuK0uLi5cIn1cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgPEZpbGVBdWRpbyBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPuS7luOCouODl+ODqlpJUOOCkumBuOaKnuOBl+OBpuWQiOa1gTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJmaWxlXCJcbiAgICAgICAgICAgICAgcmVmPXtleHRlcm5hbEZpbGVJbnB1dFJlZn1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZUV4dGVybmFsSW1wb3J0fVxuICAgICAgICAgICAgICBhY2NlcHQ9XCIuemlwXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICB7LyogSWYgY29udmVydGVkIHN1Y2Nlc3NmdWxseSwgcHJvbXB0IHRvIGRvd25sb2FkIHRoZSBjb21wbGlhbnQgemlwIHZlcnNpb24gKi99XG4gICAgICAgICAge2NvbnZlcnRlZFppcEJsb2IgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXItdCBib3JkZXItd2hpdGUvMTAgcHQtNCBmbGV4IGZsZXgtY29sIHNtOmZsZXgtcm93IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQgYW5pbWF0ZS1mYWRlLWluXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1lbWVyYWxkLTQwMCBmb250LW1lZGl1bVwiPlxuICAgICAgICAgICAgICAgIPCfjokgU291bmRCb3jopo/moLzjgavlpInmj5vjgZXjgozjgZ/jgIHmlrDjgZfjgYTpganlkIjjg5Djg4Pjgq/jgqLjg4Pjg5fjg5XjgqHjgqTjg6vjgYznlJ/miJDjgZXjgozjgb7jgZfjgZ/vvIFcbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVEb3dubG9hZENvbnZlcnRlZH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBiZy1bI0ZGNUYxRl0gaG92ZXI6YmctYW1iZXItNTAwIHRleHQtYmxhY2sgcHktMiBweC0zLjUgcm91bmRlZC1sZyB0ZXh0LXhzIGZvbnQtYm9sZCB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIHNoYWRvdy1sZyBzaGFkb3ctWyNGRjVGMUZdLzE1XCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxEb3dubG9hZCBjbGFzc05hbWU9XCJ3LTMuNSBoLTMuNVwiIC8+XG4gICAgICAgICAgICAgICAgPHNwYW4+5aSJ5o+b5b6M44GuWklQ44KS5L+d5a2Y77yI5o6o5aWo77yJPC9zcGFuPlxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYm9yZGVyLXQgYm9yZGVyLXdoaXRlLzE1IHB0LTQgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTQwMCBmb250LW1vbm9cIj5cbiAgICAgICAgICDlhajjg4fjg7zjgr/jgpLjg5bjg6njgqbjgrbjgq3jg6Pjg4Pjgrfjg6XjgYvjgonjgq/jg6rjgqJcbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTaG93Q2xlYXJDb25maXJtKHRydWUpfVxuICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtcm9zZS00MDAgaG92ZXI6dGV4dC1yb3NlLTMwMCB0ZXh0LXhzIHB5LTIgcHgtMyBob3ZlcjpiZy1yb3NlLTUwMC8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24gZm9udC1tZWRpdW0gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICA+XG4gICAgICAgICAgPFRyYXNoMiBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICDjg4fjg7zjgr/jgpLlhajmtojljrtcbiAgICAgICAgPC9idXR0b24+XG4gICAgICA8L2Rpdj5cblxuICAgICAgey8qIENsZWFyIENvbmZpcm1hdGlvbiBNb2RhbCAqL31cbiAgICAgIHtzaG93Q2xlYXJDb25maXJtICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIGJnLWJsYWNrLzgwIGJhY2tkcm9wLWJsdXItbWQgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgei01MCBwLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLVsjMDUwNTA1XSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIG1heC13LXNtIHctZnVsbCByb3VuZGVkLTN4bCBwLTYgc3BhY2UteS00IHNoYWRvdy0yeGxcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgdGV4dC1yb3NlLTQwMFwiPlxuICAgICAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBjbGFzc05hbWU9XCJ3LTYgaC02IGZsZXgtc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+44OH44O844K/44KS5YWo5raI5Y6744GX44G+44GZ44GL77yfPC9oND5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBsZWFkaW5nLXJlbGF4ZWQgZm9udC1zYW5zXCI+XG4gICAgICAgICAgICAgIOS/neWtmOOBl+OBn+OBmeOBueOBpuOBrumfs+alve+8iE00QeODleOCoeOCpOODq++8ieOBjOODluODqeOCpuOCtuOBi+OCieWJiumZpOOBleOCjOOBvuOBmeOAguOBk+OBruaTjeS9nOOBr+WPluOCiua2iOOBm+OBvuOBm+OCk+OAglxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktZW5kIGdhcC0zIHB0LTIgZm9udC1tb25vIHRleHQteHNcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNob3dDbGVhckNvbmZpcm0oZmFsc2UpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInB4LTQgcHktMiBiZy13aGl0ZS81IGhvdmVyOmJnLXdoaXRlLzE1IHRleHQtc2xhdGUtMzAwIHJvdW5kZWQtbGcgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlclwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDjgq3jg6Pjg7Pjgrvjg6tcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVDbGVhckFsbH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJweC00IHB5LTIgYmctcm9zZS02MDAgaG92ZXI6Ymctcm9zZS01MDAgdGV4dC13aGl0ZSByb3VuZGVkLWxnIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAg5raI5Y6744GZ44KLXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKX1cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJtYXBwaW5ncyI6IkFBc0pRLFNBK0JJLFVBL0JKO0FBdEpSLFNBQWdCLFVBQVUsY0FBYztBQUN4QyxTQUFTLFVBQVUsUUFBUSxRQUFRLGVBQWUsU0FBUyxXQUFXLGlCQUFpQjtBQUN2RixTQUFTLGNBQWMsY0FBYyw0QkFBNEI7QUFDakUsU0FBUyxzQkFBc0I7QUFNL0Isd0JBQXdCLGNBQWMsRUFBRSxVQUFVLEdBQXVCO0FBQ3ZFLFFBQU0sQ0FBQyxhQUFhLGNBQWMsSUFBSSxTQUFTLEtBQUs7QUFDcEQsUUFBTSxDQUFDLGdCQUFnQixpQkFBaUIsSUFBSSxTQUFpQixDQUFDO0FBQzlELFFBQU0sQ0FBQyxhQUFhLGNBQWMsSUFBSSxTQUFTLEtBQUs7QUFDcEQsUUFBTSxDQUFDLGNBQWMsZUFBZSxJ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