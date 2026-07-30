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

function getHeaders(config: GitHubConfig) {
  return {
    Authorization: `Bearer ${config.pat.trim()}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

/**
 Upload single track (Audio file + Metadata JSON + Index) to GitHub Repo
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
  const branch = config.branch || "main";
  const headers = getHeaders(config);

  onProgress?.("音声データをBase64エンコード中...");
  const base64Content = await blobToBase64(track.blob);
  const rawAudioUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${branch}/${audioFilePath}`;

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

  try {
    onProgress?.(`GitHubへ超高速同期中 (${track.title})...`);

    // 1. Create Git Blob for audio (.m4a)
    const blobRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/git/blobs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: base64Content,
          encoding: "base64",
        }),
      }
    );

    if (!blobRes.ok) {
      throw new Error(`音声データのBlob生成失敗: ${blobRes.statusText}`);
    }
    const blobData = await blobRes.json();
    const audioBlobSha = blobData.sha;

    // 2. Fetch current branch ref and master index in parallel
    const [refRes, indexFetchRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/ref/heads/${branch}`, { headers }),
      fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${branch}`, { headers }),
    ]);

    let parentCommitSha: string | null = null;
    let baseTreeSha: string | null = null;

    if (refRes.ok) {
      const refData = await refRes.json();
      parentCommitSha = refData.object.sha;

      const commitRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/commits/${parentCommitSha}`,
        { headers }
      );
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree?.sha || null;
      }
    }

    let existingTracks: any[] = [];
    if (indexFetchRes.ok) {
      try {
        const indexData = await indexFetchRes.json();
        const contentUtf8 = decodeURIComponent(escape(atob(indexData.content.replace(/\n/g, ""))));
        existingTracks = JSON.parse(contentUtf8);
      } catch (_) {}
    }

    const updatedTracks = existingTracks.filter((t) => t.id !== metadataObj.id);
    updatedTracks.unshift(metadataObj);
    const indexJsonStr = JSON.stringify(updatedTracks, null, 2);
    const metadataJsonStr = JSON.stringify(metadataObj, null, 2);

    // 3. Build Tree
    const treeItems = [
      {
        path: audioFilePath,
        mode: "100644",
        type: "blob",
        sha: audioBlobSha,
      },
      {
        path: metadataFilePath,
        mode: "100644",
        type: "blob",
        content: metadataJsonStr,
      },
      {
        path: indexFilePath,
        mode: "100644",
        type: "blob",
        content: indexJsonStr,
      },
    ];

    const treePayload: any = { tree: treeItems };
    if (baseTreeSha) {
      treePayload.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(treePayload),
      }
    );

    if (!treeRes.ok) {
      throw new Error(`Gitツリー作成失敗: ${treeRes.statusText}`);
    }

    const treeData = await treeRes.json();

    // 4. Create Commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: `Save audio track: ${track.title} [SoundBox]`,
          tree: treeData.sha,
          parents: parentCommitSha ? [parentCommitSha] : [],
        }),
      }
    );

    if (!commitRes.ok) {
      throw new Error(`Gitコミット作成失敗: ${commitRes.statusText}`);
    }

    const commitData = await commitRes.json();

    // 5. Update Ref
    if (parentCommitSha) {
      await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ sha: commitData.sha, force: true }),
        }
      );
    } else {
      await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitData.sha }),
        }
      );
    }

    return {
      success: true,
      rawAudioUrl,
      message: `GitHubに曲「${track.title}」を正常に同期・保管しました！`,
    };
  } catch (err: any) {
    console.warn("Git Data API failed for track upload, using contents fallback:", err);
    return await uploadTrackContentsFallback(track, config, base64Content, rawAudioUrl, metadataObj, onProgress);
  }
}

async function uploadTrackContentsFallback(
  track: Track,
  config: GitHubConfig,
  base64Content: string,
  rawAudioUrl: string,
  metadataObj: any,
  onProgress?: (step: string) => void
): Promise<{ success: boolean; rawAudioUrl: string; message: string }> {
  const folder = cleanFolder(config.folder);
  const audioFilePath = `${folder}/${track.id}.m4a`;
  const metadataFilePath = `${folder}/${track.id}.json`;
  const indexFilePath = `${folder}/tracks.json`;
  const headers = getHeaders(config);

  onProgress?.(`GitHubへ代替同期中 (${track.id}.m4a)...`);

  const [existingAudioSha, existingMetaSha] = await Promise.all([
    getFileSha(config, audioFilePath),
    getFileSha(config, metadataFilePath),
  ]);

  const audioPayload: any = {
    message: `Upload audio: ${track.title} (${track.id}) [SoundBox]`,
    content: base64Content,
    branch: config.branch || "main",
  };
  if (existingAudioSha) audioPayload.sha = existingAudioSha;

  const audioRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${audioFilePath}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(audioPayload),
    }
  );

  if (!audioRes.ok) {
    const err = await audioRes.json().catch(() => ({}));
    throw new Error(`音声ファイルのGitHubアップロードに失敗しました: ${err.message || audioRes.statusText}`);
  }

  const metadataJsonStr = JSON.stringify(metadataObj, null, 2);
  const metadataBase64 = btoa(unescape(encodeURIComponent(metadataJsonStr)));

  const metaPayload: any = {
    message: `Save metadata: ${track.title} [SoundBox]`,
    content: metadataBase64,
    branch: config.branch || "main",
  };
  if (existingMetaSha) metaPayload.sha = existingMetaSha;

  await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${metadataFilePath}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(metaPayload),
    }
  );

  try {
    await updateGitHubMasterIndex(config, indexFilePath, metadataObj);
  } catch (_) {}

  return {
    success: true,
    rawAudioUrl,
    message: `GitHubに曲「${track.title}」を保存しました！`,
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
 Fetch all track metadata from GitHub repository
 */
export async function fetchTracksFromGitHub(
  config: GitHubConfig,
  onProgress?: (msg: string) => void
): Promise<Array<{ meta: any; audioBlobUrl?: string }>> {
  if (!isGitHubConfigured(config)) {
    throw new Error("GitHub設定が必要です。");
  }

  const primaryFolder = cleanFolder(config.folder);
  const candidateFolders = Array.from(new Set([primaryFolder, "audio", "tracks"]));

  for (const folder of candidateFolders) {
    const indexFilePath = `${folder}/tracks.json`;

    onProgress?.(`GitHubリポジトリ (${folder}/) からインデックスを取得中...`);

    // 1. Try reading tracks.json first
    try {
      const res = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexFilePath}?ref=${config.branch}`,
        {
          headers: {
            Authorization: `Bearer ${config.pat.trim()}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const contentUtf8 = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
        const trackList = JSON.parse(contentUtf8) as any[];
        if (trackList.length > 0) {
          return trackList.map((meta) => ({
            meta,
            audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`,
          }));
        }
      }
    } catch (e) {
      console.warn(`tracks.json not found in ${folder}/, trying directory scan...`, e);
    }

    // 2. Directory scan fallback
    onProgress?.(`フォルダ (${folder}/) 内のファイル一覧を取得中...`);
    const dirRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${folder}?ref=${config.branch}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat.trim()}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (dirRes.ok) {
      const items = (await dirRes.json()) as any[];
      const jsonFiles = items.filter((item) => item.name.endsWith(".json") && item.name !== "tracks.json");

      if (jsonFiles.length > 0) {
        const results: Array<{ meta: any; audioBlobUrl?: string }> = [];

        for (const file of jsonFiles) {
          try {
            const fileRes = await fetch(file.download_url || file.url, {
              headers: config.pat ? { Authorization: `Bearer ${config.pat.trim()}` } : {},
            });
            if (fileRes.ok) {
              const meta = await fileRes.json();
              results.push({
                meta,
                audioBlobUrl: meta.audioUrl || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${folder}/${meta.id}.m4a`,
              });
            }
          } catch (_) {}
        }

        if (results.length > 0) {
          return results;
        }
      }
    }
  }

  return [];
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
  Upload full application source code to a designated GitHub repository in 1 single fast commit using Git Data API
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
  const branch = config.branch || "main";
  const headers = getHeaders(config);

  onProgress?.(`リポジトリ (${config.owner}/${repoToUse}) の情報確認中...`);

  try {
    let parentCommitSha: string | null = null;
    let baseTreeSha: string | null = null;

    const refRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${repoToUse}/git/ref/heads/${branch}`,
      { headers }
    );

    if (refRes.ok) {
      const refData = await refRes.json();
      parentCommitSha = refData.object.sha;

      const commitRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${repoToUse}/git/commits/${parentCommitSha}`,
        { headers }
      );
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree?.sha || null;
      }
    }

    const filePaths = Object.keys(filesMap);
    onProgress?.(`全${filePaths.length}ファイルのツリーを一括構築中...`);

    const treeItems = Object.entries(filesMap).map(([path, content]) => ({
      path,
      mode: "100644",
      type: "blob",
      content,
    }));

    const treePayload: any = { tree: treeItems };
    if (baseTreeSha) {
      treePayload.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${repoToUse}/git/trees`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(treePayload),
      }
    );

    if (!treeRes.ok) {
      const err = await treeRes.json().catch(() => ({}));
      throw new Error(`Gitツリー作成失敗: ${err.message || treeRes.statusText}`);
    }

    const treeData = await treeRes.json();

    onProgress?.("GitHubへ1コミットで一括送信中...");
    const commitRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${repoToUse}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: `Update source code via SoundBox Cloud Sync`,
          tree: treeData.sha,
          parents: parentCommitSha ? [parentCommitSha] : [],
        }),
      }
    );

    if (!commitRes.ok) {
      const err = await commitRes.json().catch(() => ({}));
      throw new Error(`Gitコミット作成失敗: ${err.message || commitRes.statusText}`);
    }

    const commitData = await commitRes.json();

    onProgress?.("ブランチ参照を更新中...");
    if (parentCommitSha) {
      await fetch(
        `https://api.github.com/repos/${config.owner}/${repoToUse}/git/refs/heads/${branch}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ sha: commitData.sha, force: true }),
        }
      );
    } else {
      await fetch(
        `https://api.github.com/repos/${config.owner}/${repoToUse}/git/refs`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitData.sha }),
        }
      );
    }

    return {
      success: true,
      message: `既存リポジトリ (${config.owner}/${repoToUse}) へアプリソースコード (${filePaths.length}ファイル) を超高速1コミットで同期完了しました！`,
    };
  } catch (err: any) {
    console.warn("Git Data API failed for source code, using parallel fallback:", err);
    return await uploadSourceCodeFallback(filesMap, config, onProgress, repoToUse);
  }
}

