import { Track } from "../types";
import { saveTrack, getTracks } from "./db";

export interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  branch: string;
  folderPath?: string;
}

export interface RemoteTrackMetadata {
  id: string;
  title: string;
  artist?: string;
  youtubeUrl?: string;
  addedAt: number;
  genre?: "邦楽" | "洋楽";
  fileName: string;
}

export interface GitHubMetadataFile {
  version: number;
  updatedAt: number;
  app: string;
  tracks: RemoteTrackMetadata[];
}

const CONFIG_STORAGE_KEY = "soundbox_github_config";

export function getFolderPath(config: GitHubConfig): string {
  const folder = (config.folderPath || "tracks").trim().replace(/^\/+|\/+$/g, "");
  return folder ? folder : "tracks";
}

export function getGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.pat && parsed.owner && parsed.repo) {
      return {
        pat: parsed.pat.trim(),
        owner: parsed.owner.trim(),
        repo: parsed.repo.trim(),
        branch: (parsed.branch || "main").trim(),
        folderPath: (parsed.folderPath || "tracks").trim(),
      };
    }
  } catch (e) {
    console.error("Failed to read GitHub config from localStorage:", e);
  }
  return null;
}

export function saveGitHubConfig(config: GitHubConfig): void {
  const cleanConfig: GitHubConfig = {
    pat: config.pat.trim(),
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    branch: (config.branch || "main").trim(),
    folderPath: (config.folderPath || "tracks").trim(),
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cleanConfig));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

/**
  * Test connection to GitHub repository
  */
export async function testGitHubConnection(config: GitHubConfig): Promise<{
  success: boolean;
  message: string;
  userLogin?: string;
  repoFullName?: string;
}> {
  if (!config.pat || !config.owner || !config.repo) {
    return { success: false, message: "PAT、ユーザー名、リポジトリ名をすべて入力してください。" };
  }

  try {
    // 1. Check user/token validity
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${config.pat}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, message: "認証失敗: PAT(Personal Access Token)が無効または期限切れです。" };
      }
      return { success: false, message: `GitHub APIエラー (${userRes.status}): 認証を確認できませんでした。` };
    }

    const userData = await userRes.json();
    const userLogin = userData.login;

    // 2. Check repo & branch access
    const repoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return {
          success: false,
          message: `リポジトリが見つかりません: ${config.owner}/${config.repo} (リポジトリ名・Owner・PATの権限を確認してください)`,
        };
      }
      return { success: false, message: `リポジトリ確認エラー (${repoRes.status})` };
    }

    const repoData = await repoRes.ok ? await repoRes.json() : null;

    // 3. Check branch presence
    const branchRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/branches/${encodeURIComponent(config.branch || "main")}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!branchRes.ok && branchRes.status === 404) {
      return {
        success: false,
        message: `ブランチ「${config.branch || "main"}」が存在しません。GitHub上で作成するか、既存のブランチ名を指定してください。`,
      };
    }

    return {
      success: true,
      message: `接続成功！ GitHubユーザー: @${userLogin} / リポジトリ: ${config.owner}/${config.repo} (${config.branch || "main"})`,
      userLogin,
      repoFullName: repoData?.full_name || `${config.owner}/${config.repo}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "通信エラーが発生しました: " + (err.message || "ネットワーク状況をご確認ください"),
    };
  }
}

/**
 * Get file SHA if it exists in repository
 */
async function getFileSha(config: GitHubConfig, path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}?ref=${encodeURIComponent(config.branch || "main")}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.sha || null;
    }
  } catch (e) {
    console.warn(`Failed to check SHA for ${path}:`, e);
  }
  return null;
}

/**
 * Convert Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("音声ファイルのBase64変換に失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Safe filename generation for GitHub path
 */
function getSanitizedFileName(track: Track): string {
  const safeId = track.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeId}.m4a`;
}

/**
 * Upload single track file to GitHub repository
 */
export async function uploadSingleTrackToGitHub(
  config: GitHubConfig,
  track: Track
): Promise<{ fileName: string }> {
  const fileName = getSanitizedFileName(track);
  const folder = getFolderPath(config);
  const filePath = `${folder}/${fileName}`;

  // Get existing SHA if file is being overwritten
  const sha = await getFileSha(config, filePath);

  const base64Content = await blobToBase64(track.blob);

  const body: any = {
    message: `[SoundBox] Upload audio track: ${track.title}`,
    content: base64Content,
    branch: config.branch || "main",
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(
      `GitHubアップロード失敗 (${res.status}): ${errJson.message || "音声ファイルのコミットに失敗しました。"}`
    );
  }

  return { fileName };
}

/**
 * Fetch remote metadata.json file from GitHub
 */
export async function fetchRemoteMetadata(config: GitHubConfig): Promise<{
  metadata: GitHubMetadataFile | null;
  sha: string | null;
}> {
  try {
    const folder = getFolderPath(config);
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${folder}/metadata.json?ref=${encodeURIComponent(config.branch || "main")}`,
      {
        headers: {
          Authorization: `Bearer ${config.pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (res.status === 404) {
      return { metadata: null, sha: null };
    }

    if (!res.ok) {
      throw new Error(`metadata.json取得エラー (${res.status})`);
    }

    const data = await res.json();
    const sha = data.sha || null;

    // Content is base64
    if (data.content) {
      const cleanBase64 = data.content.replace(/[\r\n\s]/g, "");
      const jsonStr = decodeURIComponent(escape(atob(cleanBase64)));
      const metadata = JSON.parse(jsonStr) as GitHubMetadataFile;
      return { metadata, sha };
    }
  } catch (e) {
    console.warn("Failed to parse remote metadata.json:", e);
  }
  return { metadata: null, sha: null };
}

/**
 * Update metadata.json on GitHub
 */
export async function updateRemoteMetadata(
  config: GitHubConfig,
  trackMetadatas: RemoteTrackMetadata[]
): Promise<void> {
  const { sha: existingSha } = await fetchRemoteMetadata(config);
  const folder = getFolderPath(config);

  const metadataFile: GitHubMetadataFile = {
    version: 1,
    updatedAt: Date.now(),
    app: "SoundBox",
    tracks: trackMetadatas,
  };

  const jsonStr = JSON.stringify(metadataFile, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));

  const body: any = {
    message: `[SoundBox] Update metadata.json (${trackMetadatas.length} tracks)`,
    content: base64Content,
    branch: config.branch || "main",
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${folder}/metadata.json`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(`metadata.jsonの更新に失敗しました (${res.status}): ${errJson.message || ""}`);
  }
}

/**
 * Sync (Upload) all local tracks to GitHub sequentially 1-by-1
 */
export async function syncAllTracksToGitHub(
  config: GitHubConfig,
  tracks: Track[],
  onProgress?: (current: number, total: number, currentTitle: string) => void
): Promise<{ successCount: number; totalCount: number }> {
  if (tracks.length === 0) {
    throw new Error("アップロードする曲がライブラリにありません。");
  }

  // Fetch existing remote metadata to merge
  const { metadata: existingRemoteMeta } = await fetchRemoteMetadata(config);
  const remoteTrackMap = new Map<string, RemoteTrackMetadata>();

  if (existingRemoteMeta && Array.isArray(existingRemoteMeta.tracks)) {
    for (const t of existingRemoteMeta.tracks) {
      remoteTrackMap.set(t.id, t);
    }
  }

  let successCount = 0;
  const updatedRemoteTrackMetas: RemoteTrackMetadata[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (onProgress) {
      onProgress(i + 1, tracks.length, track.title);
    }

    try {
      // Upload audio file 1-by-1
      const { fileName } = await uploadSingleTrackToGitHub(config, track);
      successCount++;

      const meta: RemoteTrackMetadata = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        youtubeUrl: track.youtubeUrl,
        addedAt: track.addedAt,
        genre: track.genre,
        fileName,
      };

      remoteTrackMap.set(track.id, meta);
    } catch (err) {
      console.error(`Failed to upload track "${track.title}":`, err);
      // Continue next track if possible, or throw if needed
    }
  }

  // Write merged metadata.json back to GitHub
  const finalMetas = Array.from(remoteTrackMap.values());
  await updateRemoteMetadata(config, finalMetas);

  return { successCount, totalCount: tracks.length };
}

/**
 * Sync single track to GitHub and update metadata.json
 */
export async function syncSingleTrackToGitHub(
  config: GitHubConfig,
  track: Track
): Promise<void> {
  const { fileName } = await uploadSingleTrackToGitHub(config, track);

  const { metadata: existingRemoteMeta } = await fetchRemoteMetadata(config);
  const remoteTrackMap = new Map<string, RemoteTrackMetadata>();

  if (existingRemoteMeta && Array.isArray(existingRemoteMeta.tracks)) {
    for (const t of existingRemoteMeta.tracks) {
      remoteTrackMap.set(t.id, t);
    }
  }

  remoteTrackMap.set(track.id, {
    id: track.id,
    title: track.title,
    artist: track.artist,
    youtubeUrl: track.youtubeUrl,
    addedAt: track.addedAt,
    genre: track.genre,
    fileName,
  });

  const finalMetas = Array.from(remoteTrackMap.values());
  await updateRemoteMetadata(config, finalMetas);
}

/**
 * Download / Restore tracks from GitHub repository to IndexedDB
 */
export async function downloadTracksFromGitHub(
  config: GitHubConfig,
  onProgress?: (current: number, total: number, currentTitle: string) => void
): Promise<{ successCount: number; totalCount: number; skippedCount: number }> {
  const { metadata: remoteMeta } = await fetchRemoteMetadata(config);

  if (!remoteMeta || !Array.isArray(remoteMeta.tracks) || remoteMeta.tracks.length === 0) {
    throw new Error(
      "GitHubリポジトリ内に同期データ (tracks/metadata.json) が見つかりませんでした。先に「GitHubへアップロード」を実行してください。"
    );
  }

  const remoteTracks = remoteMeta.tracks;
  const localTracks = await getTracks();
  const localTrackMap = new Map<string, Track>(localTracks.map((t) => [t.id, t]));

  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < remoteTracks.length; i++) {
    const remoteTrack = remoteTracks[i];
    if (onProgress) {
      onProgress(i + 1, remoteTracks.length, remoteTrack.title);
    }

    const folder = getFolderPath(config);
    const fileName = remoteTrack.fileName || `${remoteTrack.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.m4a`;
    const filePath = `${folder}/${fileName}`;

    try {
      // Download raw audio file directly via GitHub API
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${filePath}?ref=${encodeURIComponent(config.branch || "main")}`,
        {
          headers: {
            Authorization: `Bearer ${config.pat}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      );

      if (!res.ok) {
        console.warn(`Could not download audio file for "${remoteTrack.title}" (${res.status})`);
        continue;
      }

      const audioBuffer = await res.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: "audio/mp4" });

      const trackToSave: Track = {
        id: remoteTrack.id,
        title: remoteTrack.title,
        artist: remoteTrack.artist,
        youtubeUrl: remoteTrack.youtubeUrl,
        addedAt: remoteTrack.addedAt,
        genre: remoteTrack.genre,
        blob,
      };

      await saveTrack(trackToSave);
      successCount++;
    } catch (err) {
      console.error(`Failed to download audio for "${remoteTrack.title}":`, err);
    }
  }

  return {
    successCount,
    totalCount: remoteTracks.length,
    skippedCount,
  };
}
