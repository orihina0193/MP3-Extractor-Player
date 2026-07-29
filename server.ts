import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

const execPromise = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Helper to extract YouTube video ID and sanitize the URL
  function getYoutubeId(urlStr: string): string | null {
    const cleanUrl = urlStr.trim();
    
    // 1. Check for youtu.be
    if (cleanUrl.includes("youtu.be/")) {
      const parts = cleanUrl.split("youtu.be/");
      if (parts[1]) {
        const idPart = parts[1].split(/[?#&]/)[0];
        if (idPart.length === 11) return idPart;
      }
    }
    
    // 2. Check for watch?v= or shorts/ or live/ or embed/ or v/
    const match = cleanUrl.match(/(?:v=|shorts\/|live\/|embed\/|v\/)([^"&?\/\s]{11})/);
    if (match && match[1]) {
      return match[1];
    }
    
    // 3. Fallback regex
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const matchFallback = cleanUrl.match(regExp);
    if (matchFallback && matchFallback[2] && matchFallback[2].length === 11) {
      return matchFallback[2];
    }
    
    return null;
  }

  // Extract endpoint
  app.post("/api/extract", async (req, res) => {
    const { url, format = "mp3" } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const cleanUrl = url.trim();

    // Support Suno.com links
    if (cleanUrl.includes("suno.com")) {
      try {
        let uuid = "";

        // 1. Resolve redirect for /s/ short links
        if (cleanUrl.includes("/s/")) {
          const resolveRes = await fetch(cleanUrl, {
            method: "HEAD",
            redirect: "manual",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          const location = resolveRes.headers.get("location");
          if (location) {
            const match = location.match(/\/song\/([0-9a-fA-F-]{36})/);
            if (match) {
              uuid = match[1];
            }
          }
        } else {
          const match = cleanUrl.match(/\/song\/([0-9a-fA-F-]{36})/);
          if (match) {
            uuid = match[1];
          }
        }

        if (!uuid) {
          const matchFallback = cleanUrl.match(/([0-9a-fA-F-]{36})/);
          if (matchFallback) {
            uuid = matchFallback[1];
          }
        }

        if (!uuid) {
          return res.status(400).json({
            error: "Sunoの楽曲IDを特定できませんでした。共有リンク（https://suno.com/s/...）か、詳細リンク（https://suno.com/song/...）を入力してください。"
          });
        }

        // 2. Fetch page to extract metadata
        const songPageUrl = `https://suno.com/song/${uuid}`;
        const pageRes = await fetch(songPageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        let title = "Suno Track";
        let artist = "Suno AI";

        if (pageRes.ok) {
          const html = await pageRes.text();
          
          // og:title (e.g. <meta property="og:title" content="偏見標本室（コレクター）"/>)
          const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);

          if (ogTitleMatch) {
            title = ogTitleMatch[1];
          } else if (titleTagMatch) {
            const t = titleTagMatch[1];
            const cleanTitle = t.split(" by ")[0];
            title = cleanTitle || t;
          }

          // og:description or description (e.g. Listen and make your own on Suno. or "偏見標本室 by ...")
          const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
          if (descMatch) {
            const desc = descMatch[1];
            const artistMatch = desc.match(/by\s+([^(@|\n]+)/);
            if (artistMatch) {
              artist = artistMatch[1].trim();
            }
          } else if (titleTagMatch && titleTagMatch[1].includes(" by ")) {
            const t = titleTagMatch[1];
            const parts = t.split(" by ");
            if (parts[1]) {
              artist = parts[1].split("|")[0].trim();
            }
          }
        }

        const cdnUrl = `https://cdn1.suno.ai/${uuid}.mp3`;
        
        return res.json({
          success: true,
          title: title,
          artist: artist,
          streamUrl: `/api/proxy?url=${encodeURIComponent(cdnUrl)}`
        });

      } catch (err: any) {
        console.error("Suno Extract error:", err);
        return res.status(500).json({ error: "Sunoからの抽出中にエラーが発生しました: " + err.message });
      }
    }

    const videoId = getYoutubeId(cleanUrl);
    if (!videoId) {
      return res.status(400).json({
        error: "有効なYouTube動画、またはSunoのURLが見つかりませんでした。正しいURLを入力してください。"
      });
    }

    // Reconstruct into a absolute clean standard YouTube URL to prevent third-party pattern match errors
    const sanitizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Ensure format is valid
    const allowedFormats = ["mp3", "m4a"];
    const chosenFormat = allowedFormats.includes(format) ? format : "mp3";

    // 1. Try Local Extraction using local yt-dlp first
    try {
      console.log(`Extracting YouTube audio locally using yt-dlp for video: ${videoId}`);
      const binaryPath = path.join(process.cwd(), "yt-dlp");
      const outPath = path.join("/tmp", `yt-${videoId}.${chosenFormat}`);
      
      // Clean up previous output if any
      if (fs.existsSync(outPath)) {
        try {
          fs.unlinkSync(outPath);
        } catch (_) {}
      }

      // Execute yt-dlp to download and convert in one step, using local node for signature deciphering
      const command = `"${binaryPath}" -f bestaudio --no-playlist --js-runtimes "node:${process.execPath}" --print "TITLE:%(title)s" --print "ARTIST:%(uploader)s" --no-simulate -x --audio-format ${chosenFormat} --audio-quality 0 -o "/tmp/yt-%(id)s.%(ext)s" "${sanitizedUrl}"`;
      
      const { stdout } = await execPromise(command);
      console.log("yt-dlp execution complete. Checking output file:", outPath);

      if (fs.existsSync(outPath)) {
        // Robust regex-based parsing to extract TITLE and ARTIST prefixes safely, ignoring warning lines or carriage returns
        const titleMatch = stdout.match(/TITLE:(.+?)(?:ARTIST:|[\r\n]|$)/);
        const artistMatch = stdout.match(/ARTIST:(.+?)(?:[\r\n]|$)/);

        const displayTitle = titleMatch ? titleMatch[1].trim() : "YouTube Audio Track";
        const displayArtist = artistMatch ? artistMatch[1].trim() : "YouTube Uploader";

        return res.json({
          success: true,
          title: displayTitle,
          artist: displayArtist,
          streamUrl: `/api/stream-local?id=${videoId}&format=${chosenFormat}`
        });
      } else {
        console.warn("Local yt-dlp finished but output file not found. Falling back to external API...");
      }
    } catch (localErr: any) {
      console.warn("Local yt-dlp extraction failed, falling back to external API...", localErr.message);
    }

    // 2. Fallback to external API if local extraction failed
    try {
      const apiDomains = ["p.savenow.to", "p.lbserver.xyz"];
      let activeDomain = apiDomains[0];
      let downloadInitData: any = null;
      let initError: any = null;

      // Try domain 1, then fallback to domain 2
      for (const domain of apiDomains) {
        try {
          const initUrl = `https://${domain}/api/v2/download?url=${encodeURIComponent(sanitizedUrl)}&format=${chosenFormat}&button=1`;
          const initRes = await fetch(initUrl, { signal: AbortSignal.timeout(6000) });
          if (initRes.ok) {
            downloadInitData = await initRes.json();
            if (downloadInitData && downloadInitData.success) {
              activeDomain = domain;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`Failed to initialize download with domain ${domain}:`, err.message);
          initError = err;
        }
      }

      if (!downloadInitData || !downloadInitData.success || !downloadInitData.id) {
        return res.status(500).json({
          error: "抽出の初期化に失敗しました。URLが正しいか確認するか、しばらく経ってから再度お試しください。 " + (initError ? `(${initError.message})` : "")
        });
      }

      const { id, title: initTitle } = downloadInitData;
      const displayTitle = initTitle || "YouTube Audio Track";

      // Poll progress
      let downloadUrl = "";
      let isCompleted = false;
      const progressUrl = `https://${activeDomain}/api/progress?id=${id}`;

      // Max 35 attempts, 1.5s interval -> up to 52 seconds
      for (let attempt = 1; attempt <= 35; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          const progressRes = await fetch(progressUrl, { signal: AbortSignal.timeout(4000) });
          if (progressRes.ok) {
            const progressData: any = await progressRes.json();
            if (progressData.success === 1 && progressData.download_url) {
              downloadUrl = progressData.download_url;
              isCompleted = true;
              break;
            } else if (progressData.text && progressData.text.toLowerCase().includes("error")) {
              throw new Error(progressData.text);
            }
          }
        } catch (pollErr: any) {
          console.warn(`Polling attempt ${attempt} failed:`, pollErr.message);
        }
      }

      if (!isCompleted || !downloadUrl) {
        return res.status(504).json({
          error: "サーバー側の音声変換がタイムアウトしました。もう一度お試しください。"
        });
      }

      res.json({
        success: true,
        title: displayTitle,
        streamUrl: `/api/proxy?url=${encodeURIComponent(downloadUrl)}`
      });

    } catch (error: any) {
      console.error("Extract API error:", error);
      res.status(500).json({ error: "内部サーバーエラーが発生しました: " + error.message });
    }
  });

  // Cleanup task for old temp files (older than 1 hour)
  function cleanupTempFiles() {
    const tempDir = "/tmp";
    fs.readdir(tempDir, (err, files) => {
      if (err) return;
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      for (const file of files) {
        if (file.startsWith("yt-")) {
          const filePath = path.join(tempDir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;
            if (now - stats.mtimeMs > maxAge) {
              fs.unlink(filePath, () => {});
            }
          });
        }
      }
    });
  }

  // Run cleanup every 10 minutes
  setInterval(cleanupTempFiles, 10 * 60 * 1000);

  // Local streaming endpoint for yt-dlp files
  app.get("/api/stream-local", (req, res) => {
    const id = req.query.id as string;
    const format = (req.query.format as string) || "mp3";
    
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return res.status(400).send("Invalid ID");
    }

    const filePath = path.join("/tmp", `yt-${id}.${format}`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const contentType = format === "m4a" ? "audio/mp4" : "audio/mpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending local file:", err);
        if (!res.headersSent) {
          res.status(500).send("Error streaming media");
        }
      }
    });
  });

  // Proxy endpoint to stream audio and bypass CORS
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      const urlObj = new URL(targetUrl);
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": urlObj.origin,
        "Accept": "*/*"
      };

      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const response = await fetch(targetUrl, { headers });

      if (!response.ok) {
        console.error(`Proxy target returned status ${response.status} for URL: ${targetUrl}`);
        return res.status(response.status).send(`Target returned error: ${response.statusText}`);
      }

      // Track the expected content length if provided by the target server
      const expectedLengthStr = response.headers.get("content-length");
      const expectedLength = expectedLengthStr ? parseInt(expectedLengthStr, 10) : null;

      // Download entirely as ArrayBuffer to handle compression & chunked encoding safely
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Verify that the downloaded buffer matches the expected content size.
      // If the download was cut off prematurely, reject the truncated data.
      if (expectedLength && buffer.length < expectedLength) {
        console.error(`Proxy download incomplete for ${targetUrl}. Expected: ${expectedLength} bytes, Received: ${buffer.length} bytes.`);
        return res.status(502).send(`Incomplete download from media provider. Received only ${buffer.length} of ${expectedLength} bytes.`);
      }

      // Extract original headers for reuse
      const contentType = response.headers.get("content-type") || "audio/mp4";
      const cacheControl = response.headers.get("cache-control") || "public, max-age=31536000";
      const contentRange = response.headers.get("content-range");
      const acceptRanges = response.headers.get("accept-ranges");

      // Set robust headers
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", cacheControl);
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }
      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      }

      res.status(response.status);
      res.send(buffer);
    } catch (err: any) {
      console.error("Proxy error:", err);
      if (!res.headersSent) {
        res.status(500).send("Proxy error: " + err.message);
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
