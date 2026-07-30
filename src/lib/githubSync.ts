const GITHUB_CONFIG_KEY = "soundbox_github_config_v1";
export const DEFAULT_GITHUB_CONFIG = {
  pat: "",
  owner: "orihina0193",
  repo: "Extractor-Player-storage",
  folder: "audio",
  branch: "main",
  autoSync: true
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
  return "audio";
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
  const primaryFolder = cleanFolder(config.folder);
  const candidateFolders = Array.from(/* @__PURE__ */ new Set([primaryFolder, "audio", "tracks"]));
  for (const folder of candidateFolders) {
    const indexFilePath = `${folder}/tracks.json`;
    onProgress?.(`GitHubリポジトリ (${folder}/) からインデックスを取得中...`);
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
        if (trackList.length > 0) {
          return trackList.map((meta) => ({
            meta,
            audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`
          }));
        }
      }
    } catch (e) {
      console.warn(`tracks.json not found in ${folder}/, trying directory scan...`, e);
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
    if (dirRes.ok) {
      const items = await dirRes.json();
      const jsonFiles = items.filter((item) => item.name.endsWith(".json") && item.name !== "tracks.json");
      if (jsonFiles.length > 0) {
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
        if (results.length > 0) {
          return results;
        }
      }
    }
  }
  return [];
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdpdGh1YlN5bmMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVHJhY2ssIEdpdEh1YkNvbmZpZyB9IGZyb20gXCIuLi90eXBlc1wiO1xuXG5jb25zdCBHSVRIVUJfQ09ORklHX0tFWSA9IFwic291bmRib3hfZ2l0aHViX2NvbmZpZ192MVwiO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9HSVRIVUJfQ09ORklHOiBHaXRIdWJDb25maWcgPSB7XG4gIHBhdDogXCJcIixcbiAgb3duZXI6IFwib3JpaGluYTAxOTNcIixcbiAgcmVwbzogXCJFeHRyYWN0b3ItUGxheWVyLXN0b3JhZ2VcIixcbiAgZm9sZGVyOiBcImF1ZGlvXCIsXG4gIGJyYW5jaDogXCJtYWluXCIsXG4gIGF1dG9TeW5jOiB0cnVlLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEdpdEh1YkNvbmZpZygpOiBHaXRIdWJDb25maWcge1xuICB0cnkge1xuICAgIGNvbnN0IHNhdmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oR0lUSFVCX0NPTkZJR19LRVkpO1xuICAgIGlmIChzYXZlZCkge1xuICAgICAgcmV0dXJuIHsgLi4uREVGQVVMVF9HSVRIVUJfQ09ORklHLCAuLi5KU09OLnBhcnNlKHNhdmVkKSB9O1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcGFyc2UgR2l0SHViIGNvbmZpZyBmcm9tIGxvY2FsU3RvcmFnZTpcIiwgZSk7XG4gIH1cbiAgcmV0dXJuIERFRkFVTFRfR0lUSFVCX0NPTkZJRztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVHaXRIdWJDb25maWcoY29uZmlnOiBHaXRIdWJDb25maWcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShHSVRIVUJfQ09ORklHX0tFWSwgSlNPTi5zdHJpbmdpZnkoY29uZmlnKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNhdmUgR2l0SHViIGNvbmZpZyB0byBsb2NhbFN0b3JhZ2U6XCIsIGUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckdpdEh1YkNvbmZpZygpOiB2b2lkIHtcbiAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oR0lUSFVCX0NPTkZJR19LRVkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNHaXRIdWJDb25maWd1cmVkKGNvbmZpZzogR2l0SHViQ29uZmlnKTogYm9vbGVhbiB7XG4gIHJldHVybiBCb29sZWFuKGNvbmZpZy5wYXQudHJpbSgpICYmIGNvbmZpZy5vd25lci50cmltKCkgJiYgY29uZmlnLnJlcG8udHJpbSgpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0Jhc2U2NChibG9iOiBCbG9iKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBkYXRhVXJsID0gcmVhZGVyLnJlc3VsdCBhcyBzdHJpbmc7XG4gICAgICBjb25zdCBiYXNlNjQgPSBkYXRhVXJsLnNwbGl0KFwiLFwiKVsxXSB8fCBcIlwiO1xuICAgICAgcmVzb2x2ZShiYXNlNjQpO1xuICAgIH07XG4gICAgcmVhZGVyLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjbGVhbkZvbGRlcihmb2xkZXI/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyDkv53lrZjjg5Xjgqnjg6vjg4Djga/luLjjgasgXCJhdWRpb1wiIOOBq+WbuuWumlxuICByZXR1cm4gXCJhdWRpb1wiO1xufVxuXG4vKipcbiAgVGVzdCBHaXRIdWIgY29ubmVjdGlvbiBhbmQgdmVyaWZ5IFBBVC9SZXBvIGFjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdEdpdEh1YkNvbm5lY3Rpb24oY29uZmlnOiBHaXRIdWJDb25maWcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgaWYgKCFpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSkge1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkdpdEh1YiBQQVTjgIHjg6bjg7zjgrbjg7zlkI3jgIHjg6rjg53jgrjjg4jjg6rlkI3jgpLlhaXlipvjgZfjgabjgY/jgaDjgZXjgYTjgIJcIiB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfWAsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlBBVO+8iOODkeODvOOCveODiuODq+OCouOCr+OCu+OCueODiOODvOOCr+ODs++8ieOBjOeEoeWKueOBi+OAgeacn+mZkOWIh+OCjOOBp+OBmeOAglwiIH07XG4gICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwi44Oq44Od44K444OI44Oq44GM6KaL44Gk44GL44KK44G+44Gb44KT44CC44Om44O844K244O85ZCN44O744Oq44Od44K444OI44Oq5ZCN44KS56K66KqN44GX44Gm44GP44Gg44GV44GE44CCXCIgfTtcbiAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgY29uc3QgZXJyID0gYXdhaXQgcmVzcG9uc2UuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IGVyci5tZXNzYWdlIHx8IGBBUEnjgqjjg6njg7w6ICR7cmVzcG9uc2Uuc3RhdHVzfWAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGDmjqXntprmiJDlip86ICR7ZGF0YS5mdWxsX25hbWV9ICgke2RhdGEucHJpdmF0ZSA/IFwiUHJpdmF0ZVwiIDogXCJQdWJsaWNcIn0pYCB9O1xuICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCLjg43jg4Pjg4jjg6/jg7zjgq/jgqjjg6njg7w6IFwiICsgKGUubWVzc2FnZSB8fCBlKSB9O1xuICB9XG59XG5cbi8qKlxuIEdldCBTSEEgb2YgZXhpc3RpbmcgZmlsZSBpZiBwcmVzZW50IG9uIEdpdEh1YlxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRGaWxlU2hhKGNvbmZpZzogR2l0SHViQ29uZmlnLCBmaWxlUGF0aDogc3RyaW5nLCB0YXJnZXRSZXBvPzogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIGNvbnN0IHJlcG9OYW1lID0gdGFyZ2V0UmVwbyB8fCBjb25maWcucmVwbztcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgIGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke3JlcG9OYW1lfS9jb250ZW50cy8ke2ZpbGVQYXRofT9yZWY9JHtjb25maWcuYnJhbmNofWAsXG4gICAgICB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgKTtcbiAgICBpZiAocmVzLm9rKSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgIHJldHVybiBkYXRhLnNoYSB8fCBudWxsO1xuICAgIH1cbiAgfSBjYXRjaCAoXykge31cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuIFVwbG9hZCBzaW5nbGUgdHJhY2sgKEF1ZGlvIGZpbGUgKyBNZXRhZGF0YSBKU09OKSB0byBHaXRIdWIgUmVwb1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkVHJhY2tUb0dpdEh1YihcbiAgdHJhY2s6IFRyYWNrLFxuICBjb25maWc6IEdpdEh1YkNvbmZpZyxcbiAgb25Qcm9ncmVzcz86IChzdGVwOiBzdHJpbmcpID0+IHZvaWRcbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyByYXdBdWRpb1VybDogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICBpZiAoIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHVi6Kit5a6a44GM5a6M5LqG44GX44Gm44GE44G+44Gb44KT44CC6Kit5a6a55S76Z2i44GnUEFU44Go44Oq44Od44K444OI44Oq5oOF5aCx44KS5L+d5a2Y44GX44Gm44GP44Gg44GV44GE44CCXCIpO1xuICB9XG5cbiAgY29uc3QgZm9sZGVyID0gY2xlYW5Gb2xkZXIoY29uZmlnLmZvbGRlcik7XG4gIGNvbnN0IGF1ZGlvRmlsZVBhdGggPSBgJHtmb2xkZXJ9LyR7dHJhY2suaWR9Lm00YWA7XG4gIGNvbnN0IG1ldGFkYXRhRmlsZVBhdGggPSBgJHtmb2xkZXJ9LyR7dHJhY2suaWR9Lmpzb25gO1xuICBjb25zdCBpbmRleEZpbGVQYXRoID0gYCR7Zm9sZGVyfS90cmFja3MuanNvbmA7XG5cbiAgb25Qcm9ncmVzcz8uKFwi6Z+z5aOw44OH44O844K/44KSQmFzZTY044Ko44Oz44Kz44O844OJ5LitLi4uXCIpO1xuICBjb25zdCBiYXNlNjRDb250ZW50ID0gYXdhaXQgYmxvYlRvQmFzZTY0KHRyYWNrLmJsb2IpO1xuXG4gIC8vIDEuIFVwbG9hZCBBdWRpbyBGaWxlICgubTRhKVxuICBvblByb2dyZXNzPy4oYEdpdEh1YuOBuOmfs+WjsOODleOCoeOCpOODqyAoJHt0cmFjay5pZH0ubTRhKSDjgpLjgqLjg4Pjg5fjg63jg7zjg4nkuK0uLi5gKTtcbiAgY29uc3QgZXhpc3RpbmdBdWRpb1NoYSA9IGF3YWl0IGdldEZpbGVTaGEoY29uZmlnLCBhdWRpb0ZpbGVQYXRoKTtcblxuICBjb25zdCBhdWRpb1BheWxvYWQ6IGFueSA9IHtcbiAgICBtZXNzYWdlOiBgVXBsb2FkIGF1ZGlvOiAke3RyYWNrLnRpdGxlfSAoJHt0cmFjay5pZH0pIFtTb3VuZEJveF1gLFxuICAgIGNvbnRlbnQ6IGJhc2U2NENvbnRlbnQsXG4gICAgYnJhbmNoOiBjb25maWcuYnJhbmNoIHx8IFwibWFpblwiLFxuICB9O1xuICBpZiAoZXhpc3RpbmdBdWRpb1NoYSkge1xuICAgIGF1ZGlvUGF5bG9hZC5zaGEgPSBleGlzdGluZ0F1ZGlvU2hhO1xuICB9XG5cbiAgY29uc3QgYXVkaW9SZXMgPSBhd2FpdCBmZXRjaChcbiAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHthdWRpb0ZpbGVQYXRofWAsXG4gICAge1xuICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShhdWRpb1BheWxvYWQpLFxuICAgIH1cbiAgKTtcblxuICBpZiAoIWF1ZGlvUmVzLm9rKSB7XG4gICAgY29uc3QgZXJyID0gYXdhaXQgYXVkaW9SZXMuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuICAgIHRocm93IG5ldyBFcnJvcihg6Z+z5aOw44OV44Kh44Kk44Or44GuR2l0SHVi44Ki44OD44OX44Ot44O844OJ44Gr5aSx5pWX44GX44G+44GX44GfOiAke2Vyci5tZXNzYWdlIHx8IGF1ZGlvUmVzLnN0YXR1c1RleHR9YCk7XG4gIH1cblxuICBjb25zdCByYXdBdWRpb1VybCA9IGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99LyR7Y29uZmlnLmJyYW5jaH0vJHthdWRpb0ZpbGVQYXRofWA7XG5cbiAgLy8gMi4gVXBsb2FkIEluZGl2aWR1YWwgTWV0YWRhdGEgSlNPTlxuICBvblByb2dyZXNzPy4oYOabsuaDheWgseOCkkdpdEh1YuOBuOWQjOacn+S4rSAoJHt0cmFjay5pZH0uanNvbikuLi5gKTtcbiAgY29uc3QgbWV0YWRhdGFPYmogPSB7XG4gICAgaWQ6IHRyYWNrLmlkLFxuICAgIHRpdGxlOiB0cmFjay50aXRsZSxcbiAgICBhcnRpc3Q6IHRyYWNrLmFydGlzdCB8fCBcIuS4jeaYjuOBquOCouODvOODhuOCo+OCueODiFwiLFxuICAgIGdlbnJlOiB0cmFjay5nZW5yZSB8fCBcIumCpualvVwiLFxuICAgIHlvdXR1YmVVcmw6IHRyYWNrLnlvdXR1YmVVcmwgfHwgXCJcIixcbiAgICBhZGRlZEF0OiB0cmFjay5hZGRlZEF0IHx8IERhdGUubm93KCksXG4gICAgYXVkaW9GaWxlTmFtZTogYCR7dHJhY2suaWR9Lm00YWAsXG4gICAgYXVkaW9Vcmw6IHJhd0F1ZGlvVXJsLFxuICB9O1xuXG4gIGNvbnN0IG1ldGFkYXRhSnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KG1ldGFkYXRhT2JqLCBudWxsLCAyKTtcbiAgY29uc3QgbWV0YWRhdGFCYXNlNjQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChtZXRhZGF0YUpzb25TdHIpKSk7XG5cbiAgY29uc3QgZXhpc3RpbmdNZXRhU2hhID0gYXdhaXQgZ2V0RmlsZVNoYShjb25maWcsIG1ldGFkYXRhRmlsZVBhdGgpO1xuICBjb25zdCBtZXRhUGF5bG9hZDogYW55ID0ge1xuICAgIG1lc3NhZ2U6IGBTYXZlIG1ldGFkYXRhOiAke3RyYWNrLnRpdGxlfSBbU291bmRCb3hdYCxcbiAgICBjb250ZW50OiBtZXRhZGF0YUJhc2U2NCxcbiAgICBicmFuY2g6IGNvbmZpZy5icmFuY2ggfHwgXCJtYWluXCIsXG4gIH07XG4gIGlmIChleGlzdGluZ01ldGFTaGEpIHtcbiAgICBtZXRhUGF5bG9hZC5zaGEgPSBleGlzdGluZ01ldGFTaGE7XG4gIH1cblxuICBjb25zdCBtZXRhUmVzID0gYXdhaXQgZmV0Y2goXG4gICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7bWV0YWRhdGFGaWxlUGF0aH1gLFxuICAgIHtcbiAgICAgIG1ldGhvZDogXCJQVVRcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkobWV0YVBheWxvYWQpLFxuICAgIH1cbiAgKTtcblxuICBpZiAoIW1ldGFSZXMub2spIHtcbiAgICBjb25zdCBlcnIgPSBhd2FpdCBtZXRhUmVzLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYOabsuaDheWgseOBrkdpdEh1YuOCouODg+ODl+ODreODvOODieOBq+WkseaVl+OBl+OBvuOBl+OBnzogJHtlcnIubWVzc2FnZSB8fCBtZXRhUmVzLnN0YXR1c1RleHR9YCk7XG4gIH1cblxuICAvLyAzLiBVcGRhdGUgbWFzdGVyIGluZGV4IGZpbGUgdHJhY2tzLmpzb25cbiAgdHJ5IHtcbiAgICBvblByb2dyZXNzPy4oXCLjg57jgrnjgr/jg7zjgqTjg7Pjg4fjg4Pjgq/jgrkgKHRyYWNrcy5qc29uKSDjgpLmm7TmlrDkuK0uLi5cIik7XG4gICAgYXdhaXQgdXBkYXRlR2l0SHViTWFzdGVySW5kZXgoY29uZmlnLCBpbmRleEZpbGVQYXRoLCBtZXRhZGF0YU9iaik7XG4gIH0gY2F0Y2ggKGluZGV4RXJyKSB7XG4gICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHVwZGF0ZSBtYXN0ZXIgdHJhY2tzLmpzb24gaW5kZXggZmlsZTpcIiwgaW5kZXhFcnIpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWNjZXNzOiB0cnVlLFxuICAgIHJhd0F1ZGlvVXJsLFxuICAgIG1lc3NhZ2U6IGBHaXRIdWLjgavmm7LjgIwke3RyYWNrLnRpdGxlfeOAjeOCkuato+W4uOOBq+WQjOacn+ODu+S/neeuoeOBl+OBvuOBl+OBn++8gWAsXG4gIH07XG59XG5cbi8qKlxuIEhlbHBlciB0byBrZWVwIHRyYWNrcy5qc29uIGluZGV4IHVwZGF0ZWRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0SHViTWFzdGVySW5kZXgoXG4gIGNvbmZpZzogR2l0SHViQ29uZmlnLFxuICBpbmRleEZpbGVQYXRoOiBzdHJpbmcsXG4gIG5ld1RyYWNrTWV0YTogYW55XG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IGV4aXN0aW5nVHJhY2tzOiBhbnlbXSA9IFtdO1xuICBsZXQgZXhpc3RpbmdJbmRleFNoYTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBpbmRleFJlcyA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7aW5kZXhGaWxlUGF0aH0/cmVmPSR7Y29uZmlnLmJyYW5jaH1gLFxuICAgICAge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoaW5kZXhSZXMub2spIHtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBpbmRleFJlcy5qc29uKCk7XG4gICAgICBleGlzdGluZ0luZGV4U2hhID0gZGF0YS5zaGE7XG4gICAgICBjb25zdCBjb250ZW50VXRmOCA9IGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYXRvYihkYXRhLmNvbnRlbnQucmVwbGFjZSgvXFxuL2csIFwiXCIpKSkpO1xuICAgICAgZXhpc3RpbmdUcmFja3MgPSBKU09OLnBhcnNlKGNvbnRlbnRVdGY4KTtcbiAgICB9XG4gIH0gY2F0Y2ggKF8pIHt9XG5cbiAgLy8gRmlsdGVyIG91dCBkdXBsaWNhdGUgSUQgaWYgcHJlc2VudCwgdGhlbiBhZGQgbmV3IHRyYWNrIG1ldGFkYXRhXG4gIGNvbnN0IHVwZGF0ZWRUcmFja3MgPSBleGlzdGluZ1RyYWNrcy5maWx0ZXIoKHQpID0+IHQuaWQgIT09IG5ld1RyYWNrTWV0YS5pZCk7XG4gIHVwZGF0ZWRUcmFja3MudW5zaGlmdChuZXdUcmFja01ldGEpO1xuXG4gIGNvbnN0IGluZGV4SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KHVwZGF0ZWRUcmFja3MsIG51bGwsIDIpO1xuICBjb25zdCBpbmRleEJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGluZGV4SnNvblN0cikpKTtcblxuICBjb25zdCBwYXlsb2FkOiBhbnkgPSB7XG4gICAgbWVzc2FnZTogYFVwZGF0ZSB0cmFjayBpbmRleDogJHtuZXdUcmFja01ldGEudGl0bGV9IFtTb3VuZEJveF1gLFxuICAgIGNvbnRlbnQ6IGluZGV4QmFzZTY0LFxuICAgIGJyYW5jaDogY29uZmlnLmJyYW5jaCB8fCBcIm1haW5cIixcbiAgfTtcbiAgaWYgKGV4aXN0aW5nSW5kZXhTaGEpIHtcbiAgICBwYXlsb2FkLnNoYSA9IGV4aXN0aW5nSW5kZXhTaGE7XG4gIH1cblxuICBhd2FpdCBmZXRjaChcbiAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHtpbmRleEZpbGVQYXRofWAsXG4gICAge1xuICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcbiAgICB9XG4gICk7XG59XG5cbi8qKlxuIEZldGNoIGFsbCB0cmFjayBtZXRhZGF0YSBmcm9tIEdpdEh1YiByZXBvc2l0b3J5XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFRyYWNrc0Zyb21HaXRIdWIoXG4gIGNvbmZpZzogR2l0SHViQ29uZmlnLFxuICBvblByb2dyZXNzPzogKG1zZzogc3RyaW5nKSA9PiB2b2lkXG4pOiBQcm9taXNlPEFycmF5PHsgbWV0YTogYW55OyBhdWRpb0Jsb2JVcmw/OiBzdHJpbmcgfT4+IHtcbiAgaWYgKCFpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YuioreWumuOBjOW/heimgeOBp+OBmeOAglwiKTtcbiAgfVxuXG4gIGNvbnN0IHByaW1hcnlGb2xkZXIgPSBjbGVhbkZvbGRlcihjb25maWcuZm9sZGVyKTtcbiAgY29uc3QgY2FuZGlkYXRlRm9sZGVycyA9IEFycmF5LmZyb20obmV3IFNldChbcHJpbWFyeUZvbGRlciwgXCJhdWRpb1wiLCBcInRyYWNrc1wiXSkpO1xuXG4gIGZvciAoY29uc3QgZm9sZGVyIG9mIGNhbmRpZGF0ZUZvbGRlcnMpIHtcbiAgICBjb25zdCBpbmRleEZpbGVQYXRoID0gYCR7Zm9sZGVyfS90cmFja3MuanNvbmA7XG5cbiAgICBvblByb2dyZXNzPy4oYEdpdEh1YuODquODneOCuOODiOODqiAoJHtmb2xkZXJ9Lykg44GL44KJ44Kk44Oz44OH44OD44Kv44K544KS5Y+W5b6X5LitLi4uYCk7XG5cbiAgICAvLyAxLiBUcnkgcmVhZGluZyB0cmFja3MuanNvbiBmaXJzdFxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7aW5kZXhGaWxlUGF0aH0/cmVmPSR7Y29uZmlnLmJyYW5jaH1gLFxuICAgICAgICB7XG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yi52Mytqc29uXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgY29uc3QgY29udGVudFV0ZjggPSBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IoZGF0YS5jb250ZW50LnJlcGxhY2UoL1xcbi9nLCBcIlwiKSkpKTtcbiAgICAgICAgY29uc3QgdHJhY2tMaXN0ID0gSlNPTi5wYXJzZShjb250ZW50VXRmOCkgYXMgYW55W107XG4gICAgICAgIGlmICh0cmFja0xpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJldHVybiB0cmFja0xpc3QubWFwKChtZXRhKSA9PiAoe1xuICAgICAgICAgICAgbWV0YSxcbiAgICAgICAgICAgIGF1ZGlvQmxvYlVybDogbWV0YS5hdWRpb1VybCB8fCBgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS8ke2NvbmZpZy5icmFuY2h9LyR7Zm9sZGVyfS8ke21ldGEuaWR9Lm00YWAsXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKGB0cmFja3MuanNvbiBub3QgZm91bmQgaW4gJHtmb2xkZXJ9LywgdHJ5aW5nIGRpcmVjdG9yeSBzY2FuLi4uYCwgZSk7XG4gICAgfVxuXG4gICAgLy8gMi4gRGlyZWN0b3J5IHNjYW4gZmFsbGJhY2tcbiAgICBvblByb2dyZXNzPy4oYOODleOCqeODq+ODgCAoJHtmb2xkZXJ9Lykg5YaF44Gu44OV44Kh44Kk44Or5LiA6Kan44KS5Y+W5b6X5LitLi4uYCk7XG4gICAgY29uc3QgZGlyUmVzID0gYXdhaXQgZmV0Y2goXG4gICAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHtmb2xkZXJ9P3JlZj0ke2NvbmZpZy5icmFuY2h9YCxcbiAgICAgIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGRpclJlcy5vaykge1xuICAgICAgY29uc3QgaXRlbXMgPSAoYXdhaXQgZGlyUmVzLmpzb24oKSkgYXMgYW55W107XG4gICAgICBjb25zdCBqc29uRmlsZXMgPSBpdGVtcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0ubmFtZS5lbmRzV2l0aChcIi5qc29uXCIpICYmIGl0ZW0ubmFtZSAhPT0gXCJ0cmFja3MuanNvblwiKTtcblxuICAgICAgaWYgKGpzb25GaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PHsgbWV0YTogYW55OyBhdWRpb0Jsb2JVcmw/OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YganNvbkZpbGVzKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZXMgPSBhd2FpdCBmZXRjaChmaWxlLmRvd25sb2FkX3VybCB8fCBmaWxlLnVybCwge1xuICAgICAgICAgICAgICBoZWFkZXJzOiBjb25maWcucGF0ID8geyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCB9IDoge30sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChmaWxlUmVzLm9rKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBhd2FpdCBmaWxlUmVzLmpzb24oKTtcbiAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBtZXRhLFxuICAgICAgICAgICAgICAgIGF1ZGlvQmxvYlVybDogbWV0YS5hdWRpb1VybCB8fCBgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS8ke2NvbmZpZy5icmFuY2h9LyR7Zm9sZGVyfS8ke21ldGEuaWR9Lm00YWAsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gW107XG59XG5cbi8qKlxuIERlbGV0ZSBhIHRyYWNrIGZyb20gR2l0SHViIHJlcG9zaXRvcnkgKC5tNGEsIC5qc29uLCBhbmQgdXBkYXRlIGluZGV4KVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlVHJhY2tGcm9tR2l0SHViKFxuICB0cmFja0lkOiBzdHJpbmcsXG4gIGNvbmZpZzogR2l0SHViQ29uZmlnLFxuICBvblByb2dyZXNzPzogKG1zZzogc3RyaW5nKSA9PiB2b2lkXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFpc0dpdEh1YkNvbmZpZ3VyZWQoY29uZmlnKSkgcmV0dXJuO1xuXG4gIGNvbnN0IGZvbGRlciA9IGNsZWFuRm9sZGVyKGNvbmZpZy5mb2xkZXIpO1xuICBjb25zdCBhdWRpb0ZpbGVQYXRoID0gYCR7Zm9sZGVyfS8ke3RyYWNrSWR9Lm00YWA7XG4gIGNvbnN0IG1ldGFkYXRhRmlsZVBhdGggPSBgJHtmb2xkZXJ9LyR7dHJhY2tJZH0uanNvbmA7XG4gIGNvbnN0IGluZGV4RmlsZVBhdGggPSBgJHtmb2xkZXJ9L3RyYWNrcy5qc29uYDtcblxuICBvblByb2dyZXNzPy4oXCJHaXRIdWLkuIrjga7pn7Plo7Djg5XjgqHjgqTjg6vmg4XloLHjgpLnorroqo3kuK0uLi5cIik7XG5cbiAgLy8gRGVsZXRlIGF1ZGlvIGZpbGVcbiAgY29uc3QgYXVkaW9TaGEgPSBhd2FpdCBnZXRGaWxlU2hhKGNvbmZpZywgYXVkaW9GaWxlUGF0aCk7XG4gIGlmIChhdWRpb1NoYSkge1xuICAgIG9uUHJvZ3Jlc3M/LihcIkdpdEh1YuS4iuOBrumfs+WjsOODleOCoeOCpOODqyAoLm00YSkg44KS5YmK6Zmk5LitLi4uXCIpO1xuICAgIGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS9jb250ZW50cy8ke2F1ZGlvRmlsZVBhdGh9YCwge1xuICAgICAgbWV0aG9kOiBcIkRFTEVURVwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtZXNzYWdlOiBgRGVsZXRlIGF1ZGlvIHRyYWNrICR7dHJhY2tJZH0gW1NvdW5kQm94XWAsXG4gICAgICAgIHNoYTogYXVkaW9TaGEsXG4gICAgICAgIGJyYW5jaDogY29uZmlnLmJyYW5jaCB8fCBcIm1haW5cIixcbiAgICAgIH0pLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gRGVsZXRlIGpzb24gbWV0YWRhdGFcbiAgY29uc3QgbWV0YVNoYSA9IGF3YWl0IGdldEZpbGVTaGEoY29uZmlnLCBtZXRhZGF0YUZpbGVQYXRoKTtcbiAgaWYgKG1ldGFTaGEpIHtcbiAgICBvblByb2dyZXNzPy4oXCJHaXRIdWLkuIrjga7mg4XloLHjg5XjgqHjgqTjg6sgKC5qc29uKSDjgpLliYrpmaTkuK0uLi5cIik7XG4gICAgYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb25maWcub3duZXJ9LyR7Y29uZmlnLnJlcG99L2NvbnRlbnRzLyR7bWV0YWRhdGFGaWxlUGF0aH1gLCB7XG4gICAgICBtZXRob2Q6IFwiREVMRVRFXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtjb25maWcucGF0LnRyaW0oKX1gLFxuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2U6IGBEZWxldGUgdHJhY2sgbWV0YWRhdGEgJHt0cmFja0lkfSBbU291bmRCb3hdYCxcbiAgICAgICAgc2hhOiBtZXRhU2hhLFxuICAgICAgICBicmFuY2g6IGNvbmZpZy5icmFuY2ggfHwgXCJtYWluXCIsXG4gICAgICB9KSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSBtYXN0ZXIgaW5kZXggdHJhY2tzLmpzb25cbiAgdHJ5IHtcbiAgICBvblByb2dyZXNzPy4oXCJHaXRIdWLjgqTjg7Pjg4fjg4Pjgq/jgrkgKHRyYWNrcy5qc29uKSDjgYvjgonliYrpmaTkuK0uLi5cIik7XG4gICAgY29uc3QgaW5kZXhTaGEgPSBhd2FpdCBnZXRGaWxlU2hhKGNvbmZpZywgaW5kZXhGaWxlUGF0aCk7XG4gICAgaWYgKGluZGV4U2hhKSB7XG4gICAgICBjb25zdCBpbmRleFJlcyA9IGF3YWl0IGZldGNoKFxuICAgICAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke2NvbmZpZy5vd25lcn0vJHtjb25maWcucmVwb30vY29udGVudHMvJHtpbmRleEZpbGVQYXRofT9yZWY9JHtjb25maWcuYnJhbmNofWAsXG4gICAgICAgIHtcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICApO1xuICAgICAgaWYgKGluZGV4UmVzLm9rKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBpbmRleFJlcy5qc29uKCk7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRVdGY4ID0gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShhdG9iKGRhdGEuY29udGVudC5yZXBsYWNlKC9cXG4vZywgXCJcIikpKSk7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nVHJhY2tzID0gSlNPTi5wYXJzZShjb250ZW50VXRmOCkgYXMgYW55W107XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gZXhpc3RpbmdUcmFja3MuZmlsdGVyKCh0KSA9PiB0LmlkICE9PSB0cmFja0lkKTtcblxuICAgICAgICBjb25zdCBpbmRleEpzb25TdHIgPSBKU09OLnN0cmluZ2lmeShmaWx0ZXJlZCwgbnVsbCwgMik7XG4gICAgICAgIGNvbnN0IGluZGV4QmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoaW5kZXhKc29uU3RyKSkpO1xuXG4gICAgICAgIGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke2NvbmZpZy5yZXBvfS9jb250ZW50cy8ke2luZGV4RmlsZVBhdGh9YCwge1xuICAgICAgICAgIG1ldGhvZDogXCJQVVRcIixcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Y29uZmlnLnBhdC50cmltKCl9YCxcbiAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgbWVzc2FnZTogYFJlbW92ZSB0cmFjayAke3RyYWNrSWR9IGZyb20gaW5kZXggW1NvdW5kQm94XWAsXG4gICAgICAgICAgICBjb250ZW50OiBpbmRleEJhc2U2NCxcbiAgICAgICAgICAgIHNoYTogZGF0YS5zaGEsXG4gICAgICAgICAgICBicmFuY2g6IGNvbmZpZy5icmFuY2ggfHwgXCJtYWluXCIsXG4gICAgICAgICAgfSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byB1cGRhdGUgdHJhY2tzLmpzb24gb24gZGVsZXRlOlwiLCBlKTtcbiAgfVxufVxuXG4vKipcbiAgVXBsb2FkIGZ1bGwgYXBwbGljYXRpb24gc291cmNlIGNvZGUgdG8gYSBkZXNpZ25hdGVkIEdpdEh1YiByZXBvc2l0b3J5IChlLmcuIE1QMy1FeHRyYWN0b3ItUGxheWVyKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkU291cmNlQ29kZVRvR2l0SHViKFxuICBmaWxlc01hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgY29uZmlnOiBHaXRIdWJDb25maWcsXG4gIG9uUHJvZ3Jlc3M/OiAobXNnOiBzdHJpbmcpID0+IHZvaWQsXG4gIHRhcmdldFJlcG8/OiBzdHJpbmdcbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICBpZiAoIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHVi6Kit5a6a44GM5b+F6KaB44Gn44GZ44CCXCIpO1xuICB9XG5cbiAgY29uc3QgcmVwb1RvVXNlID0gdGFyZ2V0UmVwbyB8fCBcIk1QMy1FeHRyYWN0b3ItUGxheWVyXCI7XG4gIGNvbnN0IGZpbGVFbnRyaWVzID0gT2JqZWN0LmVudHJpZXMoZmlsZXNNYXApO1xuICBsZXQgdXBkYXRlZENvdW50ID0gMDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGVFbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgW3BhdGgsIGNvbnRlbnRdID0gZmlsZUVudHJpZXNbaV07XG4gICAgb25Qcm9ncmVzcz8uKGBbJHtpICsgMX0vJHtmaWxlRW50cmllcy5sZW5ndGh9XSDjgIwke3BhdGh944CN44KSR2l0SHVi44G444Kz44Of44OD44OI5LitLi4uYCk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZXhpc3RpbmdTaGEgPSBhd2FpdCBnZXRGaWxlU2hhKGNvbmZpZywgcGF0aCwgcmVwb1RvVXNlKTtcbiAgICAgIGNvbnN0IGJhc2U2NENvbnRlbnQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChjb250ZW50KSkpO1xuXG4gICAgICBjb25zdCBwYXlsb2FkOiBhbnkgPSB7XG4gICAgICAgIG1lc3NhZ2U6IGBVcGRhdGUgJHtwYXRofSB2aWEgU291bmRCb3ggQ2xvdWQgU3luY2AsXG4gICAgICAgIGNvbnRlbnQ6IGJhc2U2NENvbnRlbnQsXG4gICAgICAgIGJyYW5jaDogY29uZmlnLmJyYW5jaCB8fCBcIm1haW5cIixcbiAgICAgIH07XG4gICAgICBpZiAoZXhpc3RpbmdTaGEpIHtcbiAgICAgICAgcGF5bG9hZC5zaGEgPSBleGlzdGluZ1NoYTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXG4gICAgICAgIGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29uZmlnLm93bmVyfS8ke3JlcG9Ub1VzZX0vY29udGVudHMvJHtwYXRofWAsXG4gICAgICAgIHtcbiAgICAgICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2NvbmZpZy5wYXQudHJpbSgpfWAsXG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICBjb25zdCBlcnIgPSBhd2FpdCByZXMuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuICAgICAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byBwdXNoICR7cGF0aH06YCwgZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZWRDb3VudCsrO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS53YXJuKGBFcnJvciBwdXNoaW5nICR7cGF0aH06YCwgZXJyKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgbWVzc2FnZTogYOaXouWtmOODquODneOCuOODiOODqiAoJHtjb25maWcub3duZXJ9LyR7cmVwb1RvVXNlfSkg44G444Ki44OX44Oq44K944O844K544Kz44O844OJICgke3VwZGF0ZWRDb3VudH3jg5XjgqHjgqTjg6spIOOCkuebtOaOpeWQjOacn+ODu+OCs+ODn+ODg+ODiOOBl+OBvuOBl+OBn++8gWAsXG4gIH07XG59XG5cbiJdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxvQkFBb0I7QUFFbkIsYUFBTSx3QkFBc0M7QUFBQSxFQUNqRCxLQUFLO0FBQUEsRUFDTCxPQUFPO0FBQUEsRUFDUCxNQUFNO0FBQUEsRUFDTixRQUFRO0FBQUEsRUFDUixRQUFRO0FBQUEsRUFDUixVQUFVO0FBQ1o7QUFFTyxnQkFBUyxrQkFBZ0M7QUFDOUMsTUFBSTtBQUNGLFVBQU0sUUFBUSxhQUFhLFFBQVEsaUJBQWlCO0FBQ3BELFFBQUksT0FBTztBQUNULGFBQU8sRUFBRSxHQUFHLHVCQUF1QixHQUFHLEtBQUssTUFBTSxLQUFLLEVBQUU7QUFBQSxJQUMxRDtBQUFBLEVBQ0YsU0FBUyxHQUFHO0FBQ1YsWUFBUSxNQUFNLG9EQUFvRCxDQUFDO0FBQUEsRUFDckU7QUFDQSxTQUFPO0FBQ1Q7QUFFTyxnQkFBUyxpQkFBaUIsUUFBNEI7QUFDM0QsTUFBSTtBQUNGLGlCQUFhLFFBQVEsbUJBQW1CLEtBQUssVUFBVSxNQUFNLENBQUM7QUFBQSxFQUNoRSxTQUFTLEdBQUc7QUFDVixZQUFRLE1BQU0s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