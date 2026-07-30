import { Track, GitHubConfig } from "../types";

const GITHUB_CONFIG_KEY = "soundbox_github_config_v1";

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  pat: "",
  owner: "orihina0193",
  repo: "Extractor-Player-storage",
  folder: "audio",
  branch: "main",
  autoSync: true,
};

export function getGitHubConfig(): GitHubConfig {
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

export function saveGitHubConfig(config: GitHubConfig): void {
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save GitHub config to localStorage:", e);
  }
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
}

export function isGitHubConfigured(config: GitHubConfig): boolean {
  return Boolean(config.pat.trim() && config.owner.trim() && config.repo.trim());
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function cleanFolder(folder?: string): string {
  // 保存フォルダは常に "audio" に固定
  return "audio";
}

/**
 * Fetch raw file binary blob from GitHub repository safely (supports both Public and Private repos with PAT)
 */
export async function fetchGitHubFileBlob(
  config: GitHubConfig,
  filePath: string
): Promise<Blob> {
  const cleanPath = filePath.replace(/^\/+/, "");
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}?ref=${config.branch || "main"}`;
  
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
  };
  if (config.pat && config.pat.trim()) {
    headers.Authorization = `Bearer ${config.pat.trim()}`;
  }

  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) {
      return await res.blob();
    }
  } catch (e) {
    console.warn(`API raw fetch failed for ${filePath}, trying fallback:`, e);
  }

  // Fallback to raw.githubusercontent.com (for public repos)
  const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch || "main"}/${cleanPath}`;
  const rawRes = await fetch(rawUrl);
  if (rawRes.ok) {
    return await rawRes.blob();
  }

  throw new Error(`音声ファイル「${filePath}」のダウンロードに失敗しました。PAT権限を確認してください。`);
}

/**
 * Fetch text content from GitHub repository safely
 */
export async function fetchGitHubFileText(
  config: GitHubConfig,
  filePath: string
): Promise<string> {
  const cleanPath = filePath.replace(/^\/+/, "");
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}?ref=${config.branch || "main"}`;
  
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
  };
  if (config.pat && config.pat.trim()) {
    headers.Authorization = `Bearer ${config.pat.trim()}`;
  }

  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    console.warn(`API text fetch failed for ${filePath}, trying fallback:`, e);
  }

  const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch || "main"}/${cleanPath}`;
  const rawRes = await fetch(rawUrl);
  if (rawRes.ok) {
    return await rawRes.text();
  }

  throw new Error(`情報ファイル「${filePath}」の取得に失敗しました。`);
}

/**
  Rebuild and upload master index tracks.json from a full list of track metadata
 */
export async function rebuildAndUploadMasterIndex(
  config: GitHubConfig,
  trackMetas: any[],
  onProgress?: (msg: string) => void
): Promise<void> {
  if (!isGitHubConfigured(config)) return;
  const folder = cleanFolder(config.folder);
  const indexFilePath = `${folder}/tracks.json`;

  onProgress?.("マスターインデックス (tracks.json) をGitHubへ作成・保存中...");

  const indexSha = await getFileSha(config, indexFilePath);
  const indexJsonStr = JSON.stringify(trackMetas, null, 2);
  const indexBase64 = btoa(unescape(encodeURIComponent(indexJsonStr)));

  const payload: any = {
    message: `Rebuild master track index (${trackMetas.length} tracks) [SoundBox]`,
    content: indexBase64,
    branch: config.branch || "main",
  };
  if (indexSha) {
    payload.sha = indexSha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    console.warn("Failed to update tracks.json master index:", await res.json().catch(() => ({})));
  }
}

/**
  Test GitHub connection and verify PAT/Repo access
 */
export async function testGitHubConnection(config: GitHubConfig): Promise<{ success: boolean; message: string }> {
  if (!isGitHubConfigured(config)) {
    return { success: false, message: "GitHub PAT、ユーザー名、リポジトリ名を入力してください。" };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        Accept: "application/vnd.github.v3+json",
      },
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
  } catch (e: any) {
    return { success: false, message: "ネットワークエラー: " + (e.message || e) };
  }
}

/**
 Get SHA of existing file if present on GitHub
 */
async function getFileSha(config: GitHubConfig, filePath: string, targetRepo?: string): Promise<string | null> {
  const repoName = targetRepo || config.repo;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${config.owner}/${repoName}/contents/${filePath}?ref=${config.branch}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat.trim()}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.sha || null;
    }
  } catch (_) {}
  return null;
}

/**
 Upload single track (Audio file + Metadata JSON) to GitHub Repo
 */
