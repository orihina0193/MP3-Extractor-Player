import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Shuffle,
  Trash2,
  Music,
  Search,
  RotateCw,
  Calendar,
  Disc,
  ListMusic,
  Loader2,
  Edit,
  Check,
  X,
  ChevronUp,
  Github,
  UploadCloud
} from "lucide-react";
import { Track } from "../types";
import { deleteTrack, updateTrackMetadata } from "../lib/db";
import { detectMimeType, createSilentWavBlob } from "../lib/audioHelper";
import { getGitHubConfig, isGitHubConfigured, uploadTrackToGitHub } from "../lib/githubSync";
import soundBoxIcon from "../assets/images/soundbox_app_icon_flat_1783522740605.jpg";

interface PlayerProps {
  tracks: Track[];
  onRefresh: () => void;
  currentTrack: Track | null;
  onSelectTrack: (track: Track | null) => void;
}

export default function Player({ tracks, onRefresh, currentTrack, onSelectTrack }: PlayerProps) {
  // Playlist Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");

  // Tab State: "all" (全曲) | "jpop" (邦楽) | "western" (洋楽) | "artist" (アーティスト)
  const [activeTab, setActiveTab] = useState<"all" | "jpop" | "western" | "artist">("all");
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState<"none" | "single" | "queue">("none");
  const [isShuffle, setIsShuffle] = useState(false);

  // Play queue order state
  const [shuffledQueue, setShuffledQueue] = useState<string[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Editing state for track metadata
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editGenre, setEditGenre] = useState<"邦楽" | "洋楽">("邦楽");
  const [syncingTrackId, setSyncingTrackId] = useState<string | null>(null);

  const handleSingleTrackSync = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const config = getGitHubConfig();
    if (!isGitHubConfigured(config)) {
      alert("事前に画面上部の「GitHub設定」からPATとリポジトリ情報を設定してください。");
      return;
    }
    setSyncingTrackId(track.id);
    try {
      const res = await uploadTrackToGitHub(track, config);
      alert(res.message);
    } catch (err: any) {
      console.error("Single track GitHub sync error:", err);
      alert("GitHubへの1曲同期に失敗しました: " + err.message);
    } finally {
      setSyncingTrackId(null);
    }
  };

  const handleStartEdit = (track: Track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist || "");
    setEditGenre(track.genre || "邦楽");
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingTrack) return;
    if (!editTitle.trim()) {
      alert("曲名は必須です。");
      return;
    }
    try {
      const updated = await updateTrackMetadata(editingTrack.id, {
        title: editTitle.trim(),
        artist: editArtist.trim() || undefined,
        genre: editGenre,
      });
      if (currentTrack?.id === editingTrack.id) {
        onSelectTrack({ ...currentTrack, ...updated });
      }
      setEditingTrack(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("情報の更新に失敗しました。");
    }
  };
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Preload refs for smooth iOS / Safari background continuous playback (WITHOUT heavy Base64 conversion)
  const preloadedTrackIdRef = useRef<string | null>(null);
  const preloadedUrlRef = useRef<string | null>(null);
  const currentlyPreloadingTrackIdRef = useRef<string | null>(null);
  const preloadedForTrackIdRef = useRef<string | null>(null);

  // Determine active playlist based on selected tab / artist
  const activePlaylist = React.useMemo(() => {
    switch (activeTab) {
      case "jpop":
        return tracks.filter((t) => t.genre === "邦楽" || !t.genre);
      case "western":
        return tracks.filter((t) => t.genre === "洋楽");
      case "artist":
        if (selectedArtist) {
          return tracks.filter((t) => (t.artist || "不明なアーティスト") === selectedArtist);
        }
        return [];
      case "all":
      default:
        return tracks;
    }
  }, [tracks, activeTab, selectedArtist]);

  // State refs to bypass stale closures in native audio event listeners (especially for iOS background mode)
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(isPlaying);
  const loopModeRef = useRef(loopMode);
  const isShuffleRef = useRef(isShuffle);
  const activePlaylistRef = useRef(activePlaylist);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  currentTrackRef.current = currentTrack;
  isPlayingRef.current = isPlaying;
  loopModeRef.current = loopMode;
  isShuffleRef.current = isShuffle;
  activePlaylistRef.current = activePlaylist;
  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  // Filtered tracks (within active playlist) for list display & searching
  const filteredTracks = React.useMemo(() => {
    return activePlaylist.filter((track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [activePlaylist, searchQuery]);

  // Get unique list of artists with track counts
  const artistsWithCounts = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    tracks.forEach((track) => {
      const artist = track.artist || "不明なアーティスト";
      counts[artist] = (counts[artist] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tracks]);

  // Helper to get play index within the active playlist (uses loadedTrackIdRef to be resilient in background)
  const getCurrentIndex = (): number => {
    const activeTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;
    if (!activeTrackId) return -1;
    return activePlaylistRef.current.findIndex((t) => t.id === activeTrackId);
  };

  // Get next track candidate helper (uses refs to be resilient in background)
  const getNextTrack = (): Track | null => {
    const playlist = activePlaylistRef.current;
    if (playlist.length === 0) return null;

    const activeTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;

    if (isShuffleRef.current) {
      if (playlist.length > 1 && activeTrackId) {
        let nextIndex = Math.floor(Math.random() * playlist.length);
        let tries = 0;
        while (playlist[nextIndex].id === activeTrackId && tries < 10) {
          nextIndex = Math.floor(Math.random() * playlist.length);
          tries++;
        }
        return playlist[nextIndex];
      }
      const randomIndex = Math.floor(Math.random() * playlist.length);
      return playlist[randomIndex];
    }

    const currentIndex = getCurrentIndex();
    if (currentIndex === -1 || currentIndex === playlist.length - 1) {
      if (loopModeRef.current === "queue" || currentIndex === -1) {
        return playlist[0];
      }
      return null;
    } else {
      return playlist[currentIndex + 1];
    }
  };

  const cleanupPreloaded = () => {
    if (preloadedUrlRef.current) {
      if (preloadedUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(preloadedUrlRef.current);
      }
      preloadedUrlRef.current = null;
    }
    preloadedTrackIdRef.current = null;
  };

  // Preloads the next track candidate into a Blob URL (pure synchronous memory reference, no heavy Base64 conversion)
  const triggerPreloadNextTrack = async () => {
    const activeTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;
    if (!activeTrackId || !isPlayingRef.current) return;
    
    // If we already preloaded or are preloading for this track, skip
    if (preloadedForTrackIdRef.current === activeTrackId) return;
    preloadedForTrackIdRef.current = activeTrackId;

    const nextTrack = getNextTrack();
    if (!nextTrack) {
      cleanupPreloaded();
      return;
    }

    if (nextTrack.id === preloadedTrackIdRef.current) {
      return;
    }

    if (nextTrack.id === currentlyPreloadingTrackIdRef.current) {
      return;
    }

    cleanupPreloaded();

    try {
      currentlyPreloadingTrackIdRef.current = nextTrack.id;
      const targetTrackId = nextTrack.id;
      
      console.log(`Starting background preload for next track: ${nextTrack.title}`);
      const detectedType = await detectMimeType(nextTrack.blob);
      
      const currentActiveTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;
      if (preloadedForTrackIdRef.current !== currentActiveTrackId) return;

      const sanitizedBlob = new Blob([nextTrack.blob], { type: detectedType });
      const sourceUrl = URL.createObjectURL(sanitizedBlob);

      const finalActiveTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;
      if (preloadedForTrackIdRef.current === finalActiveTrackId && nextTrack.id === targetTrackId) {
        preloadedUrlRef.current = sourceUrl;
        preloadedTrackIdRef.current = nextTrack.id;
        console.log(`Successfully preloaded next track: ${nextTrack.title}`);
      } else {
        if (sourceUrl.startsWith("blob:")) {
          URL.revokeObjectURL(sourceUrl);
        }
      }
    } catch (err) {
      console.warn("Failed to preload next track", err);
      preloadedForTrackIdRef.current = null;
    } finally {
      currentlyPreloadingTrackIdRef.current = null;
    }
  };

  // Clear error when track changes
  useEffect(() => {
    setPlaybackError(null);
  }, [currentTrack]);

  // Create Audio instance once on mount and attach all native listeners permanently
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Dynamically generate a clean 10-second silent WAV file to avoid high CPU loop issues on iOS Safari
    const silentBlob = createSilentWavBlob(10);
    const silentUrl = URL.createObjectURL(silentBlob);

    const silentAudio = new Audio(silentUrl);
    silentAudio.loop = true;
    silentAudio.volume = 0.001; // Extremely low but non-zero volume keeps audio channel alive on iOS
    silentAudioRef.current = silentAudio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Trigger background preloading of next track as a fallback in the last 10 seconds of the song
      if (audio.duration > 0 && audio.duration - audio.currentTime <= 10) {
        triggerPreloadNextTrack();
      }
    };
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleTrackEnded();
    const handleError = () => {
      // If there is no active track or the source is empty/invalid, ignore the error
      if (!currentTrackRef.current || !audio.src || audio.src === window.location.href) {
        return;
      }
      // If the browser fired an error event but audio.error is null/undefined, ignore it (e.g. abort)
      if (!audio.error) {
        return;
      }
      console.error("Audio error:", audio.error);
      const errCode = audio.error.code;
      let userFriendlyMsg = "音声の再生中にエラーが発生しました。";
      if (errCode === 1) userFriendlyMsg = "音声の読み込みが中断されました。";
      if (errCode === 2) userFriendlyMsg = "通信エラーにより音声データを取得できませんでした。";
      if (errCode === 3) userFriendlyMsg = "音声データのデコードに失敗しました。ファイルが壊れているか、非対応の形式です。";
      if (errCode === 4) userFriendlyMsg = "音声ソースを読み込めませんでした。";
      setPlaybackError(`${userFriendlyMsg} (エラーコード: ${errCode || "不明"})`);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }

      if (silentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(silentUrl);
      }

      if (objectUrlRef.current) {
        if (objectUrlRef.current.startsWith("blob:")) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
      }
    };
  }, []); // Only run once on mount

  // Sync volume with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Restore audio session dynamically when app becomes active again (self-healing on app visibility)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const audio = audioRef.current;
        if (isPlaying && audio) {
          console.log("SoundBox is visible. Checking audio session health...");
          if (audio.paused || audio.muted) {
            console.log("Healed audio session on app visibility resume.");
            audio.muted = false;
            
            const currentPos = audio.currentTime;
            const currentSrc = audio.src;

            audio.play().catch((err) => {
              console.warn("Direct play restore failed, attempting session refresh:", err);
              if (currentSrc && currentSrc !== window.location.href) {
                audio.src = currentSrc;
                audio.currentTime = currentPos;
                audio.load();
                audio.play().catch(e => console.error("Interruption session restoration failed completely:", e));
              }
            });
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying]);

  // Reset preloading state on playlist/shuffle changes so that correct next track is determined when time comes
  useEffect(() => {
    cleanupPreloaded();
    preloadedForTrackIdRef.current = null;
    
    // If we are already in the last 10 seconds of the song, trigger preload immediately
    const audio = audioRef.current;
    if (audio && isPlaying && audio.duration > 0 && audio.duration - audio.currentTime <= 10) {
      triggerPreloadNextTrack();
    }
  }, [isShuffle, loopMode, activePlaylist]);

  // Handle source blob changes
  useEffect(() => {
    if (!audioRef.current) return;

    let active = true;

    if (currentTrack) {
      // Clear preloadedForTrackIdRef on track change so the new track can trigger its own preload
      preloadedForTrackIdRef.current = null;

      if (loadedTrackIdRef.current !== currentTrack.id) {
        // If we already have a preloaded source for this track, apply it synchronously to preserve iOS audio thread
        if (preloadedTrackIdRef.current === currentTrack.id && preloadedUrlRef.current) {
          console.log(`Using preloaded source for track: ${currentTrack.title}`);
          const sourceUrl = preloadedUrlRef.current;

          if (objectUrlRef.current && objectUrlRef.current !== sourceUrl) {
            if (objectUrlRef.current.startsWith("blob:")) {
              URL.revokeObjectURL(objectUrlRef.current);
            }
          }

          if (sourceUrl.startsWith("blob:")) {
            objectUrlRef.current = sourceUrl;
          } else {
            objectUrlRef.current = null;
          }

          // Consume the preloaded reference
          preloadedTrackIdRef.current = null;
          preloadedUrlRef.current = null;

          loadedTrackIdRef.current = currentTrack.id; // Mark as loaded synchronously

          audioRef.current.src = sourceUrl;
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current.load();

          if (isPlaying) {
            if (silentAudioRef.current && silentAudioRef.current.paused) {
              silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
            }
            audioRef.current.play().catch((err) => {
              console.warn("Autoplay was blocked or failed", err);
              setIsPlaying(false);
            });
          }
          setIsPreparing(false);
        } else {
          // Normal asynchronous loading for non-preloaded tracks (e.g. manual tapping)
          if (objectUrlRef.current) {
            if (objectUrlRef.current.startsWith("blob:")) {
              URL.revokeObjectURL(objectUrlRef.current);
            }
            objectUrlRef.current = null;
          }

          const loadTrack = async () => {
            try {
              setIsPreparing(true);

              if (!currentTrack.blob || currentTrack.blob.size < 1000) {
                console.warn(`Track ${currentTrack.id} has invalid blob size:`, currentTrack.blob?.size);
                if (active) {
                  setPlaybackError(
                    `「${currentTrack.title}」の音声データが破損または未取得です。(サイズ: ${currentTrack.blob?.size || 0} bytes)。\n画面下の「GitHub設定」から「🔥 ローカルを全消去してGitHubから全曲再同期」を実行してください。`
                  );
                  setIsPlaying(false);
                }
                return;
              }

              const detectedType = await detectMimeType(currentTrack.blob);
              if (!active) return;

              const sanitizedBlob = new Blob([currentTrack.blob], { type: detectedType });
              const sourceUrl = URL.createObjectURL(sanitizedBlob);
              objectUrlRef.current = sourceUrl;

              if (!active) return;
              
              if (audioRef.current) {
                loadedTrackIdRef.current = currentTrack.id; // Mark as loaded synchronously
                audioRef.current.src = sourceUrl;
                audioRef.current.volume = isMuted ? 0 : volume;
                audioRef.current.load();

                if (isPlaying) {
                  if (silentAudioRef.current && silentAudioRef.current.paused) {
                    silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
                  }
                  audioRef.current.play().catch((err) => {
                    console.warn("Autoplay was blocked or failed", err);
                    setIsPlaying(false);
                  });
                }
              }
            } catch (err) {
              console.error("Error setting up playback source:", err);
              if (active) {
                setPlaybackError("音声データの準備（デコード設定）に失敗しました。");
              }
            } finally {
              if (active) {
                setIsPreparing(false);
              }
            }
          };

          loadTrack();
        }
      } else {
        // Self-healing: If the track is already loaded but browser paused it (e.g. background suspension), resume play
        if (isPlaying && audioRef.current && audioRef.current.paused) {
          if (silentAudioRef.current && silentAudioRef.current.paused) {
            silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
          }
          audioRef.current.play().catch((err) => {
            console.warn("Autoplay was blocked or failed", err);
            setIsPlaying(false);
          });
        }
      }

      // Update Media Session metadata synchronously
      updateMediaSessionMetadata(currentTrack);

      // Setup Media Session Action handlers
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("play", () => handlePlayPause(true));
          navigator.mediaSession.setActionHandler("pause", () => handlePlayPause(false));
          navigator.mediaSession.setActionHandler("previoustrack", () => handlePrev());
          navigator.mediaSession.setActionHandler("nexttrack", () => handleNext());
          navigator.mediaSession.setActionHandler("seekbackward", (details) => {
            const offset = details.seekOffset || 10;
            if (audioRef.current) {
              audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - offset);
            }
          });
          navigator.mediaSession.setActionHandler("seekforward", (details) => {
            const offset = details.seekOffset || 10;
            if (audioRef.current) {
              audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + offset);
            }
          });
        } catch (e) {
          console.warn("Some MediaSession events not supported on this device.", e);
        }
      }

      // Start preloading the next track immediately so it is fully preloaded long before the song ends
      const preloadTimer = setTimeout(() => {
        if (active && isPlaying) {
          triggerPreloadNextTrack();
        }
      }, 1000);

      return () => {
        active = false;
        clearTimeout(preloadTimer);
      };
    } else {
      loadedTrackIdRef.current = null;
      audioRef.current.src = "";
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
    }

    return () => {
      active = false;
    };
  }, [currentTrack]);

  // Handle play/pause state change with self-healing for iOS PWA background interruptions
  const handlePlayPause = async (targetPlayState?: boolean) => {
    if (!audioRef.current || !currentTrack) return;

    const nextState = targetPlayState !== undefined ? targetPlayState : !isPlaying;

    if (nextState) {
      try {
        const audio = audioRef.current;
        
        if (silentAudioRef.current && silentAudioRef.current.paused) {
          silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
        }

        // SELF-HEALING: If iOS Safari suspended the audio channel (audio is paused but we thought we were playing),
        // or if there was an interruption, we force re-attach the source and restore current time
        // to re-establish the iOS audio session safely.
        const isSuspendedOrBroken = isPlaying && audio.paused;
        
        if (isSuspendedOrBroken && audio.src && audio.src !== window.location.href) {
          console.log("iOS Audio Session restoration triggered.");
          const currentPos = audio.currentTime;
          const currentSrc = audio.src;
          audio.src = currentSrc;
          audio.currentTime = currentPos;
          audio.load();
        }

        await audio.play();
        setIsPlaying(true);
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      } catch (err) {
        console.error("Playback failed or was blocked by iOS browser restrictions:", err);
        setIsPlaying(false);
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
      }
    } else {
      try {
        audioRef.current.pause();
        if (silentAudioRef.current) {
          silentAudioRef.current.pause();
        }
      } catch (e) {
        console.warn("Pause call failed slightly", e);
      }
      setIsPlaying(false);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  };

  // Skip forward or backward by 10s
  const skipTime = (amount: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + amount)
    );
  };

  const updateMediaSessionMetadata = (track: Track) => {
    if ("mediaSession" in navigator) {
      // Create absolute URL if soundBoxIcon is a relative path (it usually is /assets/...)
      const iconUrl = soundBoxIcon.startsWith("http") 
        ? soundBoxIcon 
        : `${window.location.origin}${soundBoxIcon.startsWith("/") ? "" : "/"}${soundBoxIcon}`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || "不明なアーティスト",
        album: "SoundBox キャッシュ曲",
        artwork: [
          {
            src: iconUrl,
            sizes: "512x512",
            type: "image/jpeg"
          }
        ]
      });
      navigator.mediaSession.playbackState = "playing";
    }
  };

  // Next Track Logic
  const handleNext = () => {
    const nextTrack = getNextTrack();
    
    if (!nextTrack) {
      setIsPlaying(false);
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
      return;
    }

    if (silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
    }

    // Synchronously update the media session metadata so the Lock Screen / Dynamic Island is instantly updated!
    updateMediaSessionMetadata(nextTrack);

    if (audioRef.current) {
      let sourceUrl = "";
      
      if (preloadedTrackIdRef.current === nextTrack.id && preloadedUrlRef.current) {
        console.log("Synchronous handleNext using preloaded URL");
        sourceUrl = preloadedUrlRef.current;
        preloadedTrackIdRef.current = null;
        preloadedUrlRef.current = null;
      } else {
        console.log("Synchronous handleNext using on-the-fly Blob URL");
        const detectedType = nextTrack.blob.type || "audio/mp4";
        const sanitizedBlob = new Blob([nextTrack.blob], { type: detectedType });
        sourceUrl = URL.createObjectURL(sanitizedBlob);
        
        if (objectUrlRef.current && objectUrlRef.current !== sourceUrl) {
          if (objectUrlRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
        }
        objectUrlRef.current = sourceUrl;
      }

      loadedTrackIdRef.current = nextTrack.id; // Mark as loaded synchronously

      audioRef.current.src = sourceUrl;
      audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Playback failed on handleNext:", err);
          setIsPlaying(false);
        });

      onSelectTrack(nextTrack);
    } else {
      onSelectTrack(nextTrack);
      setIsPlaying(true);
    }
  };

  // Previous Track Logic
  const handlePrev = () => {
    const playlist = activePlaylistRef.current;
    if (playlist.length === 0) return;

    // If more than 3 seconds has passed, restart the current song first
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let nextTrack: Track | null = null;

    if (isShuffleRef.current) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      nextTrack = playlist[randomIndex];
    } else {
      const currentIndex = getCurrentIndex();
      if (currentIndex <= 0) {
        if (loopModeRef.current === "queue") {
          nextTrack = playlist[playlist.length - 1];
        } else {
          if (audioRef.current) audioRef.current.currentTime = 0;
          return;
        }
      } else {
        nextTrack = playlist[currentIndex - 1];
      }
    }

    if (nextTrack) {
      if (silentAudioRef.current && silentAudioRef.current.paused) {
        silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
      }

      updateMediaSessionMetadata(nextTrack);

      if (audioRef.current) {
        const detectedType = nextTrack.blob.type || "audio/mp4";
        const sanitizedBlob = new Blob([nextTrack.blob], { type: detectedType });
        const sourceUrl = URL.createObjectURL(sanitizedBlob);

        if (objectUrlRef.current && objectUrlRef.current !== sourceUrl) {
          if (objectUrlRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
        }
        objectUrlRef.current = sourceUrl;

        loadedTrackIdRef.current = nextTrack.id; // Mark as loaded synchronously

        audioRef.current.src = sourceUrl;
        audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
        audioRef.current.load();
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error("Playback failed on handlePrev:", err);
            setIsPlaying(false);
          });

        onSelectTrack(nextTrack);
      } else {
        onSelectTrack(nextTrack);
        setIsPlaying(true);
      }
    }
  };

  // Track ended trigger
  const handleTrackEnded = () => {
    if (loopModeRef.current === "single") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    const nextTrack = getNextTrack();

    if (!nextTrack) {
      setIsPlaying(false);
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
      return;
    }

    if (silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
    }

    // Synchronously update the media session metadata so the Lock Screen / Dynamic Island is instantly updated!
    updateMediaSessionMetadata(nextTrack);

    if (audioRef.current) {
      let sourceUrl = "";
      
      if (preloadedTrackIdRef.current === nextTrack.id && preloadedUrlRef.current) {
        console.log("Synchronous handleTrackEnded using preloaded URL");
        sourceUrl = preloadedUrlRef.current;
        preloadedTrackIdRef.current = null;
        preloadedUrlRef.current = null;
      } else {
        console.log("Synchronous handleTrackEnded using on-the-fly Blob URL");
        const detectedType = nextTrack.blob.type || "audio/mp4";
        const sanitizedBlob = new Blob([nextTrack.blob], { type: detectedType });
        sourceUrl = URL.createObjectURL(sanitizedBlob);
        
        if (objectUrlRef.current && objectUrlRef.current !== sourceUrl) {
          if (objectUrlRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
        }
        objectUrlRef.current = sourceUrl;
      }

      loadedTrackIdRef.current = nextTrack.id; // Mark as loaded synchronously

      audioRef.current.src = sourceUrl;
      audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Playback failed on handleTrackEnded:", err);
          setIsPlaying(false);
        });

      onSelectTrack(nextTrack);
    } else {
      onSelectTrack(nextTrack);
      setIsPlaying(true);
    }
  };

  // Handle Seekbar Scrubbing
  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("このトラックを削除してもよろしいですか？")) return;

    try {
      await deleteTrack(id);
      if (currentTrack?.id === id) {
        onSelectTrack(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("トラックの削除に失敗しました。");
    }
  };

  // Formatting seconds into MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 sm:pb-28">
      {/* Track List (Left side) */}
      <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col min-h-[520px] lg:h-[560px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
          <h3 className="text-sm font-bold text-[#FF5F1F] tracking-widest flex items-center gap-2 uppercase">
            <ListMusic className="w-5 h-5 text-[#FF5F1F]" />
            <span>LOCAL_LIBRARY ({tracks.length})</span>
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="曲名・歌手名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 text-slate-200 border border-white/10 focus:border-[#FF5F1F] rounded-lg py-2 pl-9 pr-3 outline-none text-base sm:text-xs transition font-mono"
            />
          </div>
        </div>

        {/* Playback Category Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/10 mb-4 h-11 items-center flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab("all");
              setSelectedArtist(null);
            }}
            className={`h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              activeTab === "all"
                ? "bg-[#FF5F1F] text-black font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            全曲
          </button>
          <button
            onClick={() => {
              setActiveTab("jpop");
              setSelectedArtist(null);
            }}
            className={`h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              activeTab === "jpop"
                ? "bg-[#FF5F1F] text-black font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            邦楽
          </button>
          <button
            onClick={() => {
              setActiveTab("western");
              setSelectedArtist(null);
            }}
            className={`h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              activeTab === "western"
                ? "bg-[#FF5F1F] text-black font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            洋楽
          </button>
          <button
            onClick={() => {
              setActiveTab("artist");
              setSelectedArtist(null);
            }}
            className={`h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              activeTab === "artist"
                ? "bg-[#FF5F1F] text-black font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            歌手
          </button>
        </div>

        {activeTab === "artist" && !selectedArtist ? (
          /* Artists Directory List */
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
            {artistsWithCounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3">
                <Disc className="w-12 h-12 stroke-[1.2] text-[#FF5F1F]/40 animate-pulse" />
                <p className="text-xs font-mono text-center">ライブラリに曲がありません。<br />曲を変換して追加してください。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
                {artistsWithCounts.map(({ name, count }) => (
                  <div
                    key={name}
                    onClick={() => setSelectedArtist(name)}
                    className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition border bg-black/20 hover:bg-white/5 border-white/5 text-slate-300 hover:border-[#FF5F1F]/30 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center group-hover:bg-[#FF5F1F]/15 group-hover:text-[#FF5F1F] transition-colors flex-shrink-0">
                        <Disc className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-100 group-hover:text-white transition-colors">
                          {name}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                          {count} 曲が登録されています
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Tracks list render (for all, jpop, western, or selected artist) */
          <>
            {/* If inside artist group, show back navigation bar */}
            {activeTab === "artist" && selectedArtist && (
              <div className="flex items-center gap-2 mb-3 bg-[#FF5F1F]/10 border border-[#FF5F1F]/20 rounded-xl p-2 flex-shrink-0 animate-fade-in">
                <button
                  onClick={() => setSelectedArtist(null)}
                  className="px-4 py-2 bg-black/40 hover:bg-black/60 text-[#FF5F1F] font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-white/5 active:scale-95"
                >
                  ← 戻る
                </button>
                <div className="min-w-0 flex-1 pl-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#FF5F1F]">
                    SINGER PLAYLIST
                  </p>
                  <p className="text-xs font-semibold truncate text-slate-200">
                    {selectedArtist} ({activePlaylist.length}曲)
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
              {filteredTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3">
                  <Disc className="w-12 h-12 stroke-[1.2] text-[#FF5F1F]/40 animate-pulse" />
                  <p className="text-xs font-mono">
                    {searchQuery ? "一致する曲が見つかりませんでした。" : "このグループには曲がありません。"}
                  </p>
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const isActive = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        onSelectTrack(track);
                        setIsPlaying(true);
                      }}
                      className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${
                        isActive
                          ? "bg-[#FF5F1F]/10 border-[#FF5F1F]/40 text-[#FF5F1F]"
                          : "bg-black/20 hover:bg-white/5 border-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isActive
                              ? "bg-[#FF5F1F] text-black"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <Disc className="w-5 h-5 animate-spin" />
                          ) : (
                            <Music className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate pr-2">
                            {track.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {track.artist && (
                              <p className={`text-xs truncate ${isActive ? "text-[#FF5F1F]/70" : "text-slate-400"}`}>
                                {track.artist}
                              </p>
                            )}
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase tracking-widest font-bold">
                              {track.genre || "邦楽"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleSingleTrackSync(track, e)}
                          disabled={syncingTrackId === track.id}
                          className="p-2 text-white/30 hover:text-[#FF5F1F] hover:bg-[#FF5F1F]/10 rounded-lg transition duration-200 cursor-pointer disabled:opacity-40"
                          title="この曲をGitHubへ1曲同期・保管"
                        >
                          {syncingTrackId === track.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#FF5F1F]" />
                          ) : (
                            <UploadCloud className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(track);
                          }}
                          className="p-2 text-white/30 hover:text-[#FF5F1F] hover:bg-[#FF5F1F]/10 rounded-lg transition duration-200 cursor-pointer"
                          title="情報を編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(track.id, e)}
                          className="p-2 text-white/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition duration-200 cursor-pointer"
                          title="この曲を削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Playing Control Deck (Right side) */}
      <div id="main-player-deck" className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col justify-between min-h-[500px] lg:h-[560px] shadow-2xl relative overflow-hidden">
        {/* Abstract design vinyl glow background effect */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#FF5F1F]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-[#FF5F1F]/5 rounded-full blur-3xl pointer-events-none" />

        {currentTrack ? (
          <>
            {/* Spinning disc art */}
            <div className="flex flex-col items-center text-center space-y-5 my-auto">
              <div className="relative">
                <div
                  className={`w-40 h-40 rounded-full bg-[#0a0a0a] border-[5px] border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden ${
                    isPlaying ? "animate-spin-slow" : ""
                  }`}
                  style={{
                    animationDuration: "8s",
                  }}
                >
                  {/* Vinyl Record Grooves */}
                  <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-5 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-9 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-14 rounded-full border border-white/5 pointer-events-none" />

                  {/* Center custom app icon label */}
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 flex items-center justify-center z-10">
                    <img 
                      src={soundBoxIcon} 
                      alt="SoundBox Label" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#FF5F1F] pointer-events-none border border-black shadow glow-orange-dot z-20" />
              </div>

              <div className="space-y-2 max-w-full px-2">
                <h4 className="text-base font-bold text-white line-clamp-1 tracking-tight">
                  {currentTrack.title}
                </h4>
                {playbackError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-2 rounded-xl text-[10px] font-mono leading-relaxed max-w-[280px] mx-auto animate-pulse">
                    ⚠️ {playbackError}
                  </div>
                )}
                {isPreparing && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#FF5F1F] uppercase tracking-widest bg-[#FF5F1F]/10 border border-[#FF5F1F]/20 px-3 py-1.5 rounded-full animate-pulse w-fit mx-auto">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>デコード最適化中...</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[150px]">
                    {currentTrack.artist || "不明なアーティスト"}
                  </p>
                  <span className="text-white/20 text-xs">•</span>
                  <button
                    onClick={() => handleStartEdit(currentTrack)}
                    className="text-xs text-white/40 hover:text-[#FF5F1F] transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-[#FF5F1F]/10 px-2 py-0.5 rounded-full"
                    title="曲の情報を編集"
                  >
                    <Edit className="w-3 h-3 text-[#FF5F1F]" />
                    <span>編集</span>
                  </button>
                  <span className="text-white/20 text-xs">•</span>
                  <button
                    onClick={(e) => handleDelete(currentTrack.id, e)}
                    className="text-xs text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-rose-500/10 px-2 py-0.5 rounded-full"
                    title="現在再生中の曲を削除"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500/70" />
                    <span>削除</span>
                  </button>
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#FF5F1F] font-bold">
                  HIGH-RES DECODING
                </p>
              </div>
            </div>

            {/* Playback Controls & sliders */}
            <div className="space-y-5">
              {/* Scrub Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleScrubChange}
                  className="w-full accent-[#FF5F1F] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 font-mono tracking-wider">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Action Toolbar (Shuffle, Skip, Play, Loop) */}
              <div className="flex items-center justify-between w-full max-w-[340px] mx-auto px-1">
                {/* Shuffle Button */}
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 rounded-lg transition cursor-pointer flex-shrink-0 ${
                    isShuffle ? "text-[#FF5F1F] bg-[#FF5F1F]/10" : "text-white/40 hover:text-[#FF5F1F]"
                  }`}
                  title="シャッフル"
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                {/* SkipBack Button */}
                <button
                  onClick={handlePrev}
                  className="p-2 text-slate-300 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer flex-shrink-0"
                  title="前の曲へ"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* 10s Rewind Button */}
                <button
                  onClick={() => skipTime(-10)}
                  className="p-2 text-white/40 hover:text-[#FF5F1F] transition cursor-pointer flex-shrink-0"
                  title="10秒戻る"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={() => handlePlayPause()}
                  className="w-14 h-14 bg-[#FF5F1F] hover:bg-amber-500 text-black rounded-full flex items-center justify-center shadow-xl transition transform active:scale-95 cursor-pointer glow-orange flex-shrink-0"
                  title={isPlaying ? "一時停止" : "再生"}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-black" />
                  ) : (
                    <Play className="w-6 h-6 fill-black translate-x-0.5" />
                  )}
                </button>

                {/* 10s FastForward Button */}
                <button
                  onClick={() => skipTime(10)}
                  className="p-2 text-white/40 hover:text-[#FF5F1F] transition cursor-pointer flex-shrink-0"
                  title="10秒進む"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* SkipForward Button */}
                <button
                  onClick={handleNext}
                  className="p-2 text-slate-300 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer flex-shrink-0"
                  title="次の曲へ"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Loop Mode selector */}
                <button
                  onClick={() => {
                    if (loopMode === "none") setLoopMode("queue");
                    else if (loopMode === "queue") setLoopMode("single");
                    else setLoopMode("none");
                  }}
                  className={`p-2 rounded-lg transition cursor-pointer relative flex-shrink-0 ${
                    loopMode !== "none" ? "text-[#FF5F1F] bg-[#FF5F1F]/10" : "text-white/40 hover:text-[#FF5F1F]"
                  }`}
                  title={loopMode === "single" ? "1曲ループ中" : loopMode === "queue" ? "全曲ループ中" : "ループオフ"}
                >
                  <RotateCcw className="w-5 h-5" />
                  {loopMode === "single" && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-black font-mono">
                      1
                    </span>
                  )}
                  {loopMode === "queue" && (
                    <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-black font-mono">
                      ALL
                    </span>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-4 my-auto">
            <div className="relative group p-1 bg-gradient-to-tr from-[#FF5F1F]/20 to-amber-500/20 rounded-2xl border border-white/10 shadow-2xl">
              <img 
                src={soundBoxIcon} 
                alt="SoundBox Logo" 
                className="w-16 h-16 rounded-xl object-cover animate-pulse shadow-lg" 
              />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FF5F1F]">DECK_OFFLINE</p>
              <p className="text-xs text-white/50 max-w-[200px] leading-relaxed">
                リストからトラックを選択して再生を開始してください。
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Edit Metadata Modal */}
      {editingTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setEditingTrack(null)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#FF5F1F] uppercase block mb-1">METADATA EDITOR</span>
              <h3 className="text-lg font-bold text-white tracking-tight">登録情報の編集</h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">曲名 / TRACK TITLE</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-sm transition font-sans"
                  placeholder="曲名を入力してください"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">アーティスト / ARTIST</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-sm transition font-sans"
                  placeholder="アーティスト名を入力してください"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">カテゴリ / CATEGORY</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditGenre("邦楽")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
                      editGenre === "邦楽"
                        ? "bg-[#FF5F1F]/15 border-[#FF5F1F] text-[#FF5F1F]"
                        : "bg-black/30 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    邦楽 (J-POP / Anime / Suno)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGenre("洋楽")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
                      editGenre === "洋楽"
                        ? "bg-[#FF5F1F]/15 border-[#FF5F1F] text-[#FF5F1F]"
                        : "bg-black/30 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    洋楽 (Western / Global)
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5F1F] hover:bg-amber-500 text-black rounded-xl text-xs font-extrabold shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>更新を保存</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Bottom Mini Player */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/95 backdrop-blur-lg border-t border-white/10 shadow-[0_-8px_30px_rgb(0,0,0,0.8)] pb-safe animate-fade-in">
          {/* Progress bar on very top of the mini player */}
          <div className="relative w-full h-1 bg-white/10 group cursor-pointer">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleScrubChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="h-full bg-gradient-to-r from-[#FF5F1F] to-amber-500 transition-all duration-100 relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md border border-[#FF5F1F] scale-0 group-hover:scale-100 transition-transform"></div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
            {/* Left: Metadata & Navigation */}
            <div 
              onClick={() => {
                const element = document.getElementById("main-player-deck");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group hover:opacity-90"
              title="メインプレイヤーへ移動"
            >
              <div className={`w-9 h-9 rounded-full overflow-hidden border border-white/20 flex items-center justify-center flex-shrink-0 relative ${isPlaying ? "animate-spin-slow" : ""}`}>
                <img 
                  src={soundBoxIcon} 
                  alt="Track Icon" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 rounded-full border border-[#FF5F1F]/20 scale-105 animate-ping opacity-25" style={{ animationDuration: '3s' }}></div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-[#FF5F1F] transition-colors">{currentTrack.title}</h4>
                  <ChevronUp className="w-3.5 h-3.5 text-white/40 group-hover:text-[#FF5F1F] transition-colors flex-shrink-0 animate-bounce" />
                </div>
                <p className="text-[10px] text-white/50 truncate">{currentTrack.artist || "不明なアーティスト"}</p>
              </div>
            </div>

            {/* Center: Control Buttons */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Shuffle / Random Button */}
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-2 rounded-full transition cursor-pointer active:scale-90 ${
                  isShuffle ? "text-[#FF5F1F] bg-[#FF5F1F]/10 font-bold" : "text-white/40 hover:text-white"
                }`}
                title="シャッフル再生"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrev}
                className="p-2 text-white/60 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer active:scale-90"
                title="前の曲へ"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => handlePlayPause()}
                className="w-10 h-10 bg-[#FF5F1F] hover:bg-amber-500 text-black rounded-full flex items-center justify-center shadow-lg transition transform active:scale-95 cursor-pointer glow-orange"
                title={isPlaying ? "一時停止" : "再生"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black stroke-[2.5]" />
                ) : (
                  <Play className="w-4 h-4 fill-black stroke-[2.5] translate-x-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-2 text-white/60 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer active:scale-90"
                title="次の曲へ"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Repeat Mode Button */}
              <button
                onClick={() => {
                  if (loopMode === "none") setLoopMode("queue");
                  else if (loopMode === "queue") setLoopMode("single");
                  else setLoopMode("none");
                }}
                className={`p-2 rounded-full transition cursor-pointer relative active:scale-90 ${
                  loopMode !== "none" ? "text-[#FF5F1F] bg-[#FF5F1F]/10" : "text-white/40 hover:text-white"
                }`}
                title={loopMode === "single" ? "1曲リピート中" : loopMode === "queue" ? "全曲リピート中" : "リピートオフ"}
              >
                <RotateCcw className="w-4 h-4" />
                {loopMode === "single" && (
                  <span className="absolute bottom-0 right-0 text-[7px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono border border-black scale-90">
                    1
                  </span>
                )}
                {loopMode === "queue" && (
                  <span className="absolute bottom-0 right-0 text-[6px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono border border-black scale-90">
                    ALL
                  </span>
                )}
              </button>
            </div>

            {/* Right: Timing display (visible on sm screens up) */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-white/40 flex-shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-[#FF5F1F]/80 font-bold">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
