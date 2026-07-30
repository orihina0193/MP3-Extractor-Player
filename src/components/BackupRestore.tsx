import React, { useState, useRef } from "react";
import { Download, Upload, Trash2, AlertTriangle, Loader2, RefreshCw, FileAudio } from "lucide-react";
import { exportBackup, importBackup, importExternalBackup } from "../lib/backup";
import { clearAllTracks } from "../lib/db";

interface BackupRestoreProps {
  onRefresh: () => void;
}

export default function BackupRestore({ onRefresh }: BackupRestoreProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedZipBlob, setConvertedZipBlob] = useState<Blob | null>(null);
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalFileInputRef = useRef<HTMLInputElement>(null);

  const showMsg = (text: string, type: "success" | "error" | "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 8000); // Give a bit more time to read long success/info messages
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      const blob = await exportBackup((percent) => {
        setExportProgress(percent);
      });

      const fileName = `m4a_audio_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      const file = new File([blob], fileName, { type: "application/zip" });

      // iOS Safari等のWeb Contentプロセスのメモリ上限によるクラッシュを防ぐため、
      // 共有機能(navigator.share)が使える場合はネイティブ共有ダイアログを開いて「ファイルに保存」させる
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "SoundBox バックアップ",
          text: "SoundBoxの音声バックアップデータです。"
        });
        showMsg("バックアップファイルを共有・保存しました！", "success");
      } else {
        // フォールバック: 従来型のダウンロードリンク発火
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        showMsg("バックアップをZIPファイルとして保存しました！", "success");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // ユーザーが共有シートをキャンセルした場合
        return;
      }
      console.error(err);
      showMsg("バックアップの作成に失敗しました: " + (err.message || "メモリ不足または通信エラー"), "error");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importBackup(file);
      showMsg(`復元完了: ${result.totalCount}個中 ${result.successCount}個のトラックを復元しました！`, "success");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showMsg("復元に失敗しました。ZIPファイルが正しいバックアップであることを確認してください。" + err.message, "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExternalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: any) {
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
    a.download = `soundbox_converted_backup_${new Date().toISOString().slice(0, 10)}.zip`;
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
    } catch (err: any) {
      console.error(err);
      showMsg("削除に失敗しました: " + err.message, "error");
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold text-[#FF5F1F] tracking-widest uppercase flex items-center gap-2">
          バックアップとデータ管理
        </h3>
        <p className="text-xs text-slate-400 font-mono">
          いつでもお使いの音楽データをZIPファイルでエクスポート・インポートできます。
        </p>
      </div>

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

      {/* Primary Backup and Restore */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || isImporting || isConverting}
          className="flex items-center justify-center gap-3 bg-[#FF5F1F] hover:bg-amber-500 disabled:opacity-50 text-black py-4 px-4 rounded-xl font-bold transition cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{exportProgress > 0 ? `ZIP作成中... ${exportProgress}%` : "データ集約中..."}</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>ZIPバックアップを保存</span>
            </>
          )}
        </button>

        {/* Import Button Trigger */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isExporting || isImporting || isConverting}
          className="flex items-center justify-center gap-3 bg-white hover:bg-[#FF5F1F] hover:text-black disabled:opacity-50 text-black py-4 px-4 rounded-xl font-bold transition cursor-pointer"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>復元中...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>ZIPから復元</span>
            </>
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".zip"
          className="hidden"
        />
      </div>

      {/* Advanced Bridge / External app import panel suggested by user */}
      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold text-amber-500 tracking-wider uppercase flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin-slow" />
            <span>他アプリ（.bin形式）ZIPの取り込み・規格変換</span>
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            別アプリで作成された、拡張子 <code className="font-mono bg-white/5 px-1 py-0.5 rounded text-amber-400">.bin</code> の音声とカスタムJSONが含まれるバックアップZIPを、SoundBoxに適合するフォーマット（.mp3 + 規格化メタデータ）へ変換し、<strong>同時にこのライブラリへ直接マージ（追加）</strong>します。
          </p>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-200">他アプリのバックアップZIPを取り込む</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">対応: "name", "fileName", .bin 拡張子</p>
            </div>
            
            <button
              onClick={() => externalFileInputRef.current?.click()}
              disabled={isExporting || isImporting || isConverting}
              className="flex items-center gap-2 bg-amber-600/20 border border-amber-500/40 hover:bg-amber-500 hover:text-black disabled:opacity-50 text-amber-300 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {conversionProgress 
                      ? `変換・合流中 (${conversionProgress.current}/${conversionProgress.total})` 
                      : "パース・変換中..."}
                  </span>
                </>
              ) : (
                <>
                  <FileAudio className="w-4 h-4" />
                  <span>他アプリZIPを選択して合流</span>
                </>
              )}
            </button>
            <input
              type="file"
              ref={externalFileInputRef}
              onChange={handleExternalImport}
              accept=".zip"
              className="hidden"
            />
          </div>

          {/* If converted successfully, prompt to download the compliant zip version */}
          {convertedZipBlob && (
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
              <div className="text-[11px] text-emerald-400 font-medium">
                🎉 SoundBox規格に変換された、新しい適合バックアップファイルが生成されました！
              </div>
              <button
                onClick={handleDownloadConverted}
                className="flex items-center gap-2 bg-[#FF5F1F] hover:bg-amber-500 text-black py-2 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-lg shadow-[#FF5F1F]/15"
              >
                <Download className="w-3.5 h-3.5" />
                <span>変換後のZIPを保存（推奨）</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/15 pt-4 flex justify-between items-center">
        <div className="text-xs text-slate-400 font-mono">
          全データをブラウザキャッシュからクリア
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-2 text-rose-400 hover:text-rose-300 text-xs py-2 px-3 hover:bg-rose-500/10 rounded-lg transition font-medium cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          データを全消去
        </button>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#050505] border border-white/10 max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h4 className="text-sm font-bold uppercase tracking-wider">データを全消去しますか？</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              保存したすべての音楽（M4Aファイル）がブラウザから削除されます。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3 pt-2 font-mono text-xs">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/15 text-slate-300 rounded-lg transition cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer"
              >
                消去する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