export async function uploadTrackToGitHub(
  track: Track,
  config: GitHubConfig,
  onProgress?: (step: string) => void
): Promise<{ success: boolean; rawAudioUrl: string; message: string }> {
  if (!isGitHubConfigured(config)) {
    throw new Error("GitHub設定が完了していません。設定画面でPATとリポジトリ情報を保存してください。");
  }

  const folder = cleanFolder(config.folder);
  const audioFilePath = `${folder}/${track.id}.m4a`;
  const metadataFilePath = `${folder}/${track.id}.json`;
  const indexFilePath = `${folder}/tracks.json`;

  onProgress?.("音声データをBase64エンコード中...");
  const base64Content = await blobToBase64(track.blob);

  // 1. Upload Audio File (.m4a)
  onProgress?.(`GitHubへ音声ファイル (${track.id}.m4a) をアップロード中...`);
  const existingAudioSha = await getFileSha(config, audioFilePath);

  const audioPayload: any = {
    message: `Upload audio: ${track.title} (${track.id}) [SoundBox]`,
    content: base64Content,
    branch: config.branch || "main",
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
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(audioPayload),
    }
  );

  if (!audioRes.ok) {
    const err = await audioRes.json().catch(() => ({}));
    throw new Error(`音声ファイルのGitHubアップロードに失敗しました: ${err.message || audioRes.statusText}`);
  }

  const rawAudioUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${audioFilePath}`;

  // 2. Upload Individual Metadata JSON
  onProgress?.(`曲情報をGitHubへ同期中 (${track.id}.json)...`);
  const metadataObj = {
    id: track.id,
    title: track.title,
    artist: track.artist || "不明なアーティスト",
    genre: track.genre || "邦楽",
    youtubeUrl: track.youtubeUrl || "",
    addedAt: track.addedAt || Date.now(),
    audioFileName: `${track.id}.m4a`,
    audioUrl: rawAudioUrl,
  };

  const metadataJsonStr = JSON.stringify(metadataObj, null, 2);
  const metadataBase64 = btoa(unescape(encodeURIComponent(metadataJsonStr)));

  const existingMetaSha = await getFileSha(config, metadataFilePath);
  const metaPayload: any = {
    message: `Save metadata: ${track.title} [SoundBox]`,
    content: metadataBase64,
    branch: config.branch || "main",
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
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(metaPayload),
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(`曲情報のGitHubアップロードに失敗しました: ${err.message || metaRes.statusText}`);
  }

  // 3. Update master index file tracks.json
  try {
    onProgress?.("マスターインデックス (tracks.json) を更新中...");
    await updateGitHubMasterIndex(config, indexFilePath, metadataObj);
  } catch (indexErr) {
    console.warn("Failed to update master tracks.json index file:", indexErr);
  }

  return {
    success: true,
    rawAudioUrl,
    message: `GitHubに曲「${track.title}」を正常に同期・保管しました！`,
  };
}

/**
 Helper to keep tracks.json index updated
 */
async function updateGitHubMasterIndex(
  config: GitHubConfig,
  indexFilePath: string,
  newTrackMeta: any
): Promise<void> {
  let existingTracks: any[] = [];
  let existingIndexSha: string | null = null;

  try {
    const indexRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${config.branch}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat.trim()}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (indexRes.ok) {
      const data = await indexRes.json();
      existingIndexSha = data.sha;
      const contentUtf8 = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      existingTracks = JSON.parse(contentUtf8);
    }
  } catch (_) {}

  // Filter out duplicate ID if present, then add new track metadata
  const updatedTracks = existingTracks.filter((t) => t.id !== newTrackMeta.id);
  updatedTracks.unshift(newTrackMeta);

  const indexJsonStr = JSON.stringify(updatedTracks, null, 2);
  const indexBase64 = btoa(unescape(encodeURIComponent(indexJsonStr)));

  const payload: any = {
    message: `Update track index: ${newTrackMeta.title} [SoundBox]`,
    content: indexBase64,
    branch: config.branch || "main",
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
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(payload),
    }
  );
}

/**
 Fetch all track metadata from GitHub repository (handles 100+ tracks and private repos safely)
 */
export async function fetchTracksFromGitHub(
  config: GitHubConfig,
  onProgress?: (msg: string) => void
): Promise<Array<{ meta: any; audioFilePath?: string; audioBlobUrl?: string }>> {
  if (!isGitHubConfigured(config)) {
    throw new Error("GitHub設定が必要です。");
  }

  const primaryFolder = cleanFolder(config.folder);
  const candidateFolders = Array.from(new Set([primaryFolder, "audio", "tracks"]));

  for (const folder of candidateFolders) {
    const trackMap = new Map<string, { meta: any; audioFilePath?: string; audioBlobUrl?: string }>();

    onProgress?.(`GitHubツリー構造をスキャン中 (${folder}/)...`);

    // 1. Git Trees API scan (retrieves ALL files recursively in 1 API call without directory pagination limits)
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch || "main"}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const tree: Array<{ path: string; type: string }> = treeData.tree || [];

        // Filter json metadata files in target folder
        const targetJsonPaths = tree
          .filter(
            (item) =>
              item.type === "blob" &&
              item.path.startsWith(`${folder}/`) &&
              item.path.endsWith(".json") &&
              !item.path.endsWith("tracks.json")
          )
          .map((item) => item.path);

        if (targetJsonPaths.length > 0) {
          onProgress?.(`GitHub上で ${targetJsonPaths.length}件の個別楽曲定義ファイル (.json) を検出！読み込み中...`);

          for (let i = 0; i < targetJsonPaths.length; i++) {
            const jsonPath = targetJsonPaths[i];
            if (i % 10 === 0 || i === targetJsonPaths.length - 1) {
              onProgress?.(`[${i + 1}/${targetJsonPaths.length}] メタデータ取得中...`);
            }
            try {
              const fileText = await fetchGitHubFileText(config, jsonPath);
              const meta = JSON.parse(fileText);
              if (meta && meta.id) {
                trackMap.set(String(meta.id), {
                  meta,
                  audioFilePath: `${folder}/${meta.id}.m4a`,
                  audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`,
                });
              }
            } catch (_) {}
          }
        }
      }
    } catch (treeErr) {
      console.warn("Git Trees API scan failed:", treeErr);
    }

    // 2. Also check tracks.json master index to complement any missing tracks
    const indexFilePath = `${folder}/tracks.json`;
    try {
      const indexText = await fetchGitHubFileText(config, indexFilePath);
      if (indexText && indexText.trim()) {
        const trackList = JSON.parse(indexText) as any[];
        if (Array.isArray(trackList)) {
          for (const meta of trackList) {
            if (meta && meta.id && !trackMap.has(String(meta.id))) {
              trackMap.set(String(meta.id), {
                meta,
                audioFilePath: `${folder}/${meta.id}.m4a`,
                audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`,
              });
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (trackMap.size > 0) {
      const resultList = Array.from(trackMap.values());
      onProgress?.(`合計 ${resultList.length}曲のデータ情報を取得完了！`);
      return resultList;
    }
  }

  return [];
}

/**
 Get list of track IDs existing in remote GitHub repository
 */
export async function getGitHubRemoteTrackIds(config: GitHubConfig): Promise<string[]> {
  if (!isGitHubConfigured(config)) return [];
  try {
    const tracks = await fetchTracksFromGitHub(config);
    return tracks.map((t) => String(t.meta?.id)).filter(Boolean);
  } catch (e) {
    console.warn("Failed to fetch remote track IDs:", e);
    return [];
  }
}

/**
 Delete a track from GitHub repository (.m4a, .json, and update index)
 */
export async function deleteTrackFromGitHub(
  trackId: string,
  config: GitHubConfig,
  onProgress?: (msg: string) => void
): Promise<void> {
  if (!isGitHubConfigured(config)) return;

  const folder = cleanFolder(config.folder);
  const audioFilePath = `${folder}/${trackId}.m4a`;
  const metadataFilePath = `${folder}/${trackId}.json`;
  const indexFilePath = `${folder}/tracks.json`;

  onProgress?.("GitHub上の音声ファイル情報を確認中...");

  // Delete audio file
  const audioSha = await getFileSha(config, audioFilePath);
  if (audioSha) {
    onProgress?.("GitHub上の音声ファイル (.m4a) を削除中...");
    await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${audioFilePath}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete audio track ${trackId} [SoundBox]`,
        sha: audioSha,
        branch: config.branch || "main",
      }),
    });
  }

  // Delete json metadata
  const metaSha = await getFileSha(config, metadataFilePath);
  if (metaSha) {
    onProgress?.("GitHub上の情報ファイル (.json) を削除中...");
    await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${metadataFilePath}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.pat.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete track metadata ${trackId} [SoundBox]`,
        sha: metaSha,
        branch: config.branch || "main",
      }),
    });
  }

  // Update master index tracks.json
  try {
    onProgress?.("GitHubインデックス (tracks.json) から削除中...");
    const indexSha = await getFileSha(config, indexFilePath);
    if (indexSha) {
      const indexRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${config.branch}`,
        {
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (indexRes.ok) {
        const data = await indexRes.json();
        const contentUtf8 = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
        const existingTracks = JSON.parse(contentUtf8) as any[];
        const filtered = existingTracks.filter((t) => t.id !== trackId);

        const indexJsonStr = JSON.stringify(filtered, null, 2);
        const indexBase64 = btoa(unescape(encodeURIComponent(indexJsonStr)));

        await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Remove track ${trackId} from index [SoundBox]`,
            content: indexBase64,
            sha: data.sha,
            branch: config.branch || "main",
          }),
        });
      }
    }
  } catch (e) {
    console.warn("Failed to update tracks.json on delete:", e);
  }
}

/**
  Upload full application source code to a designated GitHub repository (e.g. MP3-Extractor-Player)
 */
export async function uploadSourceCodeToGitHub(
  filesMap: Record<string, string>,
  config: GitHubConfig,
  onProgress?: (msg: string) => void,
  targetRepo?: string
): Promise<{ success: boolean; message: string }> {
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

      const payload: any = {
        message: `Update ${path} via SoundBox Cloud Sync`,
        content: base64Content,
        branch: config.branch || "main",
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
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify(payload),
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
    message: `既存リポジトリ (${config.owner}/${repoToUse}) へアプリソースコード (${updatedCount}ファイル) を直接同期・コミットしました！`,
  };
}