async function uploadSourceCodeFallback(
  filesMap: Record<string, string>,
  config: GitHubConfig,
  onProgress?: (msg: string) => void,
  targetRepo?: string
): Promise<{ success: boolean; message: string }> {
  const repoToUse = targetRepo || "MP3-Extractor-Player";
  const fileEntries = Object.entries(filesMap);
  let updatedCount = 0;
  const chunkSize = 5;

  for (let i = 0; i < fileEntries.length; i += chunkSize) {
    const chunk = fileEntries.slice(i, i + chunkSize);
    onProgress?.(`[${i + 1}-${Math.min(i + chunkSize, fileEntries.length)}/${fileEntries.length}] ファイル並列コミット中...`);

    await Promise.all(
      chunk.map(async ([path, content]) => {
        try {
          const existingSha = await getFileSha(config, path, repoToUse);
          const base64Content = btoa(unescape(encodeURIComponent(content)));
          const payload: any = {
            message: `Update ${path} via SoundBox Cloud Sync`,
            content: base64Content,
            branch: config.branch || "main",
          };
          if (existingSha) payload.sha = existingSha;

          const res = await fetch(
            `https://api.github.com/repos/${config.owner}/${repoToUse}/contents/${path}`,
            {
              method: "PUT",
              headers: getHeaders(config),
              body: JSON.stringify(payload),
            }
          );
          if (res.ok) updatedCount++;
        } catch (_) {}
      })
    );
  }

  return {
    success: true,
    message: `リポジトリ (${config.owner}/${repoToUse}) へアプリソースコード (${updatedCount}ファイル) を同期しました！`,
  };
}

