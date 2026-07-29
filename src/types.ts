export interface Track {
  id: string;
  title: string;
  artist?: string;
  youtubeUrl?: string;
  blob: Blob;
  addedAt: number;
  genre?: "邦楽" | "洋楽";
}

export enum AppMode {
  Extract = "extract",
  Play = "play"
}
