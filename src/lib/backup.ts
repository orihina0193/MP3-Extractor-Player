import JSZip from "jszip";
import { Track } from "../types";
import { saveTrack, getTracks } from "./db";
import { detectMimeType } from "./audioHelper";

export async function exportBackup(onProgress?: (percent: number) => void): Promise<Blob> {
  const zip = new JSZip();
  const tracks = await getTracks();

  if (tracks.length === 0) {
    throw new Error("保存されている曲がありません。");
  }

  const metadataList = tracks.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    youtubeUrl: track.youtubeUrl,
    addedAt: track.addedAt,
    filename: `${track.id}.mp3`
  }));

  // Add metadata JSON
  zip.file("metadata.json", JSON.stringify(metadataList, null, 2));

  // Add each audio file
  for (const track of tracks) {
    if (track.blob) {
      zip.file(`${track.id}.mp3`, track.blob);
    }
  }

  // Generate zip as a blob with STORE compression (no compression overhead for audio) to prevent Safari memory crashes
  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "STORE",
      mimeType: "application/zip",
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  return zipBlob;
}

export interface RestoreResult {
  successCount: number;
  totalCount: number;
}

export async function importBackup(zipBlob: Blob): Promise<RestoreResult> {
  const zip = await JSZip.loadAsync(zipBlob);
  
  // Find metadata.json specifically, or look for any file ending in .json as backup
  let metadataFile = zip.file("metadata.json");
  if (!metadataFile) {
    const jsonFiles = Object.keys(zip.files).filter(name => name.endsWith(".json"));
    if (jsonFiles.length > 0) {
      metadataFile = zip.file(jsonFiles[0]);
    }
  }

  if (!metadataFile) {
    throw new Error("Invalid backup: JSON metadata file is missing.");
  }

  const metadataText = await metadataFile.async("string");
  const parsed = JSON.parse(metadataText);

  let metadataList: Array<{
    id: string;
    title: string;
    artist?: string;
    genre?: "邦楽" | "洋楽";
    youtubeUrl?: string;
    addedAt: number;
    filename: string;
  }> = [];

  const mapItem = (t: any) => {
    let genre: "邦楽" | "洋楽" = "邦楽";
    const cat = (t.category || t.genre || "").toLowerCase();
    if (cat === "western" || cat === "western" || cat === "western" || cat === "洋楽") {
      genre = "洋楽";
    } else if (cat === "japanese" || cat === "japanese" || cat === "邦楽") {
      genre = "邦楽";
    }
    return {
      id: t.id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: t.title || t.name || "名称未設定",
      artist: t.artist || "Suno AI",
      genre: genre,
      youtubeUrl: t.youtubeUrl || "",
      addedAt: t.addedAt || Date.now(),
      filename: t.filename || t.fileName || ""
    };
  };

  if (Array.isArray(parsed)) {
    // Standard direct-array format
    metadataList = parsed.map(mapItem);
  } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.tracks)) {
    // New versioned tracks object format
    metadataList = parsed.tracks.map(mapItem);
  } else if (parsed && typeof parsed === "object") {
    // Fallback search for any array property in the root object
    const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
    if (possibleArray) {
      metadataList = (possibleArray as any[]).map(mapItem);
    } else {
      throw new Error("Unknown metadata schema in JSON file.");
    }
  } else {
    throw new Error("Unknown metadata schema in JSON file.");
  }

  let successCount = 0;

  for (const item of metadataList) {
    if (!item.filename) continue;
    
    // Robustly look up file by direct name or filename without directories
    let fileInZip = zip.file(item.filename);
    if (!fileInZip) {
      const baseName = item.filename.split("/").pop() || item.filename;
      fileInZip = Object.values(zip.files).find(f => f.name.endsWith(baseName)) || null;
    }

    if (fileInZip) {
      const fileBlob = await fileInZip.async("blob");
      // Detect and use correct MIME type (crucial for .bin extensions containing real audio)
      const detectedType = await detectMimeType(fileBlob);
      const sanitizedBlob = new Blob([fileBlob], { type: detectedType });
      
      const track: Track = {
        id: item.id,
        title: item.title,
        artist: item.artist,
        genre: item.genre || "邦楽",
        youtubeUrl: item.youtubeUrl,
        addedAt: item.addedAt || Date.now(),
        blob: sanitizedBlob
      };
      await saveTrack(track);
      successCount++;
    }
  }

  return {
    successCount,
    totalCount: metadataList.length
  };
}

// Dedicated function for importing/converting external backups with .bin files
export interface ExternalImportResult {
  successCount: number;
  totalCount: number;
  convertedZipBlob: Blob;
}

export async function importExternalBackup(
  zipBlob: Blob,
  onProgress?: (current: number, total: number) => void
): Promise<ExternalImportResult> {
  const zip = await JSZip.loadAsync(zipBlob);
  
  // Find any JSON file in the zip
  const jsonFiles = Object.keys(zip.files).filter(name => name.endsWith(".json"));
  if (jsonFiles.length === 0) {
    throw new Error("ZIPファイル内にJSONメタデータ（.json）が見つかりませんでした。");
  }
  
  // Parse the first JSON file found
  const metadataText = await zip.file(jsonFiles[0])!.async("string");
  const parsed = JSON.parse(metadataText);
  
  let externalList: any[] = [];
  if (Array.isArray(parsed)) {
    externalList = parsed;
  } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.tracks)) {
    externalList = parsed.tracks;
  } else if (parsed && typeof parsed === "object") {
    const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
    if (possibleArray) {
      externalList = possibleArray as any[];
    } else {
      throw new Error("JSONデータのトラック配列を認識できませんでした。");
    }
  } else {
    throw new Error("JSONデータの構造をパースできませんでした。");
  }

  let successCount = 0;
  const convertedZip = new JSZip();
  const convertedMetadataList: any[] = [];

  for (let i = 0; i < externalList.length; i++) {
    const item = externalList[i];
    const itemFileName = item.fileName || item.filename || "";
    if (!itemFileName) continue;
    
    // Find the file in zip (robustly, matching by basename)
    let fileInZip = zip.file(itemFileName);
    if (!fileInZip) {
      const baseName = itemFileName.split("/").pop() || itemFileName;
      fileInZip = Object.values(zip.files).find(f => f.name.endsWith(baseName)) || null;
    }

    if (fileInZip) {
      try {
        const fileBlob = await fileInZip.async("blob");
        // Inspect the binary data to find its true audio mimetype (e.g., audio/aac, audio/mpeg)
        const detectedType = await detectMimeType(fileBlob);
        const sanitizedBlob = new Blob([fileBlob], { type: detectedType });

        const trackId = item.id || `track_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
        const trackTitle = item.name || item.title || "名称未設定";
        const trackArtist = item.artist || "Suno AI";
        
        let trackGenre: "邦楽" | "洋楽" = "邦楽";
        const cat = (item.category || item.genre || "").toLowerCase();
        if (cat === "western" || cat === "western" || cat === "洋楽") {
          trackGenre = "洋楽";
        }

        const trackAddedAt = item.addedAt || Date.now();

        // 1. Directly save to SoundBox IndexedDB database
        const track: Track = {
          id: trackId,
          title: trackTitle,
          artist: trackArtist,
          genre: trackGenre,
          youtubeUrl: item.youtubeUrl || "",
          addedAt: trackAddedAt,
          blob: sanitizedBlob
        };
        await saveTrack(track);

        // 2. Add to the SoundBox-compliant ZIP structure (.mp3 filename)
        convertedZip.file(`${trackId}.mp3`, fileBlob);
        convertedMetadataList.push({
          id: trackId,
          title: trackTitle,
          artist: trackArtist,
          genre: trackGenre,
          youtubeUrl: item.youtubeUrl || "",
          addedAt: trackAddedAt,
          filename: `${trackId}.mp3`
        });

        successCount++;
      } catch (err) {
        console.error(`Failed to process external file "${itemFileName}":`, err);
      }
    }
    
    if (onProgress) {
      onProgress(i + 1, externalList.length);
    }
  }

  // Generate compliance metadata inside the converted zip
  convertedZip.file("metadata.json", JSON.stringify(convertedMetadataList, null, 2));
  const convertedZipBlob = await convertedZip.generateAsync({
    type: "blob",
    compression: "STORE",
    mimeType: "application/zip",
  });

  return {
    successCount,
    totalCount: externalList.length,
    convertedZipBlob
  };
}
