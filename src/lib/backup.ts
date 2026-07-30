import __vite__cjsImport0_jszip from "/node_modules/.vite/deps/jszip.js?v=17b4195c"; const JSZip = __vite__cjsImport0_jszip.__esModule ? __vite__cjsImport0_jszip.default : __vite__cjsImport0_jszip;
import { saveTrack, getTracks } from "/src/lib/db.ts";
import { detectMimeType } from "/src/lib/audioHelper.ts";
export async function exportBackup(onProgress) {
  const zip = new JSZip();
  const tracks = await getTracks();
  if (tracks.length === 0) {
    throw new Error("保存されている曲がありません。");
  }
  const metadataList = tracks.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    youtubeUrl: track.youtubeUrl,
    addedAt: track.addedAt,
    filename: `${track.id}.mp3`
  }));
  zip.file("metadata.json", JSON.stringify(metadataList, null, 2));
  for (const track of tracks) {
    if (track.blob) {
      zip.file(`${track.id}.mp3`, track.blob);
    }
  }
  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "STORE",
      mimeType: "application/zip"
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );
  return zipBlob;
}
export async function importBackup(zipBlob) {
  const zip = await JSZip.loadAsync(zipBlob);
  let metadataFile = zip.file("metadata.json");
  if (!metadataFile) {
    const jsonFiles = Object.keys(zip.files).filter((name) => name.endsWith(".json"));
    if (jsonFiles.length > 0) {
      metadataFile = zip.file(jsonFiles[0]);
    }
  }
  if (!metadataFile) {
    throw new Error("Invalid backup: JSON metadata file is missing.");
  }
  const metadataText = await metadataFile.async("string");
  const parsed = JSON.parse(metadataText);
  let metadataList = [];
  const mapItem = (t) => {
    let genre = "邦楽";
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
      genre,
      youtubeUrl: t.youtubeUrl || "",
      addedAt: t.addedAt || Date.now(),
      filename: t.filename || t.fileName || ""
    };
  };
  if (Array.isArray(parsed)) {
    metadataList = parsed.map(mapItem);
  } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.tracks)) {
    metadataList = parsed.tracks.map(mapItem);
  } else if (parsed && typeof parsed === "object") {
    const possibleArray = Object.values(parsed).find((val) => Array.isArray(val));
    if (possibleArray) {
      metadataList = possibleArray.map(mapItem);
    } else {
      throw new Error("Unknown metadata schema in JSON file.");
    }
  } else {
    throw new Error("Unknown metadata schema in JSON file.");
  }
  let successCount = 0;
  for (const item of metadataList) {
    if (!item.filename) continue;
    let fileInZip = zip.file(item.filename);
    if (!fileInZip) {
      const baseName = item.filename.split("/").pop() || item.filename;
      fileInZip = Object.values(zip.files).find((f) => f.name.endsWith(baseName)) || null;
    }
    if (fileInZip) {
      const fileBlob = await fileInZip.async("blob");
      const detectedType = await detectMimeType(fileBlob);
      const sanitizedBlob = new Blob([fileBlob], { type: detectedType });
      const track = {
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
export async function importExternalBackup(zipBlob, onProgress) {
  const zip = await JSZip.loadAsync(zipBlob);
  const jsonFiles = Object.keys(zip.files).filter((name) => name.endsWith(".json"));
  if (jsonFiles.length === 0) {
    throw new Error("ZIPファイル内にJSONメタデータ（.json）が見つかりませんでした。");
  }
  const metadataText = await zip.file(jsonFiles[0]).async("string");
  const parsed = JSON.parse(metadataText);
  let externalList = [];
  if (Array.isArray(parsed)) {
    externalList = parsed;
  } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.tracks)) {
    externalList = parsed.tracks;
  } else if (parsed && typeof parsed === "object") {
    const possibleArray = Object.values(parsed).find((val) => Array.isArray(val));
    if (possibleArray) {
      externalList = possibleArray;
    } else {
      throw new Error("JSONデータのトラック配列を認識できませんでした。");
    }
  } else {
    throw new Error("JSONデータの構造をパースできませんでした。");
  }
  let successCount = 0;
  const convertedZip = new JSZip();
  const convertedMetadataList = [];
  for (let i = 0; i < externalList.length; i++) {
    const item = externalList[i];
    const itemFileName = item.fileName || item.filename || "";
    if (!itemFileName) continue;
    let fileInZip = zip.file(itemFileName);
    if (!fileInZip) {
      const baseName = itemFileName.split("/").pop() || itemFileName;
      fileInZip = Object.values(zip.files).find((f) => f.name.endsWith(baseName)) || null;
    }
    if (fileInZip) {
      try {
        const fileBlob = await fileInZip.async("blob");
        const detectedType = await detectMimeType(fileBlob);
        const sanitizedBlob = new Blob([fileBlob], { type: detectedType });
        const trackId = item.id || `track_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
        const trackTitle = item.name || item.title || "名称未設定";
        const trackArtist = item.artist || "Suno AI";
        let trackGenre = "邦楽";
        const cat = (item.category || item.genre || "").toLowerCase();
        if (cat === "western" || cat === "western" || cat === "洋楽") {
          trackGenre = "洋楽";
        }
        const trackAddedAt = item.addedAt || Date.now();
        const track = {
          id: trackId,
          title: trackTitle,
          artist: trackArtist,
          genre: trackGenre,
          youtubeUrl: item.youtubeUrl || "",
          addedAt: trackAddedAt,
          blob: sanitizedBlob
        };
        await saveTrack(track);
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
  convertedZip.file("metadata.json", JSON.stringify(convertedMetadataList, null, 2));
  const convertedZipBlob = await convertedZip.generateAsync({
    type: "blob",
    compression: "STORE",
    mimeType: "application/zip"
  });
  return {
    successCount,
    totalCount: externalList.length,
    convertedZipBlob
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJhY2t1cC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgSlNaaXAgZnJvbSBcImpzemlwXCI7XG5pbXBvcnQgeyBUcmFjayB9IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgc2F2ZVRyYWNrLCBnZXRUcmFja3MgfSBmcm9tIFwiLi9kYlwiO1xuaW1wb3J0IHsgZGV0ZWN0TWltZVR5cGUgfSBmcm9tIFwiLi9hdWRpb0hlbHBlclwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhwb3J0QmFja3VwKG9uUHJvZ3Jlc3M/OiAocGVyY2VudDogbnVtYmVyKSA9PiB2b2lkKTogUHJvbWlzZTxCbG9iPiB7XG4gIGNvbnN0IHppcCA9IG5ldyBKU1ppcCgpO1xuICBjb25zdCB0cmFja3MgPSBhd2FpdCBnZXRUcmFja3MoKTtcblxuICBpZiAodHJhY2tzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIuS/neWtmOOBleOCjOOBpuOBhOOCi+absuOBjOOBguOCiuOBvuOBm+OCk+OAglwiKTtcbiAgfVxuXG4gIGNvbnN0IG1ldGFkYXRhTGlzdCA9IHRyYWNrcy5tYXAodHJhY2sgPT4gKHtcbiAgICBpZDogdHJhY2suaWQsXG4gICAgdGl0bGU6IHRyYWNrLnRpdGxlLFxuICAgIGFydGlzdDogdHJhY2suYXJ0aXN0LFxuICAgIGdlbnJlOiB0cmFjay5nZW5yZSxcbiAgICB5b3V0dWJlVXJsOiB0cmFjay55b3V0dWJlVXJsLFxuICAgIGFkZGVkQXQ6IHRyYWNrLmFkZGVkQXQsXG4gICAgZmlsZW5hbWU6IGAke3RyYWNrLmlkfS5tcDNgXG4gIH0pKTtcblxuICAvLyBBZGQgbWV0YWRhdGEgSlNPTlxuICB6aXAuZmlsZShcIm1ldGFkYXRhLmpzb25cIiwgSlNPTi5zdHJpbmdpZnkobWV0YWRhdGFMaXN0LCBudWxsLCAyKSk7XG5cbiAgLy8gQWRkIGVhY2ggYXVkaW8gZmlsZVxuICBmb3IgKGNvbnN0IHRyYWNrIG9mIHRyYWNrcykge1xuICAgIGlmICh0cmFjay5ibG9iKSB7XG4gICAgICB6aXAuZmlsZShgJHt0cmFjay5pZH0ubXAzYCwgdHJhY2suYmxvYik7XG4gICAgfVxuICB9XG5cbiAgLy8gR2VuZXJhdGUgemlwIGFzIGEgYmxvYiB3aXRoIFNUT1JFIGNvbXByZXNzaW9uIChubyBjb21wcmVzc2lvbiBvdmVyaGVhZCBmb3IgYXVkaW8pIHRvIHByZXZlbnQgU2FmYXJpIG1lbW9yeSBjcmFzaGVzXG4gIGNvbnN0IHppcEJsb2IgPSBhd2FpdCB6aXAuZ2VuZXJhdGVBc3luYyhcbiAgICB7XG4gICAgICB0eXBlOiBcImJsb2JcIixcbiAgICAgIGNvbXByZXNzaW9uOiBcIlNUT1JFXCIsXG4gICAgICBtaW1lVHlwZTogXCJhcHBsaWNhdGlvbi96aXBcIixcbiAgICB9LFxuICAgIChtZXRhZGF0YSkgPT4ge1xuICAgICAgaWYgKG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgb25Qcm9ncmVzcyhNYXRoLnJvdW5kKG1ldGFkYXRhLnBlcmNlbnQpKTtcbiAgICAgIH1cbiAgICB9XG4gICk7XG5cbiAgcmV0dXJuIHppcEJsb2I7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdG9yZVJlc3VsdCB7XG4gIHN1Y2Nlc3NDb3VudDogbnVtYmVyO1xuICB0b3RhbENvdW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbXBvcnRCYWNrdXAoemlwQmxvYjogQmxvYik6IFByb21pc2U8UmVzdG9yZVJlc3VsdD4ge1xuICBjb25zdCB6aXAgPSBhd2FpdCBKU1ppcC5sb2FkQXN5bmMoemlwQmxvYik7XG4gIFxuICAvLyBGaW5kIG1ldGFkYXRhLmpzb24gc3BlY2lmaWNhbGx5LCBvciBsb29rIGZvciBhbnkgZmlsZSBlbmRpbmcgaW4gLmpzb24gYXMgYmFja3VwXG4gIGxldCBtZXRhZGF0YUZpbGUgPSB6aXAuZmlsZShcIm1ldGFkYXRhLmpzb25cIik7XG4gIGlmICghbWV0YWRhdGFGaWxlKSB7XG4gICAgY29uc3QganNvbkZpbGVzID0gT2JqZWN0LmtleXMoemlwLmZpbGVzKS5maWx0ZXIobmFtZSA9PiBuYW1lLmVuZHNXaXRoKFwiLmpzb25cIikpO1xuICAgIGlmIChqc29uRmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgbWV0YWRhdGFGaWxlID0gemlwLmZpbGUoanNvbkZpbGVzWzBdKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIW1ldGFkYXRhRmlsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgYmFja3VwOiBKU09OIG1ldGFkYXRhIGZpbGUgaXMgbWlzc2luZy5cIik7XG4gIH1cblxuICBjb25zdCBtZXRhZGF0YVRleHQgPSBhd2FpdCBtZXRhZGF0YUZpbGUuYXN5bmMoXCJzdHJpbmdcIik7XG4gIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobWV0YWRhdGFUZXh0KTtcblxuICBsZXQgbWV0YWRhdGFMaXN0OiBBcnJheTx7XG4gICAgaWQ6IHN0cmluZztcbiAgICB0aXRsZTogc3RyaW5nO1xuICAgIGFydGlzdD86IHN0cmluZztcbiAgICBnZW5yZT86IFwi6YKm5qW9XCIgfCBcIua0i+alvVwiO1xuICAgIHlvdXR1YmVVcmw/OiBzdHJpbmc7XG4gICAgYWRkZWRBdDogbnVtYmVyO1xuICAgIGZpbGVuYW1lOiBzdHJpbmc7XG4gIH0+ID0gW107XG5cbiAgY29uc3QgbWFwSXRlbSA9ICh0OiBhbnkpID0+IHtcbiAgICBsZXQgZ2VucmU6IFwi6YKm5qW9XCIgfCBcIua0i+alvVwiID0gXCLpgqbmpb1cIjtcbiAgICBjb25zdCBjYXQgPSAodC5jYXRlZ29yeSB8fCB0LmdlbnJlIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKGNhdCA9PT0gXCJ3ZXN0ZXJuXCIgfHwgY2F0ID09PSBcIndlc3Rlcm5cIiB8fCBjYXQgPT09IFwid2VzdGVyblwiIHx8IGNhdCA9PT0gXCLmtIvmpb1cIikge1xuICAgICAgZ2VucmUgPSBcIua0i+alvVwiO1xuICAgIH0gZWxzZSBpZiAoY2F0ID09PSBcImphcGFuZXNlXCIgfHwgY2F0ID09PSBcImphcGFuZXNlXCIgfHwgY2F0ID09PSBcIumCpualvVwiKSB7XG4gICAgICBnZW5yZSA9IFwi6YKm5qW9XCI7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpZDogdC5pZCB8fCBgdHJhY2tfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA1KX1gLFxuICAgICAgdGl0bGU6IHQudGl0bGUgfHwgdC5uYW1lIHx8IFwi5ZCN56ew5pyq6Kit5a6aXCIsXG4gICAgICBhcnRpc3Q6IHQuYXJ0aXN0IHx8IFwiU3VubyBBSVwiLFxuICAgICAgZ2VucmU6IGdlbnJlLFxuICAgICAgeW91dHViZVVybDogdC55b3V0dWJlVXJsIHx8IFwiXCIsXG4gICAgICBhZGRlZEF0OiB0LmFkZGVkQXQgfHwgRGF0ZS5ub3coKSxcbiAgICAgIGZpbGVuYW1lOiB0LmZpbGVuYW1lIHx8IHQuZmlsZU5hbWUgfHwgXCJcIlxuICAgIH07XG4gIH07XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkocGFyc2VkKSkge1xuICAgIC8vIFN0YW5kYXJkIGRpcmVjdC1hcnJheSBmb3JtYXRcbiAgICBtZXRhZGF0YUxpc3QgPSBwYXJzZWQubWFwKG1hcEl0ZW0pO1xuICB9IGVsc2UgaWYgKHBhcnNlZCAmJiB0eXBlb2YgcGFyc2VkID09PSBcIm9iamVjdFwiICYmIEFycmF5LmlzQXJyYXkocGFyc2VkLnRyYWNrcykpIHtcbiAgICAvLyBOZXcgdmVyc2lvbmVkIHRyYWNrcyBvYmplY3QgZm9ybWF0XG4gICAgbWV0YWRhdGFMaXN0ID0gcGFyc2VkLnRyYWNrcy5tYXAobWFwSXRlbSk7XG4gIH0gZWxzZSBpZiAocGFyc2VkICYmIHR5cGVvZiBwYXJzZWQgPT09IFwib2JqZWN0XCIpIHtcbiAgICAvLyBGYWxsYmFjayBzZWFyY2ggZm9yIGFueSBhcnJheSBwcm9wZXJ0eSBpbiB0aGUgcm9vdCBvYmplY3RcbiAgICBjb25zdCBwb3NzaWJsZUFycmF5ID0gT2JqZWN0LnZhbHVlcyhwYXJzZWQpLmZpbmQodmFsID0+IEFycmF5LmlzQXJyYXkodmFsKSk7XG4gICAgaWYgKHBvc3NpYmxlQXJyYXkpIHtcbiAgICAgIG1ldGFkYXRhTGlzdCA9IChwb3NzaWJsZUFycmF5IGFzIGFueVtdKS5tYXAobWFwSXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gbWV0YWRhdGEgc2NoZW1hIGluIEpTT04gZmlsZS5cIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gbWV0YWRhdGEgc2NoZW1hIGluIEpTT04gZmlsZS5cIik7XG4gIH1cblxuICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcblxuICBmb3IgKGNvbnN0IGl0ZW0gb2YgbWV0YWRhdGFMaXN0KSB7XG4gICAgaWYgKCFpdGVtLmZpbGVuYW1lKSBjb250aW51ZTtcbiAgICBcbiAgICAvLyBSb2J1c3RseSBsb29rIHVwIGZpbGUgYnkgZGlyZWN0IG5hbWUgb3IgZmlsZW5hbWUgd2l0aG91dCBkaXJlY3Rvcmllc1xuICAgIGxldCBmaWxlSW5aaXAgPSB6aXAuZmlsZShpdGVtLmZpbGVuYW1lKTtcbiAgICBpZiAoIWZpbGVJblppcCkge1xuICAgICAgY29uc3QgYmFzZU5hbWUgPSBpdGVtLmZpbGVuYW1lLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBpdGVtLmZpbGVuYW1lO1xuICAgICAgZmlsZUluWmlwID0gT2JqZWN0LnZhbHVlcyh6aXAuZmlsZXMpLmZpbmQoZiA9PiBmLm5hbWUuZW5kc1dpdGgoYmFzZU5hbWUpKSB8fCBudWxsO1xuICAgIH1cblxuICAgIGlmIChmaWxlSW5aaXApIHtcbiAgICAgIGNvbnN0IGZpbGVCbG9iID0gYXdhaXQgZmlsZUluWmlwLmFzeW5jKFwiYmxvYlwiKTtcbiAgICAgIC8vIERldGVjdCBhbmQgdXNlIGNvcnJlY3QgTUlNRSB0eXBlIChjcnVjaWFsIGZvciAuYmluIGV4dGVuc2lvbnMgY29udGFpbmluZyByZWFsIGF1ZGlvKVxuICAgICAgY29uc3QgZGV0ZWN0ZWRUeXBlID0gYXdhaXQgZGV0ZWN0TWltZVR5cGUoZmlsZUJsb2IpO1xuICAgICAgY29uc3Qgc2FuaXRpemVkQmxvYiA9IG5ldyBCbG9iKFtmaWxlQmxvYl0sIHsgdHlwZTogZGV0ZWN0ZWRUeXBlIH0pO1xuICAgICAgXG4gICAgICBjb25zdCB0cmFjazogVHJhY2sgPSB7XG4gICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICB0aXRsZTogaXRlbS50aXRsZSxcbiAgICAgICAgYXJ0aXN0OiBpdGVtLmFydGlzdCxcbiAgICAgICAgZ2VucmU6IGl0ZW0uZ2VucmUgfHwgXCLpgqbmpb1cIixcbiAgICAgICAgeW91dHViZVVybDogaXRlbS55b3V0dWJlVXJsLFxuICAgICAgICBhZGRlZEF0OiBpdGVtLmFkZGVkQXQgfHwgRGF0ZS5ub3coKSxcbiAgICAgICAgYmxvYjogc2FuaXRpemVkQmxvYlxuICAgICAgfTtcbiAgICAgIGF3YWl0IHNhdmVUcmFjayh0cmFjayk7XG4gICAgICBzdWNjZXNzQ291bnQrKztcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1Y2Nlc3NDb3VudCxcbiAgICB0b3RhbENvdW50OiBtZXRhZGF0YUxpc3QubGVuZ3RoXG4gIH07XG59XG5cbi8vIERlZGljYXRlZCBmdW5jdGlvbiBmb3IgaW1wb3J0aW5nL2NvbnZlcnRpbmcgZXh0ZXJuYWwgYmFja3VwcyB3aXRoIC5iaW4gZmlsZXNcbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZXJuYWxJbXBvcnRSZXN1bHQge1xuICBzdWNjZXNzQ291bnQ6IG51bWJlcjtcbiAgdG90YWxDb3VudDogbnVtYmVyO1xuICBjb252ZXJ0ZWRaaXBCbG9iOiBCbG9iO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0RXh0ZXJuYWxCYWNrdXAoXG4gIHppcEJsb2I6IEJsb2IsXG4gIG9uUHJvZ3Jlc3M/OiAoY3VycmVudDogbnVtYmVyLCB0b3RhbDogbnVtYmVyKSA9PiB2b2lkXG4pOiBQcm9taXNlPEV4dGVybmFsSW1wb3J0UmVzdWx0PiB7XG4gIGNvbnN0IHppcCA9IGF3YWl0IEpTWmlwLmxvYWRBc3luYyh6aXBCbG9iKTtcbiAgXG4gIC8vIEZpbmQgYW55IEpTT04gZmlsZSBpbiB0aGUgemlwXG4gIGNvbnN0IGpzb25GaWxlcyA9IE9iamVjdC5rZXlzKHppcC5maWxlcykuZmlsdGVyKG5hbWUgPT4gbmFtZS5lbmRzV2l0aChcIi5qc29uXCIpKTtcbiAgaWYgKGpzb25GaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJaSVDjg5XjgqHjgqTjg6vlhoXjgatKU09O44Oh44K/44OH44O844K/77yILmpzb27vvInjgYzopovjgaTjgYvjgorjgb7jgZvjgpPjgafjgZfjgZ/jgIJcIik7XG4gIH1cbiAgXG4gIC8vIFBhcnNlIHRoZSBmaXJzdCBKU09OIGZpbGUgZm91bmRcbiAgY29uc3QgbWV0YWRhdGFUZXh0ID0gYXdhaXQgemlwLmZpbGUoanNvbkZpbGVzWzBdKSEuYXN5bmMoXCJzdHJpbmdcIik7XG4gIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobWV0YWRhdGFUZXh0KTtcbiAgXG4gIGxldCBleHRlcm5hbExpc3Q6IGFueVtdID0gW107XG4gIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICBleHRlcm5hbExpc3QgPSBwYXJzZWQ7XG4gIH0gZWxzZSBpZiAocGFyc2VkICYmIHR5cGVvZiBwYXJzZWQgPT09IFwib2JqZWN0XCIgJiYgQXJyYXkuaXNBcnJheShwYXJzZWQudHJhY2tzKSkge1xuICAgIGV4dGVybmFsTGlzdCA9IHBhcnNlZC50cmFja3M7XG4gIH0gZWxzZSBpZiAocGFyc2VkICYmIHR5cGVvZiBwYXJzZWQgPT09IFwib2JqZWN0XCIpIHtcbiAgICBjb25zdCBwb3NzaWJsZUFycmF5ID0gT2JqZWN0LnZhbHVlcyhwYXJzZWQpLmZpbmQodmFsID0+IEFycmF5LmlzQXJyYXkodmFsKSk7XG4gICAgaWYgKHBvc3NpYmxlQXJyYXkpIHtcbiAgICAgIGV4dGVybmFsTGlzdCA9IHBvc3NpYmxlQXJyYXkgYXMgYW55W107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkpTT07jg4fjg7zjgr/jga7jg4jjg6njg4Pjgq/phY3liJfjgpLoqo3orZjjgafjgY3jgb7jgZvjgpPjgafjgZfjgZ/jgIJcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkpTT07jg4fjg7zjgr/jga7mp4vpgKDjgpLjg5Hjg7zjgrnjgafjgY3jgb7jgZvjgpPjgafjgZfjgZ/jgIJcIik7XG4gIH1cblxuICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcbiAgY29uc3QgY29udmVydGVkWmlwID0gbmV3IEpTWmlwKCk7XG4gIGNvbnN0IGNvbnZlcnRlZE1ldGFkYXRhTGlzdDogYW55W10gPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGV4dGVybmFsTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGl0ZW0gPSBleHRlcm5hbExpc3RbaV07XG4gICAgY29uc3QgaXRlbUZpbGVOYW1lID0gaXRlbS5maWxlTmFtZSB8fCBpdGVtLmZpbGVuYW1lIHx8IFwiXCI7XG4gICAgaWYgKCFpdGVtRmlsZU5hbWUpIGNvbnRpbnVlO1xuICAgIFxuICAgIC8vIEZpbmQgdGhlIGZpbGUgaW4gemlwIChyb2J1c3RseSwgbWF0Y2hpbmcgYnkgYmFzZW5hbWUpXG4gICAgbGV0IGZpbGVJblppcCA9IHppcC5maWxlKGl0ZW1GaWxlTmFtZSk7XG4gICAgaWYgKCFmaWxlSW5aaXApIHtcbiAgICAgIGNvbnN0IGJhc2VOYW1lID0gaXRlbUZpbGVOYW1lLnNwbGl0KFwiL1wiKS5wb3AoKSB8fCBpdGVtRmlsZU5hbWU7XG4gICAgICBmaWxlSW5aaXAgPSBPYmplY3QudmFsdWVzKHppcC5maWxlcykuZmluZChmID0+IGYubmFtZS5lbmRzV2l0aChiYXNlTmFtZSkpIHx8IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGZpbGVJblppcCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZmlsZUJsb2IgPSBhd2FpdCBmaWxlSW5aaXAuYXN5bmMoXCJibG9iXCIpO1xuICAgICAgICAvLyBJbnNwZWN0IHRoZSBiaW5hcnkgZGF0YSB0byBmaW5kIGl0cyB0cnVlIGF1ZGlvIG1pbWV0eXBlIChlLmcuLCBhdWRpby9hYWMsIGF1ZGlvL21wZWcpXG4gICAgICAgIGNvbnN0IGRldGVjdGVkVHlwZSA9IGF3YWl0IGRldGVjdE1pbWVUeXBlKGZpbGVCbG9iKTtcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkQmxvYiA9IG5ldyBCbG9iKFtmaWxlQmxvYl0sIHsgdHlwZTogZGV0ZWN0ZWRUeXBlIH0pO1xuXG4gICAgICAgIGNvbnN0IHRyYWNrSWQgPSBpdGVtLmlkIHx8IGB0cmFja18ke0RhdGUubm93KCl9XyR7aX1fJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgNCl9YDtcbiAgICAgICAgY29uc3QgdHJhY2tUaXRsZSA9IGl0ZW0ubmFtZSB8fCBpdGVtLnRpdGxlIHx8IFwi5ZCN56ew5pyq6Kit5a6aXCI7XG4gICAgICAgIGNvbnN0IHRyYWNrQXJ0aXN0ID0gaXRlbS5hcnRpc3QgfHwgXCJTdW5vIEFJXCI7XG4gICAgICAgIFxuICAgICAgICBsZXQgdHJhY2tHZW5yZTogXCLpgqbmpb1cIiB8IFwi5rSL5qW9XCIgPSBcIumCpualvVwiO1xuICAgICAgICBjb25zdCBjYXQgPSAoaXRlbS5jYXRlZ29yeSB8fCBpdGVtLmdlbnJlIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChjYXQgPT09IFwid2VzdGVyblwiIHx8IGNhdCA9PT0gXCJ3ZXN0ZXJuXCIgfHwgY2F0ID09PSBcIua0i+alvVwiKSB7XG4gICAgICAgICAgdHJhY2tHZW5yZSA9IFwi5rSL5qW9XCI7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0cmFja0FkZGVkQXQgPSBpdGVtLmFkZGVkQXQgfHwgRGF0ZS5ub3coKTtcblxuICAgICAgICAvLyAxLiBEaXJlY3RseSBzYXZlIHRvIFNvdW5kQm94IEluZGV4ZWREQiBkYXRhYmFzZVxuICAgICAgICBjb25zdCB0cmFjazogVHJhY2sgPSB7XG4gICAgICAgICAgaWQ6IHRyYWNrSWQsXG4gICAgICAgICAgdGl0bGU6IHRyYWNrVGl0bGUsXG4gICAgICAgICAgYXJ0aXN0OiB0cmFja0FydGlzdCxcbiAgICAgICAgICBnZW5yZTogdHJhY2tHZW5yZSxcbiAgICAgICAgICB5b3V0dWJlVXJsOiBpdGVtLnlvdXR1YmVVcmwgfHwgXCJcIixcbiAgICAgICAgICBhZGRlZEF0OiB0cmFja0FkZGVkQXQsXG4gICAgICAgICAgYmxvYjogc2FuaXRpemVkQmxvYlxuICAgICAgICB9O1xuICAgICAgICBhd2FpdCBzYXZlVHJhY2sodHJhY2spO1xuXG4gICAgICAgIC8vIDIuIEFkZCB0byB0aGUgU291bmRCb3gtY29tcGxpYW50IFpJUCBzdHJ1Y3R1cmUgKC5tcDMgZmlsZW5hbWUpXG4gICAgICAgIGNvbnZlcnRlZFppcC5maWxlKGAke3RyYWNrSWR9Lm1wM2AsIGZpbGVCbG9iKTtcbiAgICAgICAgY29udmVydGVkTWV0YWRhdGFMaXN0LnB1c2goe1xuICAgICAgICAgIGlkOiB0cmFja0lkLFxuICAgICAgICAgIHRpdGxlOiB0cmFja1RpdGxlLFxuICAgICAgICAgIGFydGlzdDogdHJhY2tBcnRpc3QsXG4gICAgICAgICAgZ2VucmU6IHRyYWNrR2VucmUsXG4gICAgICAgICAgeW91dHViZVVybDogaXRlbS55b3V0dWJlVXJsIHx8IFwiXCIsXG4gICAgICAgICAgYWRkZWRBdDogdHJhY2tBZGRlZEF0LFxuICAgICAgICAgIGZpbGVuYW1lOiBgJHt0cmFja0lkfS5tcDNgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN1Y2Nlc3NDb3VudCsrO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBwcm9jZXNzIGV4dGVybmFsIGZpbGUgXCIke2l0ZW1GaWxlTmFtZX1cIjpgLCBlcnIpO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAob25Qcm9ncmVzcykge1xuICAgICAgb25Qcm9ncmVzcyhpICsgMSwgZXh0ZXJuYWxMaXN0Lmxlbmd0aCk7XG4gICAgfVxuICB9XG5cbiAgLy8gR2VuZXJhdGUgY29tcGxpYW5jZSBtZXRhZGF0YSBpbnNpZGUgdGhlIGNvbnZlcnRlZCB6aXBcbiAgY29udmVydGVkWmlwLmZpbGUoXCJtZXRhZGF0YS5qc29uXCIsIEpTT04uc3RyaW5naWZ5KGNvbnZlcnRlZE1ldGFkYXRhTGlzdCwgbnVsbCwgMikpO1xuICBjb25zdCBjb252ZXJ0ZWRaaXBCbG9iID0gYXdhaXQgY29udmVydGVkWmlwLmdlbmVyYXRlQXN5bmMoe1xuICAgIHR5cGU6IFwiYmxvYlwiLFxuICAgIGNvbXByZXNzaW9uOiBcIlNUT1JFXCIsXG4gICAgbWltZVR5cGU6IFwiYXBwbGljYXRpb24vemlwXCIsXG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc3VjY2Vzc0NvdW50LFxuICAgIHRvdGFsQ291bnQ6IGV4dGVybmFsTGlzdC5sZW5ndGgsXG4gICAgY29udmVydGVkWmlwQmxvYlxuICB9O1xufVxuIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFdBQVc7QUFFbEIsU0FBUyxXQUFXLGlCQUFpQjtBQUNyQyxTQUFTLHNCQUFzQjtBQUUvQixzQkFBc0IsYUFBYSxZQUF1RDtBQUN4RixRQUFNLE1BQU0sSUFBSSxNQUFNO0FBQ3RCLFFBQU0sU0FBUyxNQUFNLFVBQVU7QUFFL0IsTUFBSSxPQUFPLFdBQVcsR0FBRztBQUN2QixVQUFNLElBQUksTUFBTSxpQkFBaUI7QUFBQSxFQUNuQztBQUVBLFFBQU0sZUFBZSxPQUFPLElBQUksWUFBVTtBQUFBLElBQ3hDLElBQUksTUFBTTtBQUFBLElBQ1YsT0FBTyxNQUFNO0FBQUEsSUFDYixRQUFRLE1BQU07QUFBQSxJQUNkLE9BQU8sTUFBTTtBQUFBLElBQ2IsWUFBWSxNQUFNO0FBQUEsSUFDbEIsU0FBUyxNQUFNO0FBQUEsSUFDZixVQUFVLEdBQUcsTUFBTSxF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