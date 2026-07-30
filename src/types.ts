export interface Track {
  id: string;
  title: string;
  artist?: string;
  youtubeUrl?: string;
  blob: Blob;
  addedAt: number;
  genre?: "邦楽" | "洋楽";
  githubSha?: string;
  githubAudioSha?: string;
  githubUrl?: string;
  isCloudOnly?: boolean;
}

export interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  folder: string;
  branch: string;
  autoSync: boolean;
}

export enum AppMode {
  Extract = "extract",
  Play = "play"
}

