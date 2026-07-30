import { Track } from "../types";

const DB_NAME = "M4AExtractorPlayerDB";
const STORE_NAME = "tracks";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", event);
      reject(new Error("Database failed to open"));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveTrack(track: Track): Promise<void> {
  const db = await initDB();

  // Safari/iOS WebKit IndexedDB handles ArrayBuffers much more reliably than raw Blobs
  let buffer: ArrayBuffer | null = null;
  const mimeType = track.blob?.type || "audio/mp4";

  try {
    if (track.blob) {
      buffer = await track.blob.arrayBuffer();
    }
  } catch (e) {
    console.warn("Failed to convert blob to arrayBuffer, falling back to raw blob", e);
  }

  const recordToStore = buffer
    ? {
        id: track.id,
        title: track.title,
        artist: track.artist,
        youtubeUrl: track.youtubeUrl,
        addedAt: track.addedAt,
        genre: track.genre,
        arrayBuffer: buffer,
        mimeType,
      }
    : track;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("IndexedDBへの書き込みタイムアウトが発生しました。再度お試しください。"));
    }, 15000);

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(recordToStore);

    transaction.oncomplete = () => {
      clearTimeout(timeout);
      resolve();
    };

    transaction.onerror = () => {
      clearTimeout(timeout);
      reject(transaction.error || request.error || new Error("Save track error"));
    };

    transaction.onabort = () => {
      clearTimeout(timeout);
      reject(transaction.error || new Error("Transaction aborted"));
    };
  });
}

export async function getTracks(): Promise<Track[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result || []) as any[];
      const tracks: Track[] = results.map((item) => {
        if (item.arrayBuffer && !item.blob) {
          const blob = new Blob([item.arrayBuffer], { type: item.mimeType || "audio/mp4" });
          const { arrayBuffer, mimeType, ...rest } = item;
          return { ...rest, blob } as Track;
        }
        return item as Track;
      });
      tracks.sort((a, b) => b.addedAt - a.addedAt);
      resolve(tracks);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateTrackMetadata(
  id: string,
  updates: { title: string; artist?: string; genre?: "邦楽" | "洋楽" }
): Promise<Track> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result as any;
      if (!item) {
        reject(new Error("Track not found"));
        return;
      }
      const updatedItem = {
        ...item,
        title: updates.title,
        artist: updates.artist,
        genre: updates.genre,
      };
      const putRequest = store.put(updatedItem);
      
      transaction.oncomplete = () => {
        let blob = updatedItem.blob;
        if (updatedItem.arrayBuffer && !blob) {
          blob = new Blob([updatedItem.arrayBuffer], { type: updatedItem.mimeType || "audio/mp4" });
        }
        const { arrayBuffer, mimeType, ...rest } = updatedItem;
        resolve({ ...rest, blob } as Track);
      };

      transaction.onerror = () => reject(transaction.error || putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function clearAllTracks(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
