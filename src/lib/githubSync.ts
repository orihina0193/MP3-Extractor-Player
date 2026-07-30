const GITHUB_CONFIG_KEY = "soundbox_github_config_v1";
export const DEFAULT_GITHUB_CONFIG = {
  pat: "",
  owner: "orihina0193",
  repo: "MP3-Extractor-Player",
  folder: "src",
  branch: "main",
  autoSync: false
};
export function getGitHubConfig() {
  try {
    const saved = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (saved) {
      return { ...DEFAULT_GITHUB_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to parse GitHub config from localStorage:", e);
  }
  return DEFAULT_GITHUB_CONFIG;
}
export function saveGitHubConfig(config) {
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save GitHub config to localStorage:", e);
  }
}
export function clearGitHubConfig() {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
}
export function isGitHubConfigured(config) {
  return Boolean(config.pat.trim() && config.owner.trim() && config.repo.trim());
}
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function cleanFolder(folder) {
  let cleaned = folder.trim().replace(/^\/+|\/+$/g, "");
  return cleaned || "audio";
}
export async function testGitHubConnection(config) {
  if (!isGitHubConfigured(config)) {
    return { success: false, message: "GitHub PAT、ユーザー名、リポジトリ名を入力してください。" };
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    if (response.status === 401) {
      return { success: false, message: "PAT（パーソナルアクセストークン）が無効か、期限切れです。" };
    } else if (response.status === 404) {
      return { success: false, message: "リポジトリが見つかりません。ユーザー名・リポジトリ名を確認してください。" };
    } else if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, message: err.message || `APIエラー: ${response.status}` };
    }
    const data = await response.json();
    return { success: true, message: `接続成功: ${data.full_name} (${data.private ? "Private" : "Public"})` };
  } catch (e) {
    return { success: false, message: "ネットワークエラー: " + (e.message || e) };
  }
}
async function getFileSha(config, filePath, targetRepo) {
  const repoName = targetRepo || config.repo;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${config.owner}/${repoName}/contents/${filePath}?ref=${config.branch}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat.trim()}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.sha || null;
    }
  } catch (_) {
  }
  return null;
}
export async function uploadTrackToGitHub(track, config, onProgress) {
  if (!isGitHubConfigured(config)) {
    throw new Error("GitHub設定が完了していません。設定画面でPATとリポジトリ情報を保存してください。");
  }
  const folder = cleanFolder(config.folder);
  const audioFilePath = `${folder}/${track.id}.m4a`;
  const metadataFilePath = `${folder}/${track.id}.json`;
  const indexFilePath = `${folder}/tracks.json`;
  onProgress?.("音声データをBase64エンコード中...");
  const base64Content = await blobToBase64(track.blob);
  onProgress?.(`GitHubへ音声ファイル (${track.id}.m4a) をアップロード中...`);
  const existingAudioSha = await getFileSha(config, audioFilePath);
  const audioPayload = {
    message: `Upload audio: ${track.title} (${track.id}) [SoundBox]`,
    content: base64Content,
    branch: config.branch || "main"
  };
  if (existingAudioSha) {
    audioPayload.sha = existingAudioSha;
  }
  const audioRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${audioFilePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json"
      },
      body: JSON.stringify(audioPayload)
    }
  );
  if (!audioRes.ok) {
    const err = await audioRes.json().catch(() => ({}));
    throw new Error(`音声ファイルのGitHubアップロードに失敗しました: ${err.message || audioRes.statusText}`);
  }
  const rawAudioUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${audioFilePath}`;
  onProgress?.(`曲情報をGitHubへ同期中 (${track.id}.json)...`);
  const metadataObj = {
    id: track.id,
    title: track.title,
    artist: track.artist || "不明なアーティスト",
    genre: track.genre || "邦楽",
    youtubeUrl: track.youtubeUrl || "",
    addedAt: track.addedAt || Date.now(),
    audioFileName: `${track.id}.m4a`,
    audioUrl: rawAudioUrl
  };
  const metadataJsonStr = JSON.stringify(metadataObj, null, 2);
  const metadataBase64 = btoa(unescape(encodeURIComponent(metadataJsonStr)));
  const existingMetaSha = await getFileSha(config, metadataFilePath);
  const metaPayload = {
    message: `Save metadata: ${track.title} [SoundBox]`,
    content: metadataBase64,
    branch: config.branch || "main"
  };
  if (existingMetaSha) {
    metaPayload.sha = existingMetaSha;
  }
  const metaRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${metadataFilePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json"
      },
      body: JSON.stringify(metaPayload)
    }
  );
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(`曲情報のGitHubアップロードに失敗しました: ${err.message || metaRes.statusText}`);
  }
  try {
    onProgress?.("マスターインデックス (tracks.json) を更新中...");
    await updateGitHubMasterIndex(config, indexFilePath, metadataObj);
  } catch (indexErr) {
    console.warn("Failed to update master tracks.json index file:", indexErr);
  }
  return {
    success: true,
    rawAudioUrl,
    message: `GitHubに曲「${track.title}」を正常に同期・保管しました！`
  };
}
async function updateGitHubMasterIndex(config, indexFilePath, newTrackMeta) {
  let existingTracks = [];
  let existingIndexSha = null;
  try {
    const indexRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${config.branch}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat.trim()}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );
    if (indexRes.ok) {
      const data = await indexRes.json();
      existingIndexSha = data.sha;
      const contentUtf8 = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      existingTracks = JSON.parse(contentUtf8);
    }
  } catch (_) {
  }
  const updatedTracks = existingTracks.filter((t) => t.id !== newTrackMeta.id);
  updatedTracks.unshift(newTrackMeta);
  const indexJsonStr = JSON.stringify(updatedTracks, null, 2);
  const indexBase64 = btoa(unescape(encodeURIComponent(indexJsonStr)));
  const payload = {
    message: `Update track index: ${newTrackMeta.title} [SoundBox]`,
    content: indexBase64,
    branch: config.branch || "main"
  };
  if (existingIndexSha) {
    payload.sha = existingIndexSha;
  }
  await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json"
      },
      body: JSON.stringify(payload)
    }
  );
}
export async function fetchTracksFromGitHub(config, onProgress) {
  if (!isGitHubConfigured(config)) {
    throw new Error("GitHub設定が必要です。");
  }
  const folder = cleanFolder(config.folder);
  const indexFilePath = `${folder}/tracks.json`;
  onProgress?.("GitHubリポジトリからインデックスを取得中...");
  try {
    const res = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${config.branch}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat.trim()}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );
    if (res.ok) {
      const data = await res.json();
      const contentUtf8 = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      const trackList = JSON.parse(contentUtf8);
      return trackList.map((meta) => ({
        meta,
        audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`
      }));
    }
  } catch (e) {
    console.warn("tracks.json not found, falling back to directory scan...", e);
  }
  onProgress?.(`フォルダ (${folder}/) 内のファイル一覧を取得中...`);
  const dirRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${folder}?ref=${config.branch}`,
    {
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        Accept: "application/vnd.github.v3+json"
      }
    }
  );
  if (!dirRes.ok) {
    if (dirRes.status === 404) {
      return [];
    }
    throw new Error("GitHubフォルダの取得に失敗しました。");
  }
  const items = await dirRes.json();
  const jsonFiles = items.filter((item) => item.name.endsWith(".json") && item.name !== "tracks.json");
  const results = [];
  for (const file of jsonFiles) {
    try {
      const fileRes = await fetch(file.download_url || file.url, {
        headers: config.pat ? { Authorization: `Bearer ${config.pat.trim()}` } : {}
      });
      if (fileRes.ok) {
        const meta = await fileRes.json();
        results.push({
          meta,
          audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`
        });
      }
    } catch (_) {
    }
  }
  return results;
}
export async function deleteTrackFromGitHub(trackId, config, onProgress) {
  if (!isGitHubConfigured(config)) return;
  const folder = cleanFolder(config.folder);
  const audioFilePath = `${folder}/${trackId}.m4a`;
  const metadataFilePath = `${folder}/${trackId}.json`;
  const indexFilePath = `${folder}/tracks.json`;
  onProgress?.("GitHub上の音声ファイル情報を確認中...");
  const audioSha = await getFileSha(config, audioFilePath);
  if (audioSha) {
    onProgress?.("GitHub上の音声ファイル (.m4a) を削除中...");
    await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${audioFilePath}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Delete audio track ${trackId} [SoundBox]`,
        sha: audioSha,
        branch: config.branch || "main"
      })
    });
  }
  const metaSha = await getFileSha(config, metadataFilePath);
  if (metaSha) {
    onProgress?.("GitHub上の情報ファイル (.json) を削除中...");
    await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${metadataFilePath}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Delete track metadata ${trackId} [SoundBox]`,
        sha: metaSha,
        branch: config.branch || "main"
      })
    });
  }
  try {
    onProgress?.("GitHubインデックス (tracks.json) から削除中...");
    const indexSha = await getFileSha(config, indexFilePath);
    if (indexSha) {
      const indexRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${config.branch}`,
        {
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );
      if (indexRes.ok) {
        const data = await indexRes.json();
        const contentUtf8 = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
        const existingTracks = JSON.parse(contentUtf8);
        const filtered = existingTracks.filter((t) => t.id !== trackId);
        const indexJsonStr = JSON.stringify(filtered, null, 2);
        const indexBase64 = btoa(unescape(encodeURIComponent(indexJsonStr)));
        await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: `Remove track ${trackId} from index [SoundBox]`,
            content: indexBase64,
            sha: data.sha,
            branch: config.branch || "main"
          })
        });
      }
    }
  } catch (e) {
    console.warn("Failed to update tracks.json on delete:", e);
  }
}
export async function uploadSourceCodeToGitHub(filesMap, config, onProgress, targetRepo) {
  if (!isGitHubConfigured(config)) {
    throw new Error("GitHub設定が必要です。");
  }
  const repoToUse = targetRepo || "MP3-Extractor-Player";
  const fileEntries = Object.entries(filesMap);
  let updatedCount = 0;
  for (let i = 0; i < fileEntries.length; i++) {
    const [path, content] = fileEntries[i];
    onProgress?.(`[${i + 1}/${fileEntries.length}] 「${path}」をGitHubへコミット中...`);
    try {
      const existingSha = await getFileSha(config, path, repoToUse);
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      const payload = {
        message: `Update ${path} via SoundBox Cloud Sync`,
        content: base64Content,
        branch: config.branch || "main"
      };
      if (existingSha) {
        payload.sha = existingSha;
      }
      const res = await fetch(
        `https://api.github.com/repos/${config.owner}/${repoToUse}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json"
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`Failed to push ${path}:`, err);
      } else {
        updatedCount++;
      }
    } catch (err) {
      console.warn(`Error pushing ${path}:`, err);
    }
  }
  return {
    success: true,
    message: `既存リポジトリ (${config.owner}/${repoToUse}) へアプリソースコード (${updatedCount}ファイル) を直接同期・コミットしました！`
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdpdGh1YlN5bmMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVHJhY2ssIEdpdEh1YkNvbmZpZyB9IGZyb20gXCIuLi90eXBlc1wiO1xuXG5jb25zdCBHSVRIVUJfQ09ORklHX0tFWSA9IFwic291bmRib3hfZ2l0aHViX2NvbmZpZ192MVwiO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9HSVRIVUJfQ09ORklHOiBHaXRIdWJDb25maWcgPSB7XG4gIHBhdDogXCJcIixcbiAgb3duZXI6IFwib3JpaGluYTAxOTNcIixcbiAgcmVwbzogXCJNUDMtRXh0cmFjdG9yLVBsYXllclwiLFxuICBmb2xkZXI6IFwic3JjXCIsXG4gIGJyYW5jaDogXCJtYWluXCIsXG4gIGF1dG9TeW5jOiBmYWxzZSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRHaXRIdWJDb25maWcoKTogR2l0SHViQ29uZmlnIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzYXZlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKEdJVEhVQl9DT05GSUdfS0VZKTtcbiAgICBpZiAoc2F2ZWQpIHtcbiAgICAgIHJldHVybiB7IC4uLkRFRkFVTFRfR0lUSFVCX0NPTkZJRywgLi4uSlNPTi5wYXJzZShzYXZlZCkgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHBhcnNlIEdpdEh1YiBjb25maWcgZnJvbSBsb2NhbFN0b3JhZ2U6XCIsIGUpO1xuICB9XG4gIHJldHVybiBERUZBVUxUX0dJVEhVQl9DT05GSUc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlR2l0SHViQ29uZmlnKGNvbmZpZzogR2l0SHViQ29uZmlnKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oR0lUSFVCX0NPTkZJR19LRVksIEpTT04uc3RyaW5naWZ5KGNvbmZpZykpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzYXZlIEdpdEh1YiBjb25maWcgdG8gbG9jYWxTdG9yYWdlOlwiLCBlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJHaXRIdWJDb25maWcoKTogdm9pZCB7XG4gIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKEdJVEhVQl9DT05GSUdfS0VZKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzR2l0SHViQ29uZmlndXJlZChjb25maWc6IEdpdEh1YkNvbmZpZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gQm9vbGVhbihjb25maWcucGF0LnRyaW0oKSAmJiBjb25maWcub3duZXIudHJpbSgpICYmIGNvbmZpZy5yZXBvLnRyaW0oKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9CYXNlNjQoYmxvYjogQmxvYik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4ge1xuICAgICAgY29uc3QgZGF0YVVybCA9IHJlYWRlci5yZXN1bHQgYXMgc3RyaW5nO1xuICAgICAgY29uc3QgYmFzZTY0ID0gZGF0YVVybC5zcGxpdChcIixcIilbMV0gfHwgXCJcIjtcbiAgICAgIHJlc29sdmUoYmFzZTY0KTtcbiAgICB9O1xuICAgIHJlYWRlci5vbmVycm9yID0gcmVqZWN0O1xuICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2xlYW5Gb2xkZXIoZm9sZGVyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgY2xlYW5lZCA9IGZvbGRlci50cmltKCkucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIik7XG4gIHJldHVybiBjbGVhbmVkIHx8IFwiYXVkaW9cIjtcbn1cblxuLyoqXG4gIFRlc3QgR2l0SHViIGNvbm5lY3Rpb24gYW5kIHZlcmlmeSBQQVQvUmVwbyBhY2Nlc3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRlc3RHaXRIdWJDb25uZWN0aW9uKGNvbmZpZzogR2l0SHViQ29uZmlnKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XG4gIGlmICghaXNHaXRIdWJDb25maWd1cmVkKGNvbmZpZykpIHtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJHaXRIdWIgUEFU44CB44Om44O844K244O85ZCN44CB44Oq44Od44K444OI44Oq5ZCN44KS5YWl5Yqb44GX44Gm44GP44Gg44GV44GE44CCXCIgfTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb31gLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJQQVTvvIjjg5Hjg7zjgr3jg4rjg6vjgqLjgq/jgrvjgrnjg4jjg7zjgq/jg7PvvInjgYznhKHlirnjgYvjgIHmnJ/pmZDliIfjgozjgafjgZnjgIJcIiB9O1xuICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIuODquODneOCuOODiOODquOBjOimi+OBpOOBi+OCiuOBvuOBm+OCk+OAguODpuODvOOCtuODvOWQjeODu+ODquODneOCuOODiOODquWQjeOCkueiuuiqjeOBl+OBpuOBj+OBoOOBleOBhOOAglwiIH07XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnN0IGVyciA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB8fCBgQVBJ44Ko44Op44O8OiAke3Jlc3BvbnNlLnN0YXR1c31gIH07XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBg5o6l57aa5oiQ5YqfOiAke2RhdGEuZnVsbF9uYW1lfSAoJHtkYXRhLnByaXZhdGUgPyBcIlByaXZhdGVcIiA6IFwiUHVibGljXCJ9KWAgfTtcbiAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwi44ON44OD44OI44Ov44O844Kv44Ko44Op44O8OiBcIiArIChlLm1lc3NhZ2UgfHwgZSkgfTtcbiAgfVxufVxuXG4vKipcbiBHZXQgU0hBIG9mIGV4aXN0aW5nIGZpbGUgaWYgcHJlc2VudCBvbiBHaXRIdWJcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0RmlsZVNoYShjb25maWc6IEdpdEh1YkNvbmZpZywgZmlsZVBhdGg6IHN0cmluZywgdGFyZ2V0UmVwbz86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCByZXBvTmFtZSA9IHRhcmdldFJlcG8gfHwgY29uZmlnLnJlcG87XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXG4gICAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtyZXBvTmFtZX0vY29udGVudHMvJHtmaWxlUGF0aH0/cmVmPSR7Y29uZmlnLmJyYW5jaH1gLFxuICAgICAge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gICAgaWYgKHJlcy5vaykge1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XG4gICAgICByZXR1cm4gZGF0YS5zaGEgfHwgbnVsbDtcbiAgICB9XG4gIH0gY2F0Y2ggKF8pIHt9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiBVcGxvYWQgc2luZ2xlIHRyYWNrIChBdWRpbyBmaWxlICsgTWV0YWRhdGEgSlNPTikgdG8gR2l0SHViIFJlcG9cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZFRyYWNrVG9HaXRIdWIoXG4gIHRyYWNrOiBUcmFjayxcbiAgY29uZmlnOiBHaXRIdWJDb25maWcsXG4gIG9uUHJvZ3Jlc3M/OiAoc3RlcDogc3RyaW5nKSA9PiB2b2lkXG4pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgcmF3QXVkaW9Vcmw6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgaWYgKCFpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YuioreWumuOBjOWujOS6huOBl+OBpuOBhOOBvuOBm+OCk+OAguioreWumueUu+mdouOBp1BBVOOBqOODquODneOCuOODiOODquaDheWgseOCkuS/neWtmOOBl+OBpuOBj+OBoOOBleOBhOOAglwiKTtcbiAgfVxuXG4gIGNvbnN0IGZvbGRlciA9IGNsZWFuRm9sZGVyKGNvbmZpZy5mb2xkZXIpO1xuICBjb25zdCBhdWRpb0ZpbGVQYXRoID0gYCR7Zm9sZGVyfS8ke3RyYWNrLmlkfS5tNGFgO1xuICBjb25zdCBtZXRhZGF0YUZpbGVQYXRoID0gYCR7Zm9sZGVyfS8ke3RyYWNrLmlkfS5qc29uYDtcbiAgY29uc3QgaW5kZXhGaWxlUGF0aCA9IGAke2ZvbGRlcn0vdHJhY2tzLmpzb25gO1xuXG4gIG9uUHJvZ3Jlc3M/LihcIumfs+WjsOODh+ODvOOCv+OCkkJhc2U2NOOCqOODs+OCs+ODvOODieS4rS4uLlwiKTtcbiAgY29uc3QgYmFzZTY0Q29udGVudCA9IGF3YWl0IGJsb2JUb0Jhc2U2NCh0cmFjay5ibG9iKTtcblxuICAvLyAxLiBVcGxvYWQgQXVkaW8gRmlsZSAoLm00YSlcbiAgb25Qcm9ncmVzcz8uKGBHaXRIdWLjgbjpn7Plo7Djg5XjgqHjgqTjg6sgKCR7dHJhY2suaWR9Lm00YSkg44KS44Ki44OD44OX44Ot44O844OJ5LitLi4uYCk7XG4gIGNvbnN0IGV4aXN0aW5nQXVkaW9TaGEgPSBhd2FpdCBnZXRGaWxlU2hhKGNvbmZpZywgYXVkaW9GaWxlUGF0aCk7XG5cbiAgY29uc3QgYXVkaW9QYXlsb2FkOiBhbnkgPSB7XG4gICAgbWVzc2FnZTogYFVwbG9hZCBhdWRpbzogJHt0cmFjay50aXRsZX0gKCR7dHJhY2suaWR9KSBbU291bmRCb3hdYCxcbiAgICBjb250ZW50OiBiYXNlNjRDb250ZW50LFxuICAgIGJyYW5jaDogY29uZmlnLmJyYW5jaCB8fCBcIm1haW5cIixcbiAgfTtcbiAgaWYgKGV4aXN0aW5nQXVkaW9TaGEpIHtcbiAgICBhdWRpb1BheWxvYWQuc2hhID0gZXhpc3RpbmdBdWRpb1NoYTtcbiAgfVxuXG4gIGNvbnN0IGF1ZGlvUmVzID0gYXdhaXQgZmV0Y2goXG4gICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7YXVkaW9GaWxlUGF0aH1gLFxuICAgIHtcbiAgICAgIG1ldGhvZDogXCJQVVRcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYXVkaW9QYXlsb2FkKSxcbiAgICB9XG4gICk7XG5cbiAgaWYgKCFhdWRpb1Jlcy5vaykge1xuICAgIGNvbnN0IGVyciA9IGF3YWl0IGF1ZGlvUmVzLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYOmfs+WjsOODleOCoeOCpOODq+OBrkdpdEh1YuOCouODg+ODl+ODreODvOODieOBq+WkseaVl+OBl+OBvuOBl+OBnzogJHtlcnIubWVzc2FnZSB8fCBhdWRpb1Jlcy5zdGF0dXNUZXh0fWApO1xuICB9XG5cbiAgY29uc3QgcmF3QXVkaW9VcmwgPSBgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS8ke2NvbmZpZy5icmFuY2h9LyR7YXVkaW9GaWxlUGF0aH1gO1xuXG4gIC8vIDIuIFVwbG9hZCBJbmRpdmlkdWFsIE1ldGFkYXRhIEpTT05cbiAgb25Qcm9ncmVzcz8uKGDmm7Lmg4XloLHjgpJHaXRIdWLjgbjlkIzmnJ/kuK0gKCR7dHJhY2suaWR9Lmpzb24pLi4uYCk7XG4gIGNvbnN0IG1ldGFkYXRhT2JqID0ge1xuICAgIGlkOiB0cmFjay5pZCxcbiAgICB0aXRsZTogdHJhY2sudGl0bGUsXG4gICAgYXJ0aXN0OiB0cmFjay5hcnRpc3QgfHwgXCLkuI3mmI7jgarjgqLjg7zjg4bjgqPjgrnjg4hcIixcbiAgICBnZW5yZTogdHJhY2suZ2VucmUgfHwgXCLpgqbmpb1cIixcbiAgICB5b3V0dWJlVXJsOiB0cmFjay55b3V0dWJlVXJsIHx8IFwiXCIsXG4gICAgYWRkZWRBdDogdHJhY2suYWRkZWRBdCB8fCBEYXRlLm5vdygpLFxuICAgIGF1ZGlvRmlsZU5hbWU6IGAke3RyYWNrLmlkfS5tNGFgLFxuICAgIGF1ZGlvVXJsOiByYXdBdWRpb1VybCxcbiAgfTtcblxuICBjb25zdCBtZXRhZGF0YUpzb25TdHIgPSBKU09OLnN0cmluZ2lmeShtZXRhZGF0YU9iaiwgbnVsbCwgMik7XG4gIGNvbnN0IG1ldGFkYXRhQmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQobWV0YWRhdGFKc29uU3RyKSkpO1xuXG4gIGNvbnN0IGV4aXN0aW5nTWV0YVNoYSA9IGF3YWl0IGdldEZpbGVTaGEoY29uZmlnLCBtZXRhZGF0YUZpbGVQYXRoKTtcbiAgY29uc3QgbWV0YVBheWxvYWQ6IGFueSA9IHtcbiAgICBtZXNzYWdlOiBgU2F2ZSBtZXRhZGF0YTogJHt0cmFjay50aXRsZX0gW1NvdW5kQm94XWAsXG4gICAgY29udGVudDogbWV0YWRhdGFCYXNlNjQsXG4gICAgYnJhbmNoOiBjb25maWcuYnJhbmNoIHx8IFwibWFpblwiLFxuICB9O1xuICBpZiAoZXhpc3RpbmdNZXRhU2hhKSB7XG4gICAgbWV0YVBheWxvYWQuc2hhID0gZXhpc3RpbmdNZXRhU2hhO1xuICB9XG5cbiAgY29uc3QgbWV0YVJlcyA9IGF3YWl0IGZldGNoKFxuICAgIGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS9jb250ZW50cy8ke21ldGFkYXRhRmlsZVBhdGh9YCxcbiAgICB7XG4gICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KG1ldGFQYXlsb2FkKSxcbiAgICB9XG4gICk7XG5cbiAgaWYgKCFtZXRhUmVzLm9rKSB7XG4gICAgY29uc3QgZXJyID0gYXdhaXQgbWV0YVJlcy5qc29uKCkuY2F0Y2goKCkgPT4gKHt9KSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGDmm7Lmg4XloLHjga5HaXRIdWLjgqLjg4Pjg5fjg63jg7zjg4njgavlpLHmlZfjgZfjgb7jgZfjgZ86ICR7ZXJyLm1lc3NhZ2UgfHwgbWV0YVJlcy5zdGF0dXNUZXh0fWApO1xuICB9XG5cbiAgLy8gMy4gVXBkYXRlIG1hc3RlciBpbmRleCBmaWxlIHRyYWNrcy5qc29uXG4gIHRyeSB7XG4gICAgb25Qcm9ncmVzcz8uKFwi44Oe44K544K/44O844Kk44Oz44OH44OD44Kv44K5ICh0cmFja3MuanNvbikg44KS5pu05paw5LitLi4uXCIpO1xuICAgIGF3YWl0IHVwZGF0ZUdpdEh1Yk1hc3RlckluZGV4KGNvbmZpZywgaW5kZXhGaWxlUGF0aCwgbWV0YWRhdGFPYmopO1xuICB9IGNhdGNoIChpbmRleEVycikge1xuICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byB1cGRhdGUgbWFzdGVyIHRyYWNrcy5qc29uIGluZGV4IGZpbGU6XCIsIGluZGV4RXJyKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3VjY2VzczogdHJ1ZSxcbiAgICByYXdBdWRpb1VybCxcbiAgICBtZXNzYWdlOiBgR2l0SHVi44Gr5puy44CMJHt0cmFjay50aXRsZX3jgI3jgpLmraPluLjjgavlkIzmnJ/jg7vkv53nrqHjgZfjgb7jgZfjgZ/vvIFgLFxuICB9O1xufVxuXG4vKipcbiBIZWxwZXIgdG8ga2VlcCB0cmFja3MuanNvbiBpbmRleCB1cGRhdGVkXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUdpdEh1Yk1hc3RlckluZGV4KFxuICBjb25maWc6IEdpdEh1YkNvbmZpZyxcbiAgaW5kZXhGaWxlUGF0aDogc3RyaW5nLFxuICBuZXdUcmFja01ldGE6IGFueVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCBleGlzdGluZ1RyYWNrczogYW55W10gPSBbXTtcbiAgbGV0IGV4aXN0aW5nSW5kZXhTaGE6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgaW5kZXhSZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgIGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS9jb250ZW50cy8ke2luZGV4RmlsZVBhdGh9P3JlZj0ke2NvbmZpZy5icmFuY2h9YCxcbiAgICAgIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGluZGV4UmVzLm9rKSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgaW5kZXhSZXMuanNvbigpO1xuICAgICAgZXhpc3RpbmdJbmRleFNoYSA9IGRhdGEuc2hhO1xuICAgICAgY29uc3QgY29udGVudFV0ZjggPSBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IoZGF0YS5jb250ZW50LnJlcGxhY2UoL1xcbi9nLCBcIlwiKSkpKTtcbiAgICAgIGV4aXN0aW5nVHJhY2tzID0gSlNPTi5wYXJzZShjb250ZW50VXRmOCk7XG4gICAgfVxuICB9IGNhdGNoIChfKSB7fVxuXG4gIC8vIEZpbHRlciBvdXQgZHVwbGljYXRlIElEIGlmIHByZXNlbnQsIHRoZW4gYWRkIG5ldyB0cmFjayBtZXRhZGF0YVxuICBjb25zdCB1cGRhdGVkVHJhY2tzID0gZXhpc3RpbmdUcmFja3MuZmlsdGVyKCh0KSA9PiB0LmlkICE9PSBuZXdUcmFja01ldGEuaWQpO1xuICB1cGRhdGVkVHJhY2tzLnVuc2hpZnQobmV3VHJhY2tNZXRhKTtcblxuICBjb25zdCBpbmRleEpzb25TdHIgPSBKU09OLnN0cmluZ2lmeSh1cGRhdGVkVHJhY2tzLCBudWxsLCAyKTtcbiAgY29uc3QgaW5kZXhCYXNlNjQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChpbmRleEpzb25TdHIpKSk7XG5cbiAgY29uc3QgcGF5bG9hZDogYW55ID0ge1xuICAgIG1lc3NhZ2U6IGBVcGRhdGUgdHJhY2sgaW5kZXg6ICR7bmV3VHJhY2tNZXRhLnRpdGxlfSBbU291bmRCb3hdYCxcbiAgICBjb250ZW50OiBpbmRleEJhc2U2NCxcbiAgICBicmFuY2g6IGNvbmZpZy5icmFuY2ggfHwgXCJtYWluXCIsXG4gIH07XG4gIGlmIChleGlzdGluZ0luZGV4U2hhKSB7XG4gICAgcGF5bG9hZC5zaGEgPSBleGlzdGluZ0luZGV4U2hhO1xuICB9XG5cbiAgYXdhaXQgZmV0Y2goXG4gICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7aW5kZXhGaWxlUGF0aH1gLFxuICAgIHtcbiAgICAgIG1ldGhvZDogXCJQVVRcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXG4gICAgfVxuICApO1xufVxuXG4vKipcbiBGZXRjaCBhbGwgdHJhY2sgbWV0YWRhdGEgZnJvbSBHaXRIdWIgcmVwb3NpdG9yeVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hUcmFja3NGcm9tR2l0SHViKFxuICBjb25maWc6IEdpdEh1YkNvbmZpZyxcbiAgb25Qcm9ncmVzcz86IChtc2c6IHN0cmluZykgPT4gdm9pZFxuKTogUHJvbWlzZTxBcnJheTx7IG1ldGE6IGFueTsgYXVkaW9CbG9iVXJsPzogc3RyaW5nIH0+PiB7XG4gIGlmICghaXNHaXRIdWJDb25maWd1cmVkKGNvbmZpZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWLoqK3lrprjgYzlv4XopoHjgafjgZnjgIJcIik7XG4gIH1cblxuICBjb25zdCBmb2xkZXIgPSBjbGVhbkZvbGRlcihjb25maWcuZm9sZGVyKTtcbiAgY29uc3QgaW5kZXhGaWxlUGF0aCA9IGAke2ZvbGRlcn0vdHJhY2tzLmpzb25gO1xuXG4gIG9uUHJvZ3Jlc3M/LihcIkdpdEh1YuODquODneOCuOODiOODquOBi+OCieOCpOODs+ODh+ODg+OCr+OCueOCkuWPluW+l+S4rS4uLlwiKTtcblxuICAvLyAxLiBUcnkgcmVhZGluZyB0cmFja3MuanNvbiBmaXJzdFxuICB0cnkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7aW5kZXhGaWxlUGF0aH0/cmVmPSR7Y29uZmlnLmJyYW5jaH1gLFxuICAgICAge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAocmVzLm9rKSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgIGNvbnN0IGNvbnRlbnRVdGY4ID0gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShhdG9iKGRhdGEuY29udGVudC5yZXBsYWNlKC9cXG4vZywgXCJcIikpKSk7XG4gICAgICBjb25zdCB0cmFja0xpc3QgPSBKU09OLnBhcnNlKGNvbnRlbnRVdGY4KSBhcyBhbnlbXTtcbiAgICAgIHJldHVybiB0cmFja0xpc3QubWFwKChtZXRhKSA9PiAoe1xuICAgICAgICBtZXRhLFxuICAgICAgICBhdWRpb0Jsb2JVcmw6IG1ldGEuYXVkaW9VcmwgfHwgYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vJHtjb25maWcuYnJhbmNofS8ke2ZvbGRlcn0vJHttZXRhLmlkfS5tNGFgLFxuICAgICAgfSkpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUud2FybihcInRyYWNrcy5qc29uIG5vdCBmb3VuZCwgZmFsbGluZyBiYWNrIHRvIGRpcmVjdG9yeSBzY2FuLi4uXCIsIGUpO1xuICB9XG5cbiAgLy8gMi4gRGlyZWN0b3J5IHNjYW4gZmFsbGJhY2tcbiAgb25Qcm9ncmVzcz8uKGDjg5Xjgqnjg6vjg4AgKCR7Zm9sZGVyfS8pIOWGheOBruODleOCoeOCpOODq+S4gOimp+OCkuWPluW+l+S4rS4uLmApO1xuICBjb25zdCBkaXJSZXMgPSBhd2FpdCBmZXRjaChcbiAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHtmb2xkZXJ9P3JlZj0ke2NvbmZpZy5icmFuY2h9YCxcbiAgICB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICB9LFxuICAgIH1cbiAgKTtcblxuICBpZiAoIWRpclJlcy5vaykge1xuICAgIGlmIChkaXJSZXMuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIHJldHVybiBbXTsgLy8gRW1wdHkgZm9sZGVyIG9yIG5vdCBjcmVhdGVkIHlldFxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWLjg5Xjgqnjg6vjg4Djga7lj5blvpfjgavlpLHmlZfjgZfjgb7jgZfjgZ/jgIJcIik7XG4gIH1cblxuICBjb25zdCBpdGVtcyA9IChhd2FpdCBkaXJSZXMuanNvbigpKSBhcyBhbnlbXTtcbiAgY29uc3QganNvbkZpbGVzID0gaXRlbXMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLm5hbWUuZW5kc1dpdGgoXCIuanNvblwiKSAmJiBpdGVtLm5hbWUgIT09IFwidHJhY2tzLmpzb25cIik7XG5cbiAgY29uc3QgcmVzdWx0czogQXJyYXk8eyBtZXRhOiBhbnk7IGF1ZGlvQmxvYlVybD86IHN0cmluZyB9PiA9IFtdO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBqc29uRmlsZXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZmlsZVJlcyA9IGF3YWl0IGZldGNoKGZpbGUuZG93bmxvYWRfdXJsIHx8IGZpbGUudXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IGNvbmZpZy5wYXQgPyB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gIH0gOiB7fSxcbiAgICAgIH0pO1xuICAgICAgaWYgKGZpbGVSZXMub2spIHtcbiAgICAgICAgY29uc3QgbWV0YSA9IGF3YWl0IGZpbGVSZXMuanNvbigpO1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIG1ldGEsXG4gICAgICAgICAgYXVkaW9CbG9iVXJsOiBtZXRhLmF1ZGlvVXJsIHx8IGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99LyR7Y29uZmlnLmJyYW5jaH0vJHtmb2xkZXJ9LyR7bWV0YS5pZH0ubTRhYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoXykge31cbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiBEZWxldGUgYSB0cmFjayBmcm9tIEdpdEh1YiByZXBvc2l0b3J5ICgubTRhLCAuanNvbiwgYW5kIHVwZGF0ZSBpbmRleClcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZVRyYWNrRnJvbUdpdEh1YihcbiAgdHJhY2tJZDogc3RyaW5nLFxuICBjb25maWc6IEdpdEh1YkNvbmZpZyxcbiAgb25Qcm9ncmVzcz86IChtc2c6IHN0cmluZykgPT4gdm9pZFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghaXNHaXRIdWJDb25maWd1cmVkKGNvbmZpZykpIHJldHVybjtcblxuICBjb25zdCBmb2xkZXIgPSBjbGVhbkZvbGRlcihjb25maWcuZm9sZGVyKTtcbiAgY29uc3QgYXVkaW9GaWxlUGF0aCA9IGAke2ZvbGRlcn0vJHt0cmFja0lkfS5tNGFgO1xuICBjb25zdCBtZXRhZGF0YUZpbGVQYXRoID0gYCR7Zm9sZGVyfS8ke3RyYWNrSWR9Lmpzb25gO1xuICBjb25zdCBpbmRleEZpbGVQYXRoID0gYCR7Zm9sZGVyfS90cmFja3MuanNvbmA7XG5cbiAgb25Qcm9ncmVzcz8uKFwiR2l0SHVi5LiK44Gu6Z+z5aOw44OV44Kh44Kk44Or5oOF5aCx44KS56K66KqN5LitLi4uXCIpO1xuXG4gIC8vIERlbGV0ZSBhdWRpbyBmaWxlXG4gIGNvbnN0IGF1ZGlvU2hhID0gYXdhaXQgZ2V0RmlsZVNoYShjb25maWcsIGF1ZGlvRmlsZVBhdGgpO1xuICBpZiAoYXVkaW9TaGEpIHtcbiAgICBvblByb2dyZXNzPy4oXCJHaXRIdWLkuIrjga7pn7Plo7Djg5XjgqHjgqTjg6sgKC5tNGEpIOOCkuWJiumZpOS4rS4uLlwiKTtcbiAgICBhd2FpdCBmZXRjaChgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHthdWRpb0ZpbGVQYXRofWAsIHtcbiAgICAgIG1ldGhvZDogXCJERUxFVEVcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbWVzc2FnZTogYERlbGV0ZSBhdWRpbyB0cmFjayAke3RyYWNrSWR9IFtTb3VuZEJveF1gLFxuICAgICAgICBzaGE6IGF1ZGlvU2hhLFxuICAgICAgICBicmFuY2g6IGNvbmZpZy5icmFuY2ggfHwgXCJtYWluXCIsXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIERlbGV0ZSBqc29uIG1ldGFkYXRhXG4gIGNvbnN0IG1ldGFTaGEgPSBhd2FpdCBnZXRGaWxlU2hhKGNvbmZpZywgbWV0YWRhdGFGaWxlUGF0aCk7XG4gIGlmIChtZXRhU2hhKSB7XG4gICAgb25Qcm9ncmVzcz8uKFwiR2l0SHVi5LiK44Gu5oOF5aCx44OV44Kh44Kk44OrICguanNvbikg44KS5YmK6Zmk5LitLi4uXCIpO1xuICAgIGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS9jb250ZW50cy8ke21ldGFkYXRhRmlsZVBhdGh9YCwge1xuICAgICAgbWV0aG9kOiBcIkRFTEVURVwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlOiBgRGVsZXRlIHRyYWNrIG1ldGFkYXRhICR7dHJhY2tJZH0gW1NvdW5kQm94XWAsXG4gICAgICAgIHNoYTogbWV0YVNoYSxcbiAgICAgICAgYnJhbmNoOiBjb25maWcuYnJhbmNoIHx8IFwibWFpblwiLFxuICAgICAgfSksXG4gICAgfSk7XG4gIH1cblxuICAvLyBVcGRhdGUgbWFzdGVyIGluZGV4IHRyYWNrcy5qc29uXG4gIHRyeSB7XG4gICAgb25Qcm9ncmVzcz8uKFwiR2l0SHVi44Kk44Oz44OH44OD44Kv44K5ICh0cmFja3MuanNvbikg44GL44KJ5YmK6Zmk5LitLi4uXCIpO1xuICAgIGNvbnN0IGluZGV4U2hhID0gYXdhaXQgZ2V0RmlsZVNoYShjb25maWcsIGluZGV4RmlsZVBhdGgpO1xuICAgIGlmIChpbmRleFNoYSkge1xuICAgICAgY29uc3QgaW5kZXhSZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7aW5kZXhGaWxlUGF0aH0/cmVmPSR7Y29uZmlnLmJyYW5jaH1gLFxuICAgICAgICB7XG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIGlmIChpbmRleFJlcy5vaykge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgaW5kZXhSZXMuanNvbigpO1xuICAgICAgICBjb25zdCBjb250ZW50VXRmOCA9IGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYXRvYihkYXRhLmNvbnRlbnQucmVwbGFjZSgvXFxuL2csIFwiXCIpKSkpO1xuICAgICAgICBjb25zdCBleGlzdGluZ1RyYWNrcyA9IEpTT04ucGFyc2UoY29udGVudFV0ZjgpIGFzIGFueVtdO1xuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nVHJhY2tzLmZpbHRlcigodCkgPT4gdC5pZCAhPT0gdHJhY2tJZCk7XG5cbiAgICAgICAgY29uc3QgaW5kZXhKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWQsIG51bGwsIDIpO1xuICAgICAgICBjb25zdCBpbmRleEJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGluZGV4SnNvblN0cikpKTtcblxuICAgICAgICBhd2FpdCBmZXRjaChgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHtpbmRleEZpbGVQYXRofWAsIHtcbiAgICAgICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBSZW1vdmUgdHJhY2sgJHt0cmFja0lkfSBmcm9tIGluZGV4IFtTb3VuZEJveF1gLFxuICAgICAgICAgICAgY29udGVudDogaW5kZXhCYXNlNjQsXG4gICAgICAgICAgICBzaGE6IGRhdGEuc2hhLFxuICAgICAgICAgICAgYnJhbmNoOiBjb25maWcuYnJhbmNoIHx8IFwibWFpblwiLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gdXBkYXRlIHRyYWNrcy5qc29uIG9uIGRlbGV0ZTpcIiwgZSk7XG4gIH1cbn1cblxuLyoqXG4gIFVwbG9hZCBmdWxsIGFwcGxpY2F0aW9uIHNvdXJjZSBjb2RlIHRvIGEgZGVzaWduYXRlZCBHaXRIdWIgcmVwb3NpdG9yeSAoZS5nLiBNUDMtRXh0cmFjdG9yLVBsYXllcilcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZFNvdXJjZUNvZGVUb0dpdEh1YihcbiAgZmlsZXNNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gIGNvbmZpZzogR2l0SHViQ29uZmlnLFxuICBvblByb2dyZXNzPzogKG1zZzogc3RyaW5nKSA9PiB2b2lkLFxuICB0YXJnZXRSZXBvPzogc3RyaW5nXG4pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgaWYgKCFpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YuioreWumuOBjOW/heimgeOBp+OBmeOAglwiKTtcbiAgfVxuXG4gIGNvbnN0IHJlcG9Ub1VzZSA9IHRhcmdldFJlcG8gfHwgXCJNUDMtRXh0cmFjdG9yLVBsYXllclwiO1xuICBjb25zdCBmaWxlRW50cmllcyA9IE9iamVjdC5lbnRyaWVzKGZpbGVzTWFwKTtcbiAgbGV0IHVwZGF0ZWRDb3VudCA9IDA7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlRW50cmllcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IFtwYXRoLCBjb250ZW50XSA9IGZpbGVFbnRyaWVzW2ldO1xuICAgIG9uUHJvZ3Jlc3M/LihgWyR7aSArIDF9LyR7ZmlsZUVudHJpZXMubGVuZ3RofV0g44CMJHtwYXRofeOAjeOCkkdpdEh1YuOBuOOCs+ODn+ODg+ODiOS4rS4uLmApO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nU2hhID0gYXdhaXQgZ2V0RmlsZVNoYShjb25maWcsIHBhdGgsIHJlcG9Ub1VzZSk7XG4gICAgICBjb25zdCBiYXNlNjRDb250ZW50ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoY29udGVudCkpKTtcblxuICAgICAgY29uc3QgcGF5bG9hZDogYW55ID0ge1xuICAgICAgICBtZXNzYWdlOiBgVXBkYXRlICR7cGF0aH0gdmlhIFNvdW5kQm94IENsb3VkIFN5bmNgLFxuICAgICAgICBjb250ZW50OiBiYXNlNjRDb250ZW50LFxuICAgICAgICBicmFuY2g6IGNvbmZpZy5icmFuY2ggfHwgXCJtYWluXCIsXG4gICAgICB9O1xuICAgICAgaWYgKGV4aXN0aW5nU2hhKSB7XG4gICAgICAgIHBheWxvYWQuc2hhID0gZXhpc3RpbmdTaGE7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKFxuICAgICAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtyZXBvVG9Vc2V9L2NvbnRlbnRzLyR7cGF0aH1gLFxuICAgICAgICB7XG4gICAgICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgICAgaWYgKCFyZXMub2spIHtcbiAgICAgICAgY29uc3QgZXJyID0gYXdhaXQgcmVzLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBGYWlsZWQgdG8gcHVzaCAke3BhdGh9OmAsIGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUud2FybihgRXJyb3IgcHVzaGluZyAke3BhdGh9OmAsIGVycik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWNjZXNzOiB0cnVlLFxuICAgIG1lc3NhZ2U6IGDml6LlrZjjg6rjg53jgrjjg4jjg6ogKCR7Y29uZmlnLm93bmVyfS8ke3JlcG9Ub1VzZX0pIOOBuOOCouODl+ODquOCveODvOOCueOCs+ODvOODiSAoJHt1cGRhdGVkQ291bnR944OV44Kh44Kk44OrKSDjgpLnm7TmjqXlkIzmnJ/jg7vjgrPjg5/jg4Pjg4jjgZfjgb7jgZfjgZ/vvIFgLFxuICB9O1xufVxuXG4iXSwibWFwcGluZ3MiOiJBQUVBLE1BQU0sb0JBQW9CO0FBRW5CLGFBQU0sd0JBQXNDO0FBQUEsRUFDakQsS0FBSztBQUFBLEVBQ0wsT0FBTztBQUFBLEVBQ1AsTUFBTTtBQUFBLEVBQ04sUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsVUFBVTtBQUNaO0FBRU8sZ0JBQVMsa0JBQWdDO0FBQzlDLE1BQUk7QUFDRixVQUFNLFFBQVEsYUFBYSxRQUFRLGlCQUFpQjtBQUNwRCxRQUFJLE9BQU87QUFDVCxhQUFPLEVBQUUsR0FBRyx1QkFBdUIsR0FBRyxLQUFLLE1BQU0sS0FBSyxFQUFFO0FBQUEsSUFDMUQ7QUFBQSxFQUNGLFNBQVMsR0FBRztBQUNWLFlBQVEsTUFBTSxvREFBb0QsQ0FBQztBQUFBLEVBQ3JFO0FBQ0EsU0FBTztBQUNUO0FBRU8sZ0JBQVMsaUJBQWlCLFFBQTRCO0FBQzNELE1BQUk7QUFDRixpQkFBYSxRQUFRLG1CQUFtQixLQUFLLFVBQVUsTUFBTSxDQUFDO0FBQUEsRUFDaEUsU0FBUyxHQUFHO0FBQ1YsWUFBUSxNQUFNLGlEQUFpRCxDQUFDO0FBQUEsRUFDbEU7QUFDRjtBQUVPLGdCQUFTLG9CQUEwQjtBQUN4QyxlQUFhLFdBQVcsaUJBQWlCO0FBQzNDO0FBRU8sZ0JBQVMsbUJBQW1CLFFBQStCO0FBQ2hFLFNBQU8sUUFBUSxPQUFPLElBQUksS0FBSyxLQUFLLE9BQU8sTUFBTSxLQUFLLEtBQUssT0FBTyxLQUFLLEtBQUssQ0FBQztBQUMvRTtBQUVPLGdCQUFTLGFBQWEsTUFBNkI7QUFDeEQsU0FBTyxJQUFJLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFDdEMsVUFBTSxTQUFTLElBQUksV0FBVztBQUM5QixXQUFPLFlBQVksTUFBTTtBQUN2QixZQUFNLFVBQVUsT0FBTztBQUN2QixZQUFN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