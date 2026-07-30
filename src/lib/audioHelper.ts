/**
 * Detects the correct audio MIME type of a Blob by inspecting its magic numbers/file signature.
 * This ensures broad compatibility on platforms like iOS/macOS Safari and Chrome,
 * avoiding "Error Code 3" decode failures when a conversion service returns a different format than M4A.
 */
export async function detectMimeType(blob: Blob): Promise<string> {
  try {
    const headerSlice = blob.slice(0, 16);
    const arrayBuffer = await headerSlice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length < 4) {
      return blob.type || "audio/mp4";
    }

    // 1. MP3 (with ID3v2 tag: "ID3" (0x49, 0x44, 0x33))
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      return "audio/mpeg";
    }
    // MP3 (raw frame with sync word: 11 bits set (0xFFE0 or greater))
    if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
      return "audio/mpeg";
    }

    // 2. MP4 / M4A (contains "ftyp" (0x66, 0x74, 0x79, 0x70) at offset 4)
    if (
      bytes.length >= 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      return "audio/mp4";
    }

    // 3. WebM / MKV / EBML container (starts with EBML ID: 0x1A 0x45 0xDF 0xA3)
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      return "audio/webm";
    }

    // 4. Ogg container (starts with "OggS" (0x4F, 0x67, 0x67, 0x53))
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      return "audio/ogg";
    }

    // 5. FLAC (starts with "fLaC" (0x66, 0x4C, 0x61, 0x43))
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return "audio/flac";
    }

    // 6. WAV (RIFF 0x52 0x49 0x46 0x46 followed by WAVE 0x57 0x41 0x56 0x45 at offset 8)
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    ) {
      return "audio/wav";
    }

    // 7. AAC (ADTS frames: starts with 0xFFF (0xFF, and first 4 bits of next byte are 1111))
    if (bytes[0] === 0xFF && (bytes[1] & 0xF0) === 0xF0) {
      return "audio/aac";
    }
  } catch (error) {
    console.error("Error inspecting file signature for MIME type detection:", error);
  }

  // Fallback to the original Blob's type if it exists, otherwise default to audio/mp4
  return blob.type || "audio/mp4";
}

/**
 * Dynamically generates a silent PCM WAV Blob of specified duration.
 * This is used for background audio session keeping on iOS/Safari,
 * avoiding extremely short base64 files which loop thousands of times per second and abuse CPU/battery,
 * which triggers iOS background process suspension.
 */
export function createSilentWavBlob(durationSeconds: number = 10, sampleRate: number = 8000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8; // 2 bytes
  const byteRate = sampleRate * blockAlign; // 16000 bytes/sec
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write string bytes
  const writeString = (v: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      v.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, chunkSize, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, byteRate, true);
  /* block align */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitsPerSample, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Remaining bytes are initialized to 0 (perfect PCM signed 16-bit silence!)
  return new Blob([buffer], { type: 'audio/wav' });
}
