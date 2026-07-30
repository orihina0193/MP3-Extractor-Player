import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=17b4195c"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=17b4195c"; const React = __vite__cjsImport1_react.__esModule ? __vite__cjsImport1_react.default : __vite__cjsImport1_react; const useState = __vite__cjsImport1_react["useState"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useRef = __vite__cjsImport1_react["useRef"];
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
  Disc,
  ListMusic,
  Loader2,
  Edit,
  Check,
  X,
  ChevronUp,
  UploadCloud
} from "/node_modules/.vite/deps/lucide-react.js?v=17b4195c";
import { deleteTrack, updateTrackMetadata } from "/src/lib/db.ts";
import { detectMimeType, createSilentWavBlob } from "/src/lib/audioHelper.ts";
import { getGitHubConfig, isGitHubConfigured, uploadTrackToGitHub } from "/src/lib/githubSync.ts";
import soundBoxIcon from "/src/assets/images/soundbox_app_icon_flat_1783522740605.jpg?import";
export default function Player({ tracks, onRefresh, currentTrack, onSelectTrack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState("none");
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const [playbackError, setPlaybackError] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editGenre, setEditGenre] = useState("邦楽");
  const [syncingTrackId, setSyncingTrackId] = useState(null);
  const handleSingleTrackSync = async (track, e) => {
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
    } catch (err) {
      console.error("Single track GitHub sync error:", err);
      alert("GitHubへの1曲同期に失敗しました: " + err.message);
    } finally {
      setSyncingTrackId(null);
    }
  };
  const handleStartEdit = (track) => {
    setEditingTrack(track);
    setEditTitle(track.title);
    setEditArtist(track.artist || "");
    setEditGenre(track.genre || "邦楽");
  };
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingTrack) return;
    if (!editTitle.trim()) {
      alert("曲名は必須です。");
      return;
    }
    try {
      const updated = await updateTrackMetadata(editingTrack.id, {
        title: editTitle.trim(),
        artist: editArtist.trim() || void 0,
        genre: editGenre
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
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const loadedTrackIdRef = useRef(null);
  const silentAudioRef = useRef(null);
  const preloadedTrackIdRef = useRef(null);
  const preloadedUrlRef = useRef(null);
  const currentlyPreloadingTrackIdRef = useRef(null);
  const preloadedForTrackIdRef = useRef(null);
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
  const filteredTracks = React.useMemo(() => {
    return activePlaylist.filter(
      (track) => track.title.toLowerCase().includes(searchQuery.toLowerCase()) || track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePlaylist, searchQuery]);
  const artistsWithCounts = React.useMemo(() => {
    const counts = {};
    tracks.forEach((track) => {
      const artist = track.artist || "不明なアーティスト";
      counts[artist] = (counts[artist] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [tracks]);
  const getCurrentIndex = () => {
    const activeTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;
    if (!activeTrackId) return -1;
    return activePlaylistRef.current.findIndex((t) => t.id === activeTrackId);
  };
  const getNextTrack = () => {
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
  const triggerPreloadNextTrack = async () => {
    const activeTrackId = loadedTrackIdRef.current || currentTrackRef.current?.id;
    if (!activeTrackId || !isPlayingRef.current) return;
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
  useEffect(() => {
    setPlaybackError(null);
  }, [currentTrack]);
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const silentBlob = createSilentWavBlob(10);
    const silentUrl = URL.createObjectURL(silentBlob);
    const silentAudio = new Audio(silentUrl);
    silentAudio.loop = true;
    silentAudio.volume = 1e-3;
    silentAudioRef.current = silentAudio;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration > 0 && audio.duration - audio.currentTime <= 10) {
        triggerPreloadNextTrack();
      }
    };
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleTrackEnded();
    const handleError = () => {
      if (!currentTrackRef.current || !audio.src || audio.src === window.location.href) {
        return;
      }
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
  }, []);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
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
                audio.play().catch((e) => console.error("Interruption session restoration failed completely:", e));
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
  useEffect(() => {
    cleanupPreloaded();
    preloadedForTrackIdRef.current = null;
    const audio = audioRef.current;
    if (audio && isPlaying && audio.duration > 0 && audio.duration - audio.currentTime <= 10) {
      triggerPreloadNextTrack();
    }
  }, [isShuffle, loopMode, activePlaylist]);
  useEffect(() => {
    if (!audioRef.current) return;
    let active = true;
    if (currentTrack) {
      preloadedForTrackIdRef.current = null;
      if (loadedTrackIdRef.current !== currentTrack.id) {
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
          preloadedTrackIdRef.current = null;
          preloadedUrlRef.current = null;
          loadedTrackIdRef.current = currentTrack.id;
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
          if (objectUrlRef.current) {
            if (objectUrlRef.current.startsWith("blob:")) {
              URL.revokeObjectURL(objectUrlRef.current);
            }
            objectUrlRef.current = null;
          }
          const loadTrack = async () => {
            try {
              setIsPreparing(true);
              const detectedType = await detectMimeType(currentTrack.blob);
              if (!active) return;
              const sanitizedBlob = new Blob([currentTrack.blob], { type: detectedType });
              const sourceUrl = URL.createObjectURL(sanitizedBlob);
              objectUrlRef.current = sourceUrl;
              if (!active) return;
              if (audioRef.current) {
                loadedTrackIdRef.current = currentTrack.id;
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
      updateMediaSessionMetadata(currentTrack);
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
      const preloadTimer = setTimeout(() => {
        if (active && isPlaying) {
          triggerPreloadNextTrack();
        }
      }, 1e3);
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
  const handlePlayPause = async (targetPlayState) => {
    if (!audioRef.current || !currentTrack) return;
    const nextState = targetPlayState !== void 0 ? targetPlayState : !isPlaying;
    if (nextState) {
      try {
        const audio = audioRef.current;
        if (silentAudioRef.current && silentAudioRef.current.paused) {
          silentAudioRef.current.play().catch((e) => console.warn("Silent audio play failed", e));
        }
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
  const skipTime = (amount) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + amount)
    );
  };
  const updateMediaSessionMetadata = (track) => {
    if ("mediaSession" in navigator) {
      const iconUrl = soundBoxIcon.startsWith("http") ? soundBoxIcon : `${window.location.origin}${soundBoxIcon.startsWith("/") ? "" : "/"}${soundBoxIcon}`;
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
      loadedTrackIdRef.current = nextTrack.id;
      audioRef.current.src = sourceUrl;
      audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Playback failed on handleNext:", err);
        setIsPlaying(false);
      });
      onSelectTrack(nextTrack);
    } else {
      onSelectTrack(nextTrack);
      setIsPlaying(true);
    }
  };
  const handlePrev = () => {
    const playlist = activePlaylistRef.current;
    if (playlist.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    let nextTrack = null;
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
        loadedTrackIdRef.current = nextTrack.id;
        audioRef.current.src = sourceUrl;
        audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
        audioRef.current.load();
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
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
      loadedTrackIdRef.current = nextTrack.id;
      audioRef.current.src = sourceUrl;
      audioRef.current.volume = isMutedRef.current ? 0 : volumeRef.current;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Playback failed on handleTrackEnded:", err);
        setIsPlaying(false);
      });
      onSelectTrack(nextTrack);
    } else {
      onSelectTrack(nextTrack);
      setIsPlaying(true);
    }
  };
  const handleScrubChange = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };
  const handleDelete = async (id, e) => {
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
  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 sm:pb-28", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col min-h-[520px] lg:h-[560px]", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4", children: [
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-[#FF5F1F] tracking-widest flex items-center gap-2 uppercase", children: [
          /* @__PURE__ */ jsxDEV(ListMusic, { className: "w-5 h-5 text-[#FF5F1F]" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 913,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            "LOCAL_LIBRARY (",
            tracks.length,
            ")"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 914,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 912,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
          /* @__PURE__ */ jsxDEV(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 917,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              placeholder: "曲名・歌手名で検索...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              className: "w-full bg-black/40 text-slate-200 border border-white/10 focus:border-[#FF5F1F] rounded-lg py-2 pl-9 pr-3 outline-none text-base sm:text-xs transition font-mono"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 918,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 916,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 911,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-xl border border-white/10 mb-4 h-11 items-center flex-shrink-0", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setActiveTab("all");
              setSelectedArtist(null);
            },
            className: `h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${activeTab === "all" ? "bg-[#FF5F1F] text-black font-extrabold" : "text-slate-400 hover:text-white"}`,
            children: "全曲"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 930,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setActiveTab("jpop");
              setSelectedArtist(null);
            },
            className: `h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${activeTab === "jpop" ? "bg-[#FF5F1F] text-black font-extrabold" : "text-slate-400 hover:text-white"}`,
            children: "邦楽"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 943,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setActiveTab("western");
              setSelectedArtist(null);
            },
            className: `h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${activeTab === "western" ? "bg-[#FF5F1F] text-black font-extrabold" : "text-slate-400 hover:text-white"}`,
            children: "洋楽"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 956,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setActiveTab("artist");
              setSelectedArtist(null);
            },
            className: `h-full rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${activeTab === "artist" ? "bg-[#FF5F1F] text-black font-extrabold" : "text-slate-400 hover:text-white"}`,
            children: "歌手"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 969,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 929,
        columnNumber: 9
      }, this),
      activeTab === "artist" && !selectedArtist ? (
        /* Artists Directory List */
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent", children: artistsWithCounts.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-full text-white/30 space-y-3", children: [
          /* @__PURE__ */ jsxDEV(Disc, { className: "w-12 h-12 stroke-[1.2] text-[#FF5F1F]/40 animate-pulse" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 989,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-mono text-center", children: [
            "ライブラリに曲がありません。",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 990,
              columnNumber: 76
            }, this),
            "曲を変換して追加してください。"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 990,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 988,
          columnNumber: 15
        }, this) : /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2", children: artistsWithCounts.map(({ name, count }) => /* @__PURE__ */ jsxDEV(
          "div",
          {
            onClick: () => setSelectedArtist(name),
            className: "flex items-center justify-between p-4 rounded-xl cursor-pointer transition border bg-black/20 hover:bg-white/5 border-white/5 text-slate-300 hover:border-[#FF5F1F]/30 group",
            children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 min-w-0", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-10 h-10 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center group-hover:bg-[#FF5F1F]/15 group-hover:text-[#FF5F1F] transition-colors flex-shrink-0", children: /* @__PURE__ */ jsxDEV(Disc, { className: "w-5 h-5" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1002,
                columnNumber: 25
              }, this) }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1001,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold truncate text-slate-100 group-hover:text-white transition-colors", children: name }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1005,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-slate-400 uppercase tracking-wider font-mono", children: [
                  count,
                  " 曲が登録されています"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1008,
                  columnNumber: 25
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1004,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1e3,
              columnNumber: 21
            }, this)
          },
          name,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 995,
            columnNumber: 19
          },
          this
        )) }, void 0, false, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 993,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 986,
          columnNumber: 11
        }, this)
      ) : (
        /* Tracks list render (for all, jpop, western, or selected artist) */
        /* @__PURE__ */ jsxDEV(Fragment, { children: [
          activeTab === "artist" && selectedArtist && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-3 bg-[#FF5F1F]/10 border border-[#FF5F1F]/20 rounded-xl p-2 flex-shrink-0 animate-fade-in", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setSelectedArtist(null),
                className: "px-4 py-2 bg-black/40 hover:bg-black/60 text-[#FF5F1F] font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-white/5 active:scale-95",
                children: "← 戻る"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1024,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "min-w-0 flex-1 pl-1", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-bold uppercase tracking-widest text-[#FF5F1F]", children: "SINGER PLAYLIST" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1031,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold truncate text-slate-200", children: [
                selectedArtist,
                " (",
                activePlaylist.length,
                "曲)"
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1034,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1030,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1023,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent", children: filteredTracks.length === 0 ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-full text-white/30 space-y-3", children: [
            /* @__PURE__ */ jsxDEV(Disc, { className: "w-12 h-12 stroke-[1.2] text-[#FF5F1F]/40 animate-pulse" }, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1044,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-mono", children: searchQuery ? "一致する曲が見つかりませんでした。" : "このグループには曲がありません。" }, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1045,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1043,
            columnNumber: 17
          }, this) : filteredTracks.map((track) => {
            const isActive = currentTrack?.id === track.id;
            return /* @__PURE__ */ jsxDEV(
              "div",
              {
                onClick: () => {
                  onSelectTrack(track);
                  setIsPlaying(true);
                },
                className: `group flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${isActive ? "bg-[#FF5F1F]/10 border-[#FF5F1F]/40 text-[#FF5F1F]" : "bg-black/20 hover:bg-white/5 border-white/5 text-slate-300"}`,
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 min-w-0", children: [
                    /* @__PURE__ */ jsxDEV(
                      "div",
                      {
                        className: `w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? "bg-[#FF5F1F] text-black" : "bg-white/5 text-slate-400"}`,
                        children: isActive && isPlaying ? /* @__PURE__ */ jsxDEV(Disc, { className: "w-5 h-5 animate-spin" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1074,
                          columnNumber: 29
                        }, this) : /* @__PURE__ */ jsxDEV(Music, { className: "w-4 h-4" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1076,
                          columnNumber: 29
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/components/Player.tsx",
                        lineNumber: 1066,
                        columnNumber: 25
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
                      /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold truncate pr-2", children: track.title }, void 0, false, {
                        fileName: "/app/applet/src/components/Player.tsx",
                        lineNumber: 1080,
                        columnNumber: 27
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mt-0.5", children: [
                        track.artist && /* @__PURE__ */ jsxDEV("p", { className: `text-xs truncate ${isActive ? "text-[#FF5F1F]/70" : "text-slate-400"}`, children: track.artist }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1085,
                          columnNumber: 31
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase tracking-widest font-bold", children: track.genre || "邦楽" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1089,
                          columnNumber: 29
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/components/Player.tsx",
                        lineNumber: 1083,
                        columnNumber: 27
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/components/Player.tsx",
                      lineNumber: 1079,
                      columnNumber: 25
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1065,
                    columnNumber: 23
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 flex-shrink-0", children: [
                    /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        onClick: (e) => handleSingleTrackSync(track, e),
                        disabled: syncingTrackId === track.id,
                        className: "p-2 text-white/30 hover:text-[#FF5F1F] hover:bg-[#FF5F1F]/10 rounded-lg transition duration-200 cursor-pointer disabled:opacity-40",
                        title: "この曲をGitHubへ1曲同期・保管",
                        children: syncingTrackId === track.id ? /* @__PURE__ */ jsxDEV(Loader2, { className: "w-4 h-4 animate-spin text-[#FF5F1F]" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1104,
                          columnNumber: 29
                        }, this) : /* @__PURE__ */ jsxDEV(UploadCloud, { className: "w-4 h-4" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1106,
                          columnNumber: 29
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/components/Player.tsx",
                        lineNumber: 1097,
                        columnNumber: 25
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          handleStartEdit(track);
                        },
                        className: "p-2 text-white/30 hover:text-[#FF5F1F] hover:bg-[#FF5F1F]/10 rounded-lg transition duration-200 cursor-pointer",
                        title: "情報を編集",
                        children: /* @__PURE__ */ jsxDEV(Edit, { className: "w-4 h-4" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1117,
                          columnNumber: 27
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/components/Player.tsx",
                        lineNumber: 1109,
                        columnNumber: 25
                      },
                      this
                    ),
                    /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        onClick: (e) => handleDelete(track.id, e),
                        className: "p-2 text-white/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition duration-200 cursor-pointer",
                        title: "この曲を削除",
                        children: /* @__PURE__ */ jsxDEV(Trash2, { className: "w-4 h-4" }, void 0, false, {
                          fileName: "/app/applet/src/components/Player.tsx",
                          lineNumber: 1124,
                          columnNumber: 27
                        }, this)
                      },
                      void 0,
                      false,
                      {
                        fileName: "/app/applet/src/components/Player.tsx",
                        lineNumber: 1119,
                        columnNumber: 25
                      },
                      this
                    )
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1096,
                    columnNumber: 23
                  }, this)
                ]
              },
              track.id,
              true,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1053,
                columnNumber: 21
              },
              this
            );
          }) }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1041,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1020,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Player.tsx",
      lineNumber: 910,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { id: "main-player-deck", className: "lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col justify-between min-h-[500px] lg:h-[560px] shadow-2xl relative overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -right-16 -top-16 w-48 h-48 bg-[#FF5F1F]/5 rounded-full blur-3xl pointer-events-none" }, void 0, false, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1139,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -left-16 -bottom-16 w-48 h-48 bg-[#FF5F1F]/5 rounded-full blur-3xl pointer-events-none" }, void 0, false, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1140,
        columnNumber: 9
      }, this),
      currentTrack ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center text-center space-y-5 my-auto", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative", children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: `w-40 h-40 rounded-full bg-[#0a0a0a] border-[5px] border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden ${isPlaying ? "animate-spin-slow" : ""}`,
                style: {
                  animationDuration: "8s"
                },
                children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-2 rounded-full border border-white/5 pointer-events-none" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1156,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-5 rounded-full border border-white/5 pointer-events-none" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1157,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-9 rounded-full border border-white/5 pointer-events-none" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1158,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-14 rounded-full border border-white/5 pointer-events-none" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1159,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "w-14 h-14 rounded-full overflow-hidden border border-white/10 flex items-center justify-center z-10", children: /* @__PURE__ */ jsxDEV(
                    "img",
                    {
                      src: soundBoxIcon,
                      alt: "SoundBox Label",
                      className: "w-full h-full object-cover"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/app/applet/src/components/Player.tsx",
                      lineNumber: 1163,
                      columnNumber: 21
                    },
                    this
                  ) }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1162,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1147,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#FF5F1F] pointer-events-none border border-black shadow glow-orange-dot z-20" }, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1170,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1146,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-2 max-w-full px-2", children: [
            /* @__PURE__ */ jsxDEV("h4", { className: "text-base font-bold text-white line-clamp-1 tracking-tight", children: currentTrack.title }, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1174,
              columnNumber: 17
            }, this),
            playbackError && /* @__PURE__ */ jsxDEV("div", { className: "bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-2 rounded-xl text-[10px] font-mono leading-relaxed max-w-[280px] mx-auto animate-pulse", children: [
              "⚠️ ",
              playbackError
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1178,
              columnNumber: 19
            }, this),
            isPreparing && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#FF5F1F] uppercase tracking-widest bg-[#FF5F1F]/10 border border-[#FF5F1F]/20 px-3 py-1.5 rounded-full animate-pulse w-fit mx-auto", children: [
              /* @__PURE__ */ jsxDEV(Loader2, { className: "w-3.5 h-3.5 animate-spin" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1184,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "デコード最適化中..." }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1185,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1183,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-2 flex-wrap", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-400 font-medium truncate max-w-[150px]", children: currentTrack.artist || "不明なアーティスト" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1189,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/20 text-xs", children: "•" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1192,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => handleStartEdit(currentTrack),
                  className: "text-xs text-white/40 hover:text-[#FF5F1F] transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-[#FF5F1F]/10 px-2 py-0.5 rounded-full",
                  title: "曲の情報を編集",
                  children: [
                    /* @__PURE__ */ jsxDEV(Edit, { className: "w-3 h-3 text-[#FF5F1F]" }, void 0, false, {
                      fileName: "/app/applet/src/components/Player.tsx",
                      lineNumber: 1198,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { children: "編集" }, void 0, false, {
                      fileName: "/app/applet/src/components/Player.tsx",
                      lineNumber: 1199,
                      columnNumber: 21
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1193,
                  columnNumber: 19
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("span", { className: "text-white/20 text-xs", children: "•" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1201,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: (e) => handleDelete(currentTrack.id, e),
                  className: "text-xs text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-rose-500/10 px-2 py-0.5 rounded-full",
                  title: "現在再生中の曲を削除",
                  children: [
                    /* @__PURE__ */ jsxDEV(Trash2, { className: "w-3.5 h-3.5 text-rose-500/70" }, void 0, false, {
                      fileName: "/app/applet/src/components/Player.tsx",
                      lineNumber: 1207,
                      columnNumber: 21
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { children: "削除" }, void 0, false, {
                      fileName: "/app/applet/src/components/Player.tsx",
                      lineNumber: 1208,
                      columnNumber: 21
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1202,
                  columnNumber: 19
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1188,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] uppercase tracking-[0.2em] text-[#FF5F1F] font-bold", children: "HIGH-RES DECODING" }, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1211,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1173,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1145,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "range",
                min: "0",
                max: duration || 100,
                value: currentTime,
                onChange: handleScrubChange,
                className: "w-full accent-[#FF5F1F] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1221,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-[10px] text-white/40 font-mono tracking-wider", children: [
              /* @__PURE__ */ jsxDEV("span", { children: formatTime(currentTime) }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1230,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: formatTime(duration) }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1231,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1229,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1220,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between w-full max-w-[340px] mx-auto px-1", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setIsShuffle(!isShuffle),
                className: `p-2 rounded-lg transition cursor-pointer flex-shrink-0 ${isShuffle ? "text-[#FF5F1F] bg-[#FF5F1F]/10" : "text-white/40 hover:text-[#FF5F1F]"}`,
                title: "シャッフル",
                children: /* @__PURE__ */ jsxDEV(Shuffle, { className: "w-5 h-5" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1245,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1238,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: handlePrev,
                className: "p-2 text-slate-300 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer flex-shrink-0",
                title: "前の曲へ",
                children: /* @__PURE__ */ jsxDEV(SkipBack, { className: "w-5 h-5" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1254,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1249,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => skipTime(-10),
                className: "p-2 text-white/40 hover:text-[#FF5F1F] transition cursor-pointer flex-shrink-0",
                title: "10秒戻る",
                children: /* @__PURE__ */ jsxDEV(RotateCcw, { className: "w-4 h-4" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1263,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1258,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => handlePlayPause(),
                className: "w-14 h-14 bg-[#FF5F1F] hover:bg-amber-500 text-black rounded-full flex items-center justify-center shadow-xl transition transform active:scale-95 cursor-pointer glow-orange flex-shrink-0",
                title: isPlaying ? "一時停止" : "再生",
                children: isPlaying ? /* @__PURE__ */ jsxDEV(Pause, { className: "w-6 h-6 fill-black" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1273,
                  columnNumber: 21
                }, this) : /* @__PURE__ */ jsxDEV(Play, { className: "w-6 h-6 fill-black translate-x-0.5" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1275,
                  columnNumber: 21
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1267,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => skipTime(10),
                className: "p-2 text-white/40 hover:text-[#FF5F1F] transition cursor-pointer flex-shrink-0",
                title: "10秒進む",
                children: /* @__PURE__ */ jsxDEV(RotateCw, { className: "w-4 h-4" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1285,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1280,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: handleNext,
                className: "p-2 text-slate-300 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer flex-shrink-0",
                title: "次の曲へ",
                children: /* @__PURE__ */ jsxDEV(SkipForward, { className: "w-5 h-5" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1294,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1289,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  if (loopMode === "none") setLoopMode("queue");
                  else if (loopMode === "queue") setLoopMode("single");
                  else setLoopMode("none");
                },
                className: `p-2 rounded-lg transition cursor-pointer relative flex-shrink-0 ${loopMode !== "none" ? "text-[#FF5F1F] bg-[#FF5F1F]/10" : "text-white/40 hover:text-[#FF5F1F]"}`,
                title: loopMode === "single" ? "1曲ループ中" : loopMode === "queue" ? "全曲ループ中" : "ループオフ",
                children: [
                  /* @__PURE__ */ jsxDEV(RotateCcw, { className: "w-5 h-5" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1309,
                    columnNumber: 19
                  }, this),
                  loopMode === "single" && /* @__PURE__ */ jsxDEV("span", { className: "absolute bottom-0.5 right-0.5 text-[8px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-black font-mono", children: "1" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1311,
                    columnNumber: 21
                  }, this),
                  loopMode === "queue" && /* @__PURE__ */ jsxDEV("span", { className: "absolute bottom-0.5 right-0.5 text-[7px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-black font-mono", children: "ALL" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1316,
                    columnNumber: 21
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1298,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1236,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1218,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1143,
        columnNumber: 11
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-full text-white/30 space-y-4 my-auto", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "relative group p-1 bg-gradient-to-tr from-[#FF5F1F]/20 to-amber-500/20 rounded-2xl border border-white/10 shadow-2xl", children: /* @__PURE__ */ jsxDEV(
          "img",
          {
            src: soundBoxIcon,
            alt: "SoundBox Logo",
            className: "w-16 h-16 rounded-xl object-cover animate-pulse shadow-lg"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1327,
            columnNumber: 15
          },
          this
        ) }, void 0, false, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1326,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-center space-y-1.5", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest text-[#FF5F1F]", children: "DECK_OFFLINE" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1334,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-white/50 max-w-[200px] leading-relaxed", children: "リストからトラックを選択して再生を開始してください。" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1335,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1333,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1325,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Player.tsx",
      lineNumber: 1137,
      columnNumber: 7
    }, this),
    editingTrack && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-[#0c0c0c] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setEditingTrack(null),
          className: "absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer",
          children: /* @__PURE__ */ jsxDEV(X, { className: "w-5 h-5" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1350,
            columnNumber: 15
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1346,
          columnNumber: 13
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-bold tracking-widest text-[#FF5F1F] uppercase block mb-1", children: "METADATA EDITOR" }, void 0, false, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1354,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-lg font-bold text-white tracking-tight", children: "登録情報の編集" }, void 0, false, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1355,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1353,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("form", { onSubmit: handleSaveEdit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] font-bold text-white/50 uppercase tracking-wider block", children: "曲名 / TRACK TITLE" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1360,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              required: true,
              value: editTitle,
              onChange: (e) => setEditTitle(e.target.value),
              className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-sm transition font-sans",
              placeholder: "曲名を入力してください"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1361,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1359,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] font-bold text-white/50 uppercase tracking-wider block", children: "アーティスト / ARTIST" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1372,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              value: editArtist,
              onChange: (e) => setEditArtist(e.target.value),
              className: "w-full bg-black/40 text-slate-100 border border-white/10 focus:border-[#FF5F1F] rounded-xl py-3 px-4 outline-none text-sm transition font-sans",
              placeholder: "アーティスト名を入力してください"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1373,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1371,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxDEV("label", { className: "text-[10px] font-bold text-white/50 uppercase tracking-wider block", children: "カテゴリ / CATEGORY" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1383,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setEditGenre("邦楽"),
                className: `py-2.5 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${editGenre === "邦楽" ? "bg-[#FF5F1F]/15 border-[#FF5F1F] text-[#FF5F1F]" : "bg-black/30 border-white/5 text-slate-400 hover:text-white hover:border-white/10"}`,
                children: "邦楽 (J-POP / Anime / Suno)"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1385,
                columnNumber: 19
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setEditGenre("洋楽"),
                className: `py-2.5 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${editGenre === "洋楽" ? "bg-[#FF5F1F]/15 border-[#FF5F1F] text-[#FF5F1F]" : "bg-black/30 border-white/5 text-slate-400 hover:text-white hover:border-white/10"}`,
                children: "洋楽 (Western / Global)"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1396,
                columnNumber: 19
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1384,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1382,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-3 pt-4 border-t border-white/5", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: () => setEditingTrack(null),
              className: "flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95",
              children: "キャンセル"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1411,
              columnNumber: 17
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "submit",
              className: "flex-1 py-3 bg-[#FF5F1F] hover:bg-amber-500 text-black rounded-xl text-xs font-extrabold shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5",
              children: [
                /* @__PURE__ */ jsxDEV(Check, { className: "w-4 h-4 stroke-[2.5]" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1422,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: "更新を保存" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1423,
                  columnNumber: 19
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1418,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1410,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1358,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Player.tsx",
      lineNumber: 1345,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/Player.tsx",
      lineNumber: 1344,
      columnNumber: 9
    }, this),
    currentTrack && /* @__PURE__ */ jsxDEV("div", { className: "fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/95 backdrop-blur-lg border-t border-white/10 shadow-[0_-8px_30px_rgb(0,0,0,0.8)] pb-safe animate-fade-in", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "relative w-full h-1 bg-white/10 group cursor-pointer", children: [
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "range",
            min: "0",
            max: duration || 100,
            value: currentTime,
            onChange: handleScrubChange,
            className: "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1436,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "h-full bg-gradient-to-r from-[#FF5F1F] to-amber-500 transition-all duration-100 relative",
            style: { width: `${duration ? currentTime / duration * 100 : 0}%` },
            children: /* @__PURE__ */ jsxDEV("div", { className: "absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md border border-[#FF5F1F] scale-0 group-hover:scale-100 transition-transform" }, void 0, false, {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1448,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1444,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1435,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            onClick: () => {
              const element = document.getElementById("main-player-deck");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            },
            className: "flex items-center gap-3 min-w-0 flex-1 cursor-pointer group hover:opacity-90",
            title: "メインプレイヤーへ移動",
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: `w-9 h-9 rounded-full overflow-hidden border border-white/20 flex items-center justify-center flex-shrink-0 relative ${isPlaying ? "animate-spin-slow" : ""}`, children: [
                /* @__PURE__ */ jsxDEV(
                  "img",
                  {
                    src: soundBoxIcon,
                    alt: "Track Icon",
                    className: "w-full h-full object-cover"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1465,
                    columnNumber: 17
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 rounded-full border border-[#FF5F1F]/20 scale-105 animate-ping opacity-25", style: { animationDuration: "3s" } }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1470,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1464,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-white truncate group-hover:text-[#FF5F1F] transition-colors", children: currentTrack.title }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1474,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV(ChevronUp, { className: "w-3.5 h-3.5 text-white/40 group-hover:text-[#FF5F1F] transition-colors flex-shrink-0 animate-bounce" }, void 0, false, {
                    fileName: "/app/applet/src/components/Player.tsx",
                    lineNumber: 1475,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1473,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-white/50 truncate", children: currentTrack.artist || "不明なアーティスト" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1477,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1472,
                columnNumber: 15
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1454,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 sm:gap-4 flex-shrink-0", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setIsShuffle(!isShuffle),
              className: `p-2 rounded-full transition cursor-pointer active:scale-90 ${isShuffle ? "text-[#FF5F1F] bg-[#FF5F1F]/10 font-bold" : "text-white/40 hover:text-white"}`,
              title: "シャッフル再生",
              children: /* @__PURE__ */ jsxDEV(Shuffle, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1491,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1484,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: handlePrev,
              className: "p-2 text-white/60 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer active:scale-90",
              title: "前の曲へ",
              children: /* @__PURE__ */ jsxDEV(SkipBack, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1499,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1494,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => handlePlayPause(),
              className: "w-10 h-10 bg-[#FF5F1F] hover:bg-amber-500 text-black rounded-full flex items-center justify-center shadow-lg transition transform active:scale-95 cursor-pointer glow-orange",
              title: isPlaying ? "一時停止" : "再生",
              children: isPlaying ? /* @__PURE__ */ jsxDEV(Pause, { className: "w-4 h-4 fill-black stroke-[2.5]" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1508,
                columnNumber: 19
              }, this) : /* @__PURE__ */ jsxDEV(Play, { className: "w-4 h-4 fill-black stroke-[2.5] translate-x-0.5" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1510,
                columnNumber: 19
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1502,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: handleNext,
              className: "p-2 text-white/60 hover:text-[#FF5F1F] hover:bg-white/5 rounded-full transition cursor-pointer active:scale-90",
              title: "次の曲へ",
              children: /* @__PURE__ */ jsxDEV(SkipForward, { className: "w-4 h-4" }, void 0, false, {
                fileName: "/app/applet/src/components/Player.tsx",
                lineNumber: 1519,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1514,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                if (loopMode === "none") setLoopMode("queue");
                else if (loopMode === "queue") setLoopMode("single");
                else setLoopMode("none");
              },
              className: `p-2 rounded-full transition cursor-pointer relative active:scale-90 ${loopMode !== "none" ? "text-[#FF5F1F] bg-[#FF5F1F]/10" : "text-white/40 hover:text-white"}`,
              title: loopMode === "single" ? "1曲リピート中" : loopMode === "queue" ? "全曲リピート中" : "リピートオフ",
              children: [
                /* @__PURE__ */ jsxDEV(RotateCcw, { className: "w-4 h-4" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1534,
                  columnNumber: 17
                }, this),
                loopMode === "single" && /* @__PURE__ */ jsxDEV("span", { className: "absolute bottom-0 right-0 text-[7px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono border border-black scale-90", children: "1" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1536,
                  columnNumber: 19
                }, this),
                loopMode === "queue" && /* @__PURE__ */ jsxDEV("span", { className: "absolute bottom-0 right-0 text-[6px] font-bold bg-[#FF5F1F] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono border border-black scale-90", children: "ALL" }, void 0, false, {
                  fileName: "/app/applet/src/components/Player.tsx",
                  lineNumber: 1541,
                  columnNumber: 19
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/Player.tsx",
              lineNumber: 1523,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1482,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "hidden sm:flex items-center gap-1.5 text-xs font-mono text-white/40 flex-shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/5", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[#FF5F1F]/80 font-bold", children: formatTime(currentTime) }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1550,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "/" }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1551,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: formatTime(duration) }, void 0, false, {
            fileName: "/app/applet/src/components/Player.tsx",
            lineNumber: 1552,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Player.tsx",
          lineNumber: 1549,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Player.tsx",
        lineNumber: 1452,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Player.tsx",
      lineNumber: 1433,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/components/Player.tsx",
    lineNumber: 908,
    columnNumber: 5
  }, this);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlBsYXllci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZVJlZiB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHtcbiAgUGxheSxcbiAgUGF1c2UsXG4gIFNraXBGb3J3YXJkLFxuICBTa2lwQmFjayxcbiAgUm90YXRlQ2N3LFxuICBTaHVmZmxlLFxuICBUcmFzaDIsXG4gIE11c2ljLFxuICBTZWFyY2gsXG4gIFJvdGF0ZUN3LFxuICBDYWxlbmRhcixcbiAgRGlzYyxcbiAgTGlzdE11c2ljLFxuICBMb2FkZXIyLFxuICBFZGl0LFxuICBDaGVjayxcbiAgWCxcbiAgQ2hldnJvblVwLFxuICBHaXRodWIsXG4gIFVwbG9hZENsb3VkXG59IGZyb20gXCJsdWNpZGUtcmVhY3RcIjtcbmltcG9ydCB7IFRyYWNrIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBkZWxldGVUcmFjaywgdXBkYXRlVHJhY2tNZXRhZGF0YSB9IGZyb20gXCIuLi9saWIvZGJcIjtcbmltcG9ydCB7IGRldGVjdE1pbWVUeXBlLCBjcmVhdGVTaWxlbnRXYXZCbG9iIH0gZnJvbSBcIi4uL2xpYi9hdWRpb0hlbHBlclwiO1xuaW1wb3J0IHsgZ2V0R2l0SHViQ29uZmlnLCBpc0dpdEh1YkNvbmZpZ3VyZWQsIHVwbG9hZFRyYWNrVG9HaXRIdWIgfSBmcm9tIFwiLi4vbGliL2dpdGh1YlN5bmNcIjtcbmltcG9ydCBzb3VuZEJveEljb24gZnJvbSBcIi4uL2Fzc2V0cy9pbWFnZXMvc291bmRib3hfYXBwX2ljb25fZmxhdF8xNzgzNTIyNzQwNjA1LmpwZ1wiO1xuXG5pbnRlcmZhY2UgUGxheWVyUHJvcHMge1xuICB0cmFja3M6IFRyYWNrW107XG4gIG9uUmVmcmVzaDogKCkgPT4gdm9pZDtcbiAgY3VycmVudFRyYWNrOiBUcmFjayB8IG51bGw7XG4gIG9uU2VsZWN0VHJhY2s6ICh0cmFjazogVHJhY2sgfCBudWxsKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQbGF5ZXIoeyB0cmFja3MsIG9uUmVmcmVzaCwgY3VycmVudFRyYWNrLCBvblNlbGVjdFRyYWNrIH06IFBsYXllclByb3BzKSB7XG4gIC8vIFBsYXlsaXN0IFNlYXJjaCAmIEZpbHRlcmluZ1xuICBjb25zdCBbc2VhcmNoUXVlcnksIHNldFNlYXJjaFF1ZXJ5XSA9IHVzZVN0YXRlKFwiXCIpO1xuXG4gIC8vIFRhYiBTdGF0ZTogXCJhbGxcIiAo5YWo5puyKSB8IFwianBvcFwiICjpgqbmpb0pIHwgXCJ3ZXN0ZXJuXCIgKOa0i+alvSkgfCBcImFydGlzdFwiICjjgqLjg7zjg4bjgqPjgrnjg4gpXG4gIGNvbnN0IFthY3RpdmVUYWIsIHNldEFjdGl2ZVRhYl0gPSB1c2VTdGF0ZTxcImFsbFwiIHwgXCJqcG9wXCIgfCBcIndlc3Rlcm5cIiB8IFwiYXJ0aXN0XCI+KFwiYWxsXCIpO1xuICBjb25zdCBbc2VsZWN0ZWRBcnRpc3QsIHNldFNlbGVjdGVkQXJ0aXN0XSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBcbiAgLy8gQXVkaW8gc3RhdGVcbiAgY29uc3QgW2lzUGxheWluZywgc2V0SXNQbGF5aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2N1cnJlbnRUaW1lLCBzZXRDdXJyZW50VGltZV0gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW2R1cmF0aW9uLCBzZXREdXJhdGlvbl0gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3QgW3ZvbHVtZSwgc2V0Vm9sdW1lXSA9IHVzZVN0YXRlKDAuOCk7XG4gIGNvbnN0IFtpc011dGVkLCBzZXRJc011dGVkXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2xvb3BNb2RlLCBzZXRMb29wTW9kZV0gPSB1c2VTdGF0ZTxcIm5vbmVcIiB8IFwic2luZ2xlXCIgfCBcInF1ZXVlXCI+KFwibm9uZVwiKTtcbiAgY29uc3QgW2lzU2h1ZmZsZSwgc2V0SXNTaHVmZmxlXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICAvLyBQbGF5IHF1ZXVlIG9yZGVyIHN0YXRlXG4gIGNvbnN0IFtzaHVmZmxlZFF1ZXVlLCBzZXRTaHVmZmxlZFF1ZXVlXSA9IHVzZVN0YXRlPHN0cmluZ1tdPihbXSk7XG4gIGNvbnN0IFtwbGF5YmFja0Vycm9yLCBzZXRQbGF5YmFja0Vycm9yXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbaXNQcmVwYXJpbmcsIHNldElzUHJlcGFyaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICAvLyBFZGl0aW5nIHN0YXRlIGZvciB0cmFjayBtZXRhZGF0YVxuICBjb25zdCBbZWRpdGluZ1RyYWNrLCBzZXRFZGl0aW5nVHJhY2tdID0gdXNlU3RhdGU8VHJhY2sgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2VkaXRUaXRsZSwgc2V0RWRpdFRpdGxlXSA9IHVzZVN0YXRlKFwiXCIpO1xuICBjb25zdCBbZWRpdEFydGlzdCwgc2V0RWRpdEFydGlzdF0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2VkaXRHZW5yZSwgc2V0RWRpdEdlbnJlXSA9IHVzZVN0YXRlPFwi6YKm5qW9XCIgfCBcIua0i+alvVwiPihcIumCpualvVwiKTtcbiAgY29uc3QgW3N5bmNpbmdUcmFja0lkLCBzZXRTeW5jaW5nVHJhY2tJZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICBjb25zdCBoYW5kbGVTaW5nbGVUcmFja1N5bmMgPSBhc3luYyAodHJhY2s6IFRyYWNrLCBlOiBSZWFjdC5Nb3VzZUV2ZW50KSA9PiB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBjb25zdCBjb25maWcgPSBnZXRHaXRIdWJDb25maWcoKTtcbiAgICBpZiAoIWlzR2l0SHViQ29uZmlndXJlZChjb25maWcpKSB7XG4gICAgICBhbGVydChcIuS6i+WJjeOBq+eUu+mdouS4iumDqOOBruOAjEdpdEh1YuioreWumuOAjeOBi+OCiVBBVOOBqOODquODneOCuOODiOODquaDheWgseOCkuioreWumuOBl+OBpuOBj+OBoOOBleOBhOOAglwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2V0U3luY2luZ1RyYWNrSWQodHJhY2suaWQpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCB1cGxvYWRUcmFja1RvR2l0SHViKHRyYWNrLCBjb25maWcpO1xuICAgICAgYWxlcnQocmVzLm1lc3NhZ2UpO1xuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiU2luZ2xlIHRyYWNrIEdpdEh1YiBzeW5jIGVycm9yOlwiLCBlcnIpO1xuICAgICAgYWxlcnQoXCJHaXRIdWLjgbjjga4x5puy5ZCM5pyf44Gr5aSx5pWX44GX44G+44GX44GfOiBcIiArIGVyci5tZXNzYWdlKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0U3luY2luZ1RyYWNrSWQobnVsbCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVN0YXJ0RWRpdCA9ICh0cmFjazogVHJhY2spID0+IHtcbiAgICBzZXRFZGl0aW5nVHJhY2sodHJhY2spO1xuICAgIHNldEVkaXRUaXRsZSh0cmFjay50aXRsZSk7XG4gICAgc2V0RWRpdEFydGlzdCh0cmFjay5hcnRpc3QgfHwgXCJcIik7XG4gICAgc2V0RWRpdEdlbnJlKHRyYWNrLmdlbnJlIHx8IFwi6YKm5qW9XCIpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVNhdmVFZGl0ID0gYXN5bmMgKGU/OiBSZWFjdC5Gb3JtRXZlbnQpID0+IHtcbiAgICBpZiAoZSkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmICghZWRpdGluZ1RyYWNrKSByZXR1cm47XG4gICAgaWYgKCFlZGl0VGl0bGUudHJpbSgpKSB7XG4gICAgICBhbGVydChcIuabsuWQjeOBr+W/hemgiOOBp+OBmeOAglwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCB1cGRhdGVUcmFja01ldGFkYXRhKGVkaXRpbmdUcmFjay5pZCwge1xuICAgICAgICB0aXRsZTogZWRpdFRpdGxlLnRyaW0oKSxcbiAgICAgICAgYXJ0aXN0OiBlZGl0QXJ0aXN0LnRyaW0oKSB8fCB1bmRlZmluZWQsXG4gICAgICAgIGdlbnJlOiBlZGl0R2VucmUsXG4gICAgICB9KTtcbiAgICAgIGlmIChjdXJyZW50VHJhY2s/LmlkID09PSBlZGl0aW5nVHJhY2suaWQpIHtcbiAgICAgICAgb25TZWxlY3RUcmFjayh7IC4uLmN1cnJlbnRUcmFjaywgLi4udXBkYXRlZCB9KTtcbiAgICAgIH1cbiAgICAgIHNldEVkaXRpbmdUcmFjayhudWxsKTtcbiAgICAgIG9uUmVmcmVzaCgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgYWxlcnQoXCLmg4XloLHjga7mm7TmlrDjgavlpLHmlZfjgZfjgb7jgZfjgZ/jgIJcIik7XG4gICAgfVxuICB9O1xuICBcbiAgY29uc3QgYXVkaW9SZWYgPSB1c2VSZWY8SFRNTEF1ZGlvRWxlbWVudCB8IG51bGw+KG51bGwpO1xuICBjb25zdCBvYmplY3RVcmxSZWYgPSB1c2VSZWY8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IGxvYWRlZFRyYWNrSWRSZWYgPSB1c2VSZWY8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IHNpbGVudEF1ZGlvUmVmID0gdXNlUmVmPEhUTUxBdWRpb0VsZW1lbnQgfCBudWxsPihudWxsKTtcblxuICAvLyBQcmVsb2FkIHJlZnMgZm9yIHNtb290aCBpT1MgLyBTYWZhcmkgYmFja2dyb3VuZCBjb250aW51b3VzIHBsYXliYWNrIChXSVRIT1VUIGhlYXZ5IEJhc2U2NCBjb252ZXJzaW9uKVxuICBjb25zdCBwcmVsb2FkZWRUcmFja0lkUmVmID0gdXNlUmVmPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBjb25zdCBwcmVsb2FkZWRVcmxSZWYgPSB1c2VSZWY8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IGN1cnJlbnRseVByZWxvYWRpbmdUcmFja0lkUmVmID0gdXNlUmVmPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBjb25zdCBwcmVsb2FkZWRGb3JUcmFja0lkUmVmID0gdXNlUmVmPHN0cmluZyB8IG51bGw+KG51bGwpO1xuXG4gIC8vIERldGVybWluZSBhY3RpdmUgcGxheWxpc3QgYmFzZWQgb24gc2VsZWN0ZWQgdGFiIC8gYXJ0aXN0XG4gIGNvbnN0IGFjdGl2ZVBsYXlsaXN0ID0gUmVhY3QudXNlTWVtbygoKSA9PiB7XG4gICAgc3dpdGNoIChhY3RpdmVUYWIpIHtcbiAgICAgIGNhc2UgXCJqcG9wXCI6XG4gICAgICAgIHJldHVybiB0cmFja3MuZmlsdGVyKCh0KSA9PiB0LmdlbnJlID09PSBcIumCpualvVwiIHx8ICF0LmdlbnJlKTtcbiAgICAgIGNhc2UgXCJ3ZXN0ZXJuXCI6XG4gICAgICAgIHJldHVybiB0cmFja3MuZmlsdGVyKCh0KSA9PiB0LmdlbnJlID09PSBcIua0i+alvVwiKTtcbiAgICAgIGNhc2UgXCJhcnRpc3RcIjpcbiAgICAgICAgaWYgKHNlbGVjdGVkQXJ0aXN0KSB7XG4gICAgICAgICAgcmV0dXJuIHRyYWNrcy5maWx0ZXIoKHQpID0+ICh0LmFydGlzdCB8fCBcIuS4jeaYjuOBquOCouODvOODhuOCo+OCueODiFwiKSA9PT0gc2VsZWN0ZWRBcnRpc3QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIGNhc2UgXCJhbGxcIjpcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB0cmFja3M7XG4gICAgfVxuICB9LCBbdHJhY2tzLCBhY3RpdmVUYWIsIHNlbGVjdGVkQXJ0aXN0XSk7XG5cbiAgLy8gU3RhdGUgcmVmcyB0byBieXBhc3Mgc3RhbGUgY2xvc3VyZXMgaW4gbmF0aXZlIGF1ZGlvIGV2ZW50IGxpc3RlbmVycyAoZXNwZWNpYWxseSBmb3IgaU9TIGJhY2tncm91bmQgbW9kZSlcbiAgY29uc3QgY3VycmVudFRyYWNrUmVmID0gdXNlUmVmKGN1cnJlbnRUcmFjayk7XG4gIGNvbnN0IGlzUGxheWluZ1JlZiA9IHVzZVJlZihpc1BsYXlpbmcpO1xuICBjb25zdCBsb29wTW9kZVJlZiA9IHVzZVJlZihsb29wTW9kZSk7XG4gIGNvbnN0IGlzU2h1ZmZsZVJlZiA9IHVzZVJlZihpc1NodWZmbGUpO1xuICBjb25zdCBhY3RpdmVQbGF5bGlzdFJlZiA9IHVzZVJlZihhY3RpdmVQbGF5bGlzdCk7XG4gIGNvbnN0IHZvbHVtZVJlZiA9IHVzZVJlZih2b2x1bWUpO1xuICBjb25zdCBpc011dGVkUmVmID0gdXNlUmVmKGlzTXV0ZWQpO1xuXG4gIGN1cnJlbnRUcmFja1JlZi5jdXJyZW50ID0gY3VycmVudFRyYWNrO1xuICBpc1BsYXlpbmdSZWYuY3VycmVudCA9IGlzUGxheWluZztcbiAgbG9vcE1vZGVSZWYuY3VycmVudCA9IGxvb3BNb2RlO1xuICBpc1NodWZmbGVSZWYuY3VycmVudCA9IGlzU2h1ZmZsZTtcbiAgYWN0aXZlUGxheWxpc3RSZWYuY3VycmVudCA9IGFjdGl2ZVBsYXlsaXN0O1xuICB2b2x1bWVSZWYuY3VycmVudCA9IHZvbHVtZTtcbiAgaXNNdXRlZFJlZi5jdXJyZW50ID0gaXNNdXRlZDtcblxuICAvLyBGaWx0ZXJlZCB0cmFja3MgKHdpdGhpbiBhY3RpdmUgcGxheWxpc3QpIGZvciBsaXN0IGRpc3BsYXkgJiBzZWFyY2hpbmdcbiAgY29uc3QgZmlsdGVyZWRUcmFja3MgPSBSZWFjdC51c2VNZW1vKCgpID0+IHtcbiAgICByZXR1cm4gYWN0aXZlUGxheWxpc3QuZmlsdGVyKCh0cmFjaykgPT5cbiAgICAgIHRyYWNrLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkgfHxcbiAgICAgICh0cmFjay5hcnRpc3QgJiYgdHJhY2suYXJ0aXN0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkpXG4gICAgKTtcbiAgfSwgW2FjdGl2ZVBsYXlsaXN0LCBzZWFyY2hRdWVyeV0pO1xuXG4gIC8vIEdldCB1bmlxdWUgbGlzdCBvZiBhcnRpc3RzIHdpdGggdHJhY2sgY291bnRzXG4gIGNvbnN0IGFydGlzdHNXaXRoQ291bnRzID0gUmVhY3QudXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3QgY291bnRzOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9ID0ge307XG4gICAgdHJhY2tzLmZvckVhY2goKHRyYWNrKSA9PiB7XG4gICAgICBjb25zdCBhcnRpc3QgPSB0cmFjay5hcnRpc3QgfHwgXCLkuI3mmI7jgarjgqLjg7zjg4bjgqPjgrnjg4hcIjtcbiAgICAgIGNvdW50c1thcnRpc3RdID0gKGNvdW50c1thcnRpc3RdIHx8IDApICsgMTtcbiAgICB9KTtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoY291bnRzKVxuICAgICAgLm1hcCgoW25hbWUsIGNvdW50XSkgPT4gKHsgbmFtZSwgY291bnQgfSkpXG4gICAgICAuc29ydCgoYSwgYikgPT4gYi5jb3VudCAtIGEuY291bnQpO1xuICB9LCBbdHJhY2tzXSk7XG5cbiAgLy8gSGVscGVyIHRvIGdldCBwbGF5IGluZGV4IHdpdGhpbiB0aGUgYWN0aXZlIHBsYXlsaXN0ICh1c2VzIGxvYWRlZFRyYWNrSWRSZWYgdG8gYmUgcmVzaWxpZW50IGluIGJhY2tncm91bmQpXG4gIGNvbnN0IGdldEN1cnJlbnRJbmRleCA9ICgpOiBudW1iZXIgPT4ge1xuICAgIGNvbnN0IGFjdGl2ZVRyYWNrSWQgPSBsb2FkZWRUcmFja0lkUmVmLmN1cnJlbnQgfHwgY3VycmVudFRyYWNrUmVmLmN1cnJlbnQ/LmlkO1xuICAgIGlmICghYWN0aXZlVHJhY2tJZCkgcmV0dXJuIC0xO1xuICAgIHJldHVybiBhY3RpdmVQbGF5bGlzdFJlZi5jdXJyZW50LmZpbmRJbmRleCgodCkgPT4gdC5pZCA9PT0gYWN0aXZlVHJhY2tJZCk7XG4gIH07XG5cbiAgLy8gR2V0IG5leHQgdHJhY2sgY2FuZGlkYXRlIGhlbHBlciAodXNlcyByZWZzIHRvIGJlIHJlc2lsaWVudCBpbiBiYWNrZ3JvdW5kKVxuICBjb25zdCBnZXROZXh0VHJhY2sgPSAoKTogVHJhY2sgfCBudWxsID0+IHtcbiAgICBjb25zdCBwbGF5bGlzdCA9IGFjdGl2ZVBsYXlsaXN0UmVmLmN1cnJlbnQ7XG4gICAgaWYgKHBsYXlsaXN0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBhY3RpdmVUcmFja0lkID0gbG9hZGVkVHJhY2tJZFJlZi5jdXJyZW50IHx8IGN1cnJlbnRUcmFja1JlZi5jdXJyZW50Py5pZDtcblxuICAgIGlmIChpc1NodWZmbGVSZWYuY3VycmVudCkge1xuICAgICAgaWYgKHBsYXlsaXN0Lmxlbmd0aCA+IDEgJiYgYWN0aXZlVHJhY2tJZCkge1xuICAgICAgICBsZXQgbmV4dEluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGxheWxpc3QubGVuZ3RoKTtcbiAgICAgICAgbGV0IHRyaWVzID0gMDtcbiAgICAgICAgd2hpbGUgKHBsYXlsaXN0W25leHRJbmRleF0uaWQgPT09IGFjdGl2ZVRyYWNrSWQgJiYgdHJpZXMgPCAxMCkge1xuICAgICAgICAgIG5leHRJbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBsYXlsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgdHJpZXMrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGxheWxpc3RbbmV4dEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGxheWxpc3QubGVuZ3RoKTtcbiAgICAgIHJldHVybiBwbGF5bGlzdFtyYW5kb21JbmRleF07XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudEluZGV4ID0gZ2V0Q3VycmVudEluZGV4KCk7XG4gICAgaWYgKGN1cnJlbnRJbmRleCA9PT0gLTEgfHwgY3VycmVudEluZGV4ID09PSBwbGF5bGlzdC5sZW5ndGggLSAxKSB7XG4gICAgICBpZiAobG9vcE1vZGVSZWYuY3VycmVudCA9PT0gXCJxdWV1ZVwiIHx8IGN1cnJlbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHBsYXlsaXN0WzBdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwbGF5bGlzdFtjdXJyZW50SW5kZXggKyAxXTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY2xlYW51cFByZWxvYWRlZCA9ICgpID0+IHtcbiAgICBpZiAocHJlbG9hZGVkVXJsUmVmLmN1cnJlbnQpIHtcbiAgICAgIGlmIChwcmVsb2FkZWRVcmxSZWYuY3VycmVudC5zdGFydHNXaXRoKFwiYmxvYjpcIikpIHtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChwcmVsb2FkZWRVcmxSZWYuY3VycmVudCk7XG4gICAgICB9XG4gICAgICBwcmVsb2FkZWRVcmxSZWYuY3VycmVudCA9IG51bGw7XG4gICAgfVxuICAgIHByZWxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCA9IG51bGw7XG4gIH07XG5cbiAgLy8gUHJlbG9hZHMgdGhlIG5leHQgdHJhY2sgY2FuZGlkYXRlIGludG8gYSBCbG9iIFVSTCAocHVyZSBzeW5jaHJvbm91cyBtZW1vcnkgcmVmZXJlbmNlLCBubyBoZWF2eSBCYXNlNjQgY29udmVyc2lvbilcbiAgY29uc3QgdHJpZ2dlclByZWxvYWROZXh0VHJhY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYWN0aXZlVHJhY2tJZCA9IGxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCB8fCBjdXJyZW50VHJhY2tSZWYuY3VycmVudD8uaWQ7XG4gICAgaWYgKCFhY3RpdmVUcmFja0lkIHx8ICFpc1BsYXlpbmdSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgIFxuICAgIC8vIElmIHdlIGFscmVhZHkgcHJlbG9hZGVkIG9yIGFyZSBwcmVsb2FkaW5nIGZvciB0aGlzIHRyYWNrLCBza2lwXG4gICAgaWYgKHByZWxvYWRlZEZvclRyYWNrSWRSZWYuY3VycmVudCA9PT0gYWN0aXZlVHJhY2tJZCkgcmV0dXJuO1xuICAgIHByZWxvYWRlZEZvclRyYWNrSWRSZWYuY3VycmVudCA9IGFjdGl2ZVRyYWNrSWQ7XG5cbiAgICBjb25zdCBuZXh0VHJhY2sgPSBnZXROZXh0VHJhY2soKTtcbiAgICBpZiAoIW5leHRUcmFjaykge1xuICAgICAgY2xlYW51cFByZWxvYWRlZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChuZXh0VHJhY2suaWQgPT09IHByZWxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChuZXh0VHJhY2suaWQgPT09IGN1cnJlbnRseVByZWxvYWRpbmdUcmFja0lkUmVmLmN1cnJlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjbGVhbnVwUHJlbG9hZGVkKCk7XG5cbiAgICB0cnkge1xuICAgICAgY3VycmVudGx5UHJlbG9hZGluZ1RyYWNrSWRSZWYuY3VycmVudCA9IG5leHRUcmFjay5pZDtcbiAgICAgIGNvbnN0IHRhcmdldFRyYWNrSWQgPSBuZXh0VHJhY2suaWQ7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyBiYWNrZ3JvdW5kIHByZWxvYWQgZm9yIG5leHQgdHJhY2s6ICR7bmV4dFRyYWNrLnRpdGxlfWApO1xuICAgICAgY29uc3QgZGV0ZWN0ZWRUeXBlID0gYXdhaXQgZGV0ZWN0TWltZVR5cGUobmV4dFRyYWNrLmJsb2IpO1xuICAgICAgXG4gICAgICBjb25zdCBjdXJyZW50QWN0aXZlVHJhY2tJZCA9IGxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCB8fCBjdXJyZW50VHJhY2tSZWYuY3VycmVudD8uaWQ7XG4gICAgICBpZiAocHJlbG9hZGVkRm9yVHJhY2tJZFJlZi5jdXJyZW50ICE9PSBjdXJyZW50QWN0aXZlVHJhY2tJZCkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBzYW5pdGl6ZWRCbG9iID0gbmV3IEJsb2IoW25leHRUcmFjay5ibG9iXSwgeyB0eXBlOiBkZXRlY3RlZFR5cGUgfSk7XG4gICAgICBjb25zdCBzb3VyY2VVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHNhbml0aXplZEJsb2IpO1xuXG4gICAgICBjb25zdCBmaW5hbEFjdGl2ZVRyYWNrSWQgPSBsb2FkZWRUcmFja0lkUmVmLmN1cnJlbnQgfHwgY3VycmVudFRyYWNrUmVmLmN1cnJlbnQ/LmlkO1xuICAgICAgaWYgKHByZWxvYWRlZEZvclRyYWNrSWRSZWYuY3VycmVudCA9PT0gZmluYWxBY3RpdmVUcmFja0lkICYmIG5leHRUcmFjay5pZCA9PT0gdGFyZ2V0VHJhY2tJZCkge1xuICAgICAgICBwcmVsb2FkZWRVcmxSZWYuY3VycmVudCA9IHNvdXJjZVVybDtcbiAgICAgICAgcHJlbG9hZGVkVHJhY2tJZFJlZi5jdXJyZW50ID0gbmV4dFRyYWNrLmlkO1xuICAgICAgICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IHByZWxvYWRlZCBuZXh0IHRyYWNrOiAke25leHRUcmFjay50aXRsZX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzb3VyY2VVcmwuc3RhcnRzV2l0aChcImJsb2I6XCIpKSB7XG4gICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChzb3VyY2VVcmwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcHJlbG9hZCBuZXh0IHRyYWNrXCIsIGVycik7XG4gICAgICBwcmVsb2FkZWRGb3JUcmFja0lkUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBjdXJyZW50bHlQcmVsb2FkaW5nVHJhY2tJZFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgLy8gQ2xlYXIgZXJyb3Igd2hlbiB0cmFjayBjaGFuZ2VzXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0UGxheWJhY2tFcnJvcihudWxsKTtcbiAgfSwgW2N1cnJlbnRUcmFja10pO1xuXG4gIC8vIENyZWF0ZSBBdWRpbyBpbnN0YW5jZSBvbmNlIG9uIG1vdW50IGFuZCBhdHRhY2ggYWxsIG5hdGl2ZSBsaXN0ZW5lcnMgcGVybWFuZW50bHlcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygpO1xuICAgIGF1ZGlvUmVmLmN1cnJlbnQgPSBhdWRpbztcblxuICAgIC8vIER5bmFtaWNhbGx5IGdlbmVyYXRlIGEgY2xlYW4gMTAtc2Vjb25kIHNpbGVudCBXQVYgZmlsZSB0byBhdm9pZCBoaWdoIENQVSBsb29wIGlzc3VlcyBvbiBpT1MgU2FmYXJpXG4gICAgY29uc3Qgc2lsZW50QmxvYiA9IGNyZWF0ZVNpbGVudFdhdkJsb2IoMTApO1xuICAgIGNvbnN0IHNpbGVudFVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc2lsZW50QmxvYik7XG5cbiAgICBjb25zdCBzaWxlbnRBdWRpbyA9IG5ldyBBdWRpbyhzaWxlbnRVcmwpO1xuICAgIHNpbGVudEF1ZGlvLmxvb3AgPSB0cnVlO1xuICAgIHNpbGVudEF1ZGlvLnZvbHVtZSA9IDAuMDAxOyAvLyBFeHRyZW1lbHkgbG93IGJ1dCBub24temVybyB2b2x1bWUga2VlcHMgYXVkaW8gY2hhbm5lbCBhbGl2ZSBvbiBpT1NcbiAgICBzaWxlbnRBdWRpb1JlZi5jdXJyZW50ID0gc2lsZW50QXVkaW87XG5cbiAgICBjb25zdCBoYW5kbGVUaW1lVXBkYXRlID0gKCkgPT4ge1xuICAgICAgc2V0Q3VycmVudFRpbWUoYXVkaW8uY3VycmVudFRpbWUpO1xuICAgICAgLy8gVHJpZ2dlciBiYWNrZ3JvdW5kIHByZWxvYWRpbmcgb2YgbmV4dCB0cmFjayBhcyBhIGZhbGxiYWNrIGluIHRoZSBsYXN0IDEwIHNlY29uZHMgb2YgdGhlIHNvbmdcbiAgICAgIGlmIChhdWRpby5kdXJhdGlvbiA+IDAgJiYgYXVkaW8uZHVyYXRpb24gLSBhdWRpby5jdXJyZW50VGltZSA8PSAxMCkge1xuICAgICAgICB0cmlnZ2VyUHJlbG9hZE5leHRUcmFjaygpO1xuICAgICAgfVxuICAgIH07XG4gICAgY29uc3QgaGFuZGxlRHVyYXRpb25DaGFuZ2UgPSAoKSA9PiBzZXREdXJhdGlvbihhdWRpby5kdXJhdGlvbiB8fCAwKTtcbiAgICBjb25zdCBoYW5kbGVFbmRlZCA9ICgpID0+IGhhbmRsZVRyYWNrRW5kZWQoKTtcbiAgICBjb25zdCBoYW5kbGVFcnJvciA9ICgpID0+IHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGFjdGl2ZSB0cmFjayBvciB0aGUgc291cmNlIGlzIGVtcHR5L2ludmFsaWQsIGlnbm9yZSB0aGUgZXJyb3JcbiAgICAgIGlmICghY3VycmVudFRyYWNrUmVmLmN1cnJlbnQgfHwgIWF1ZGlvLnNyYyB8fCBhdWRpby5zcmMgPT09IHdpbmRvdy5sb2NhdGlvbi5ocmVmKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBicm93c2VyIGZpcmVkIGFuIGVycm9yIGV2ZW50IGJ1dCBhdWRpby5lcnJvciBpcyBudWxsL3VuZGVmaW5lZCwgaWdub3JlIGl0IChlLmcuIGFib3J0KVxuICAgICAgaWYgKCFhdWRpby5lcnJvcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zb2xlLmVycm9yKFwiQXVkaW8gZXJyb3I6XCIsIGF1ZGlvLmVycm9yKTtcbiAgICAgIGNvbnN0IGVyckNvZGUgPSBhdWRpby5lcnJvci5jb2RlO1xuICAgICAgbGV0IHVzZXJGcmllbmRseU1zZyA9IFwi6Z+z5aOw44Gu5YaN55Sf5Lit44Gr44Ko44Op44O844GM55m655Sf44GX44G+44GX44Gf44CCXCI7XG4gICAgICBpZiAoZXJyQ29kZSA9PT0gMSkgdXNlckZyaWVuZGx5TXNnID0gXCLpn7Plo7Djga7oqq3jgb/ovrzjgb/jgYzkuK3mlq3jgZXjgozjgb7jgZfjgZ/jgIJcIjtcbiAgICAgIGlmIChlcnJDb2RlID09PSAyKSB1c2VyRnJpZW5kbHlNc2cgPSBcIumAmuS/oeOCqOODqeODvOOBq+OCiOOCiumfs+WjsOODh+ODvOOCv+OCkuWPluW+l+OBp+OBjeOBvuOBm+OCk+OBp+OBl+OBn+OAglwiO1xuICAgICAgaWYgKGVyckNvZGUgPT09IDMpIHVzZXJGcmllbmRseU1zZyA9IFwi6Z+z5aOw44OH44O844K/44Gu44OH44Kz44O844OJ44Gr5aSx5pWX44GX44G+44GX44Gf44CC44OV44Kh44Kk44Or44GM5aOK44KM44Gm44GE44KL44GL44CB6Z2e5a++5b+c44Gu5b2i5byP44Gn44GZ44CCXCI7XG4gICAgICBpZiAoZXJyQ29kZSA9PT0gNCkgdXNlckZyaWVuZGx5TXNnID0gXCLpn7Plo7Djgr3jg7zjgrnjgpLoqq3jgb/ovrzjgoHjgb7jgZvjgpPjgafjgZfjgZ/jgIJcIjtcbiAgICAgIHNldFBsYXliYWNrRXJyb3IoYCR7dXNlckZyaWVuZGx5TXNnfSAo44Ko44Op44O844Kz44O844OJOiAke2VyckNvZGUgfHwgXCLkuI3mmI5cIn0pYCk7XG4gICAgICBzZXRJc1BsYXlpbmcoZmFsc2UpO1xuICAgIH07XG5cbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKFwidGltZXVwZGF0ZVwiLCBoYW5kbGVUaW1lVXBkYXRlKTtcbiAgICBhdWRpby5hZGRFdmVudExpc3RlbmVyKFwiZHVyYXRpb25jaGFuZ2VcIiwgaGFuZGxlRHVyYXRpb25DaGFuZ2UpO1xuICAgIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoXCJlbmRlZFwiLCBoYW5kbGVFbmRlZCk7XG4gICAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIGhhbmRsZUVycm9yKTtcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBhdWRpby5wYXVzZSgpO1xuICAgICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRpbWV1cGRhdGVcIiwgaGFuZGxlVGltZVVwZGF0ZSk7XG4gICAgICBhdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKFwiZHVyYXRpb25jaGFuZ2VcIiwgaGFuZGxlRHVyYXRpb25DaGFuZ2UpO1xuICAgICAgYXVkaW8ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImVuZGVkXCIsIGhhbmRsZUVuZGVkKTtcbiAgICAgIGF1ZGlvLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBoYW5kbGVFcnJvcik7XG5cbiAgICAgIGlmIChzaWxlbnRBdWRpb1JlZi5jdXJyZW50KSB7XG4gICAgICAgIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGF1c2UoKTtcbiAgICAgICAgc2lsZW50QXVkaW9SZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaWxlbnRVcmwuc3RhcnRzV2l0aChcImJsb2I6XCIpKSB7XG4gICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwoc2lsZW50VXJsKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iamVjdFVybFJlZi5jdXJyZW50KSB7XG4gICAgICAgIGlmIChvYmplY3RVcmxSZWYuY3VycmVudC5zdGFydHNXaXRoKFwiYmxvYjpcIikpIHtcbiAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKG9iamVjdFVybFJlZi5jdXJyZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sIFtdKTsgLy8gT25seSBydW4gb25jZSBvbiBtb3VudFxuXG4gIC8vIFN5bmMgdm9sdW1lIHdpdGggc3RhdGVcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoYXVkaW9SZWYuY3VycmVudCkge1xuICAgICAgYXVkaW9SZWYuY3VycmVudC52b2x1bWUgPSBpc011dGVkID8gMCA6IHZvbHVtZTtcbiAgICB9XG4gIH0sIFt2b2x1bWUsIGlzTXV0ZWRdKTtcblxuICAvLyBSZXN0b3JlIGF1ZGlvIHNlc3Npb24gZHluYW1pY2FsbHkgd2hlbiBhcHAgYmVjb21lcyBhY3RpdmUgYWdhaW4gKHNlbGYtaGVhbGluZyBvbiBhcHAgdmlzaWJpbGl0eSlcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBoYW5kbGVWaXNpYmlsaXR5Q2hhbmdlID0gKCkgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PT0gXCJ2aXNpYmxlXCIpIHtcbiAgICAgICAgY29uc3QgYXVkaW8gPSBhdWRpb1JlZi5jdXJyZW50O1xuICAgICAgICBpZiAoaXNQbGF5aW5nICYmIGF1ZGlvKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZEJveCBpcyB2aXNpYmxlLiBDaGVja2luZyBhdWRpbyBzZXNzaW9uIGhlYWx0aC4uLlwiKTtcbiAgICAgICAgICBpZiAoYXVkaW8ucGF1c2VkIHx8IGF1ZGlvLm11dGVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkhlYWxlZCBhdWRpbyBzZXNzaW9uIG9uIGFwcCB2aXNpYmlsaXR5IHJlc3VtZS5cIik7XG4gICAgICAgICAgICBhdWRpby5tdXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UG9zID0gYXVkaW8uY3VycmVudFRpbWU7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U3JjID0gYXVkaW8uc3JjO1xuXG4gICAgICAgICAgICBhdWRpby5wbGF5KCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJEaXJlY3QgcGxheSByZXN0b3JlIGZhaWxlZCwgYXR0ZW1wdGluZyBzZXNzaW9uIHJlZnJlc2g6XCIsIGVycik7XG4gICAgICAgICAgICAgIGlmIChjdXJyZW50U3JjICYmIGN1cnJlbnRTcmMgIT09IHdpbmRvdy5sb2NhdGlvbi5ocmVmKSB7XG4gICAgICAgICAgICAgICAgYXVkaW8uc3JjID0gY3VycmVudFNyYztcbiAgICAgICAgICAgICAgICBhdWRpby5jdXJyZW50VGltZSA9IGN1cnJlbnRQb3M7XG4gICAgICAgICAgICAgICAgYXVkaW8ubG9hZCgpO1xuICAgICAgICAgICAgICAgIGF1ZGlvLnBsYXkoKS5jYXRjaChlID0+IGNvbnNvbGUuZXJyb3IoXCJJbnRlcnJ1cHRpb24gc2Vzc2lvbiByZXN0b3JhdGlvbiBmYWlsZWQgY29tcGxldGVseTpcIiwgZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgaGFuZGxlVmlzaWJpbGl0eUNoYW5nZSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsIGhhbmRsZVZpc2liaWxpdHlDaGFuZ2UpO1xuICAgIH07XG4gIH0sIFtpc1BsYXlpbmddKTtcblxuICAvLyBSZXNldCBwcmVsb2FkaW5nIHN0YXRlIG9uIHBsYXlsaXN0L3NodWZmbGUgY2hhbmdlcyBzbyB0aGF0IGNvcnJlY3QgbmV4dCB0cmFjayBpcyBkZXRlcm1pbmVkIHdoZW4gdGltZSBjb21lc1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNsZWFudXBQcmVsb2FkZWQoKTtcbiAgICBwcmVsb2FkZWRGb3JUcmFja0lkUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIFxuICAgIC8vIElmIHdlIGFyZSBhbHJlYWR5IGluIHRoZSBsYXN0IDEwIHNlY29uZHMgb2YgdGhlIHNvbmcsIHRyaWdnZXIgcHJlbG9hZCBpbW1lZGlhdGVseVxuICAgIGNvbnN0IGF1ZGlvID0gYXVkaW9SZWYuY3VycmVudDtcbiAgICBpZiAoYXVkaW8gJiYgaXNQbGF5aW5nICYmIGF1ZGlvLmR1cmF0aW9uID4gMCAmJiBhdWRpby5kdXJhdGlvbiAtIGF1ZGlvLmN1cnJlbnRUaW1lIDw9IDEwKSB7XG4gICAgICB0cmlnZ2VyUHJlbG9hZE5leHRUcmFjaygpO1xuICAgIH1cbiAgfSwgW2lzU2h1ZmZsZSwgbG9vcE1vZGUsIGFjdGl2ZVBsYXlsaXN0XSk7XG5cbiAgLy8gSGFuZGxlIHNvdXJjZSBibG9iIGNoYW5nZXNcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWF1ZGlvUmVmLmN1cnJlbnQpIHJldHVybjtcblxuICAgIGxldCBhY3RpdmUgPSB0cnVlO1xuXG4gICAgaWYgKGN1cnJlbnRUcmFjaykge1xuICAgICAgLy8gQ2xlYXIgcHJlbG9hZGVkRm9yVHJhY2tJZFJlZiBvbiB0cmFjayBjaGFuZ2Ugc28gdGhlIG5ldyB0cmFjayBjYW4gdHJpZ2dlciBpdHMgb3duIHByZWxvYWRcbiAgICAgIHByZWxvYWRlZEZvclRyYWNrSWRSZWYuY3VycmVudCA9IG51bGw7XG5cbiAgICAgIGlmIChsb2FkZWRUcmFja0lkUmVmLmN1cnJlbnQgIT09IGN1cnJlbnRUcmFjay5pZCkge1xuICAgICAgICAvLyBJZiB3ZSBhbHJlYWR5IGhhdmUgYSBwcmVsb2FkZWQgc291cmNlIGZvciB0aGlzIHRyYWNrLCBhcHBseSBpdCBzeW5jaHJvbm91c2x5IHRvIHByZXNlcnZlIGlPUyBhdWRpbyB0aHJlYWRcbiAgICAgICAgaWYgKHByZWxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCA9PT0gY3VycmVudFRyYWNrLmlkICYmIHByZWxvYWRlZFVybFJlZi5jdXJyZW50KSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYFVzaW5nIHByZWxvYWRlZCBzb3VyY2UgZm9yIHRyYWNrOiAke2N1cnJlbnRUcmFjay50aXRsZX1gKTtcbiAgICAgICAgICBjb25zdCBzb3VyY2VVcmwgPSBwcmVsb2FkZWRVcmxSZWYuY3VycmVudDtcblxuICAgICAgICAgIGlmIChvYmplY3RVcmxSZWYuY3VycmVudCAmJiBvYmplY3RVcmxSZWYuY3VycmVudCAhPT0gc291cmNlVXJsKSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0VXJsUmVmLmN1cnJlbnQuc3RhcnRzV2l0aChcImJsb2I6XCIpKSB7XG4gICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob2JqZWN0VXJsUmVmLmN1cnJlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzb3VyY2VVcmwuc3RhcnRzV2l0aChcImJsb2I6XCIpKSB7XG4gICAgICAgICAgICBvYmplY3RVcmxSZWYuY3VycmVudCA9IHNvdXJjZVVybDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2JqZWN0VXJsUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENvbnN1bWUgdGhlIHByZWxvYWRlZCByZWZlcmVuY2VcbiAgICAgICAgICBwcmVsb2FkZWRUcmFja0lkUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICAgIHByZWxvYWRlZFVybFJlZi5jdXJyZW50ID0gbnVsbDtcblxuICAgICAgICAgIGxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCA9IGN1cnJlbnRUcmFjay5pZDsgLy8gTWFyayBhcyBsb2FkZWQgc3luY2hyb25vdXNseVxuXG4gICAgICAgICAgYXVkaW9SZWYuY3VycmVudC5zcmMgPSBzb3VyY2VVcmw7XG4gICAgICAgICAgYXVkaW9SZWYuY3VycmVudC52b2x1bWUgPSBpc011dGVkID8gMCA6IHZvbHVtZTtcbiAgICAgICAgICBhdWRpb1JlZi5jdXJyZW50LmxvYWQoKTtcblxuICAgICAgICAgIGlmIChpc1BsYXlpbmcpIHtcbiAgICAgICAgICAgIGlmIChzaWxlbnRBdWRpb1JlZi5jdXJyZW50ICYmIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGF1c2VkKSB7XG4gICAgICAgICAgICAgIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGxheSgpLmNhdGNoKChlKSA9PiBjb25zb2xlLndhcm4oXCJTaWxlbnQgYXVkaW8gcGxheSBmYWlsZWRcIiwgZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXVkaW9SZWYuY3VycmVudC5wbGF5KCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdXRvcGxheSB3YXMgYmxvY2tlZCBvciBmYWlsZWRcIiwgZXJyKTtcbiAgICAgICAgICAgICAgc2V0SXNQbGF5aW5nKGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXRJc1ByZXBhcmluZyhmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm9ybWFsIGFzeW5jaHJvbm91cyBsb2FkaW5nIGZvciBub24tcHJlbG9hZGVkIHRyYWNrcyAoZS5nLiBtYW51YWwgdGFwcGluZylcbiAgICAgICAgICBpZiAob2JqZWN0VXJsUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3RVcmxSZWYuY3VycmVudC5zdGFydHNXaXRoKFwiYmxvYjpcIikpIHtcbiAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChvYmplY3RVcmxSZWYuY3VycmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvYmplY3RVcmxSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbG9hZFRyYWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc2V0SXNQcmVwYXJpbmcodHJ1ZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGRldGVjdGVkVHlwZSA9IGF3YWl0IGRldGVjdE1pbWVUeXBlKGN1cnJlbnRUcmFjay5ibG9iKTtcbiAgICAgICAgICAgICAgaWYgKCFhY3RpdmUpIHJldHVybjtcblxuICAgICAgICAgICAgICBjb25zdCBzYW5pdGl6ZWRCbG9iID0gbmV3IEJsb2IoW2N1cnJlbnRUcmFjay5ibG9iXSwgeyB0eXBlOiBkZXRlY3RlZFR5cGUgfSk7XG4gICAgICAgICAgICAgIGNvbnN0IHNvdXJjZVVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc2FuaXRpemVkQmxvYik7XG4gICAgICAgICAgICAgIG9iamVjdFVybFJlZi5jdXJyZW50ID0gc291cmNlVXJsO1xuXG4gICAgICAgICAgICAgIGlmICghYWN0aXZlKSByZXR1cm47XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAoYXVkaW9SZWYuY3VycmVudCkge1xuICAgICAgICAgICAgICAgIGxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCA9IGN1cnJlbnRUcmFjay5pZDsgLy8gTWFyayBhcyBsb2FkZWQgc3luY2hyb25vdXNseVxuICAgICAgICAgICAgICAgIGF1ZGlvUmVmLmN1cnJlbnQuc3JjID0gc291cmNlVXJsO1xuICAgICAgICAgICAgICAgIGF1ZGlvUmVmLmN1cnJlbnQudm9sdW1lID0gaXNNdXRlZCA/IDAgOiB2b2x1bWU7XG4gICAgICAgICAgICAgICAgYXVkaW9SZWYuY3VycmVudC5sb2FkKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNQbGF5aW5nKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoc2lsZW50QXVkaW9SZWYuY3VycmVudCAmJiBzaWxlbnRBdWRpb1JlZi5jdXJyZW50LnBhdXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBzaWxlbnRBdWRpb1JlZi5jdXJyZW50LnBsYXkoKS5jYXRjaCgoZSkgPT4gY29uc29sZS53YXJuKFwiU2lsZW50IGF1ZGlvIHBsYXkgZmFpbGVkXCIsIGUpKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGF1ZGlvUmVmLmN1cnJlbnQucGxheSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQXV0b3BsYXkgd2FzIGJsb2NrZWQgb3IgZmFpbGVkXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIHNldElzUGxheWluZyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3Igc2V0dGluZyB1cCBwbGF5YmFjayBzb3VyY2U6XCIsIGVycik7XG4gICAgICAgICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzZXRQbGF5YmFja0Vycm9yKFwi6Z+z5aOw44OH44O844K/44Gu5rqW5YKZ77yI44OH44Kz44O844OJ6Kit5a6a77yJ44Gr5aSx5pWX44GX44G+44GX44Gf44CCXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc2V0SXNQcmVwYXJpbmcoZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGxvYWRUcmFjaygpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBTZWxmLWhlYWxpbmc6IElmIHRoZSB0cmFjayBpcyBhbHJlYWR5IGxvYWRlZCBidXQgYnJvd3NlciBwYXVzZWQgaXQgKGUuZy4gYmFja2dyb3VuZCBzdXNwZW5zaW9uKSwgcmVzdW1lIHBsYXlcbiAgICAgICAgaWYgKGlzUGxheWluZyAmJiBhdWRpb1JlZi5jdXJyZW50ICYmIGF1ZGlvUmVmLmN1cnJlbnQucGF1c2VkKSB7XG4gICAgICAgICAgaWYgKHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQgJiYgc2lsZW50QXVkaW9SZWYuY3VycmVudC5wYXVzZWQpIHtcbiAgICAgICAgICAgIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGxheSgpLmNhdGNoKChlKSA9PiBjb25zb2xlLndhcm4oXCJTaWxlbnQgYXVkaW8gcGxheSBmYWlsZWRcIiwgZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhdWRpb1JlZi5jdXJyZW50LnBsYXkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdXRvcGxheSB3YXMgYmxvY2tlZCBvciBmYWlsZWRcIiwgZXJyKTtcbiAgICAgICAgICAgIHNldElzUGxheWluZyhmYWxzZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIE1lZGlhIFNlc3Npb24gbWV0YWRhdGEgc3luY2hyb25vdXNseVxuICAgICAgdXBkYXRlTWVkaWFTZXNzaW9uTWV0YWRhdGEoY3VycmVudFRyYWNrKTtcblxuICAgICAgLy8gU2V0dXAgTWVkaWEgU2Vzc2lvbiBBY3Rpb24gaGFuZGxlcnNcbiAgICAgIGlmIChcIm1lZGlhU2Vzc2lvblwiIGluIG5hdmlnYXRvcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5hdmlnYXRvci5tZWRpYVNlc3Npb24uc2V0QWN0aW9uSGFuZGxlcihcInBsYXlcIiwgKCkgPT4gaGFuZGxlUGxheVBhdXNlKHRydWUpKTtcbiAgICAgICAgICBuYXZpZ2F0b3IubWVkaWFTZXNzaW9uLnNldEFjdGlvbkhhbmRsZXIoXCJwYXVzZVwiLCAoKSA9PiBoYW5kbGVQbGF5UGF1c2UoZmFsc2UpKTtcbiAgICAgICAgICBuYXZpZ2F0b3IubWVkaWFTZXNzaW9uLnNldEFjdGlvbkhhbmRsZXIoXCJwcmV2aW91c3RyYWNrXCIsICgpID0+IGhhbmRsZVByZXYoKSk7XG4gICAgICAgICAgbmF2aWdhdG9yLm1lZGlhU2Vzc2lvbi5zZXRBY3Rpb25IYW5kbGVyKFwibmV4dHRyYWNrXCIsICgpID0+IGhhbmRsZU5leHQoKSk7XG4gICAgICAgICAgbmF2aWdhdG9yLm1lZGlhU2Vzc2lvbi5zZXRBY3Rpb25IYW5kbGVyKFwic2Vla2JhY2t3YXJkXCIsIChkZXRhaWxzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBkZXRhaWxzLnNlZWtPZmZzZXQgfHwgMTA7XG4gICAgICAgICAgICBpZiAoYXVkaW9SZWYuY3VycmVudCkge1xuICAgICAgICAgICAgICBhdWRpb1JlZi5jdXJyZW50LmN1cnJlbnRUaW1lID0gTWF0aC5tYXgoMCwgYXVkaW9SZWYuY3VycmVudC5jdXJyZW50VGltZSAtIG9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgbmF2aWdhdG9yLm1lZGlhU2Vzc2lvbi5zZXRBY3Rpb25IYW5kbGVyKFwic2Vla2ZvcndhcmRcIiwgKGRldGFpbHMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGRldGFpbHMuc2Vla09mZnNldCB8fCAxMDtcbiAgICAgICAgICAgIGlmIChhdWRpb1JlZi5jdXJyZW50KSB7XG4gICAgICAgICAgICAgIGF1ZGlvUmVmLmN1cnJlbnQuY3VycmVudFRpbWUgPSBNYXRoLm1pbihhdWRpb1JlZi5jdXJyZW50LmR1cmF0aW9uLCBhdWRpb1JlZi5jdXJyZW50LmN1cnJlbnRUaW1lICsgb2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIlNvbWUgTWVkaWFTZXNzaW9uIGV2ZW50cyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgZGV2aWNlLlwiLCBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCBwcmVsb2FkaW5nIHRoZSBuZXh0IHRyYWNrIGltbWVkaWF0ZWx5IHNvIGl0IGlzIGZ1bGx5IHByZWxvYWRlZCBsb25nIGJlZm9yZSB0aGUgc29uZyBlbmRzXG4gICAgICBjb25zdCBwcmVsb2FkVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKGFjdGl2ZSAmJiBpc1BsYXlpbmcpIHtcbiAgICAgICAgICB0cmlnZ2VyUHJlbG9hZE5leHRUcmFjaygpO1xuICAgICAgICB9XG4gICAgICB9LCAxMDAwKTtcblxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgYWN0aXZlID0gZmFsc2U7XG4gICAgICAgIGNsZWFyVGltZW91dChwcmVsb2FkVGltZXIpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9hZGVkVHJhY2tJZFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGF1ZGlvUmVmLmN1cnJlbnQuc3JjID0gXCJcIjtcbiAgICAgIHNldElzUGxheWluZyhmYWxzZSk7XG4gICAgICBzZXRDdXJyZW50VGltZSgwKTtcbiAgICAgIHNldER1cmF0aW9uKDApO1xuICAgICAgaWYgKHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgc2lsZW50QXVkaW9SZWYuY3VycmVudC5wYXVzZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBhY3RpdmUgPSBmYWxzZTtcbiAgICB9O1xuICB9LCBbY3VycmVudFRyYWNrXSk7XG5cbiAgLy8gSGFuZGxlIHBsYXkvcGF1c2Ugc3RhdGUgY2hhbmdlIHdpdGggc2VsZi1oZWFsaW5nIGZvciBpT1MgUFdBIGJhY2tncm91bmQgaW50ZXJydXB0aW9uc1xuICBjb25zdCBoYW5kbGVQbGF5UGF1c2UgPSBhc3luYyAodGFyZ2V0UGxheVN0YXRlPzogYm9vbGVhbikgPT4ge1xuICAgIGlmICghYXVkaW9SZWYuY3VycmVudCB8fCAhY3VycmVudFRyYWNrKSByZXR1cm47XG5cbiAgICBjb25zdCBuZXh0U3RhdGUgPSB0YXJnZXRQbGF5U3RhdGUgIT09IHVuZGVmaW5lZCA/IHRhcmdldFBsYXlTdGF0ZSA6ICFpc1BsYXlpbmc7XG5cbiAgICBpZiAobmV4dFN0YXRlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBhdWRpbyA9IGF1ZGlvUmVmLmN1cnJlbnQ7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2lsZW50QXVkaW9SZWYuY3VycmVudCAmJiBzaWxlbnRBdWRpb1JlZi5jdXJyZW50LnBhdXNlZCkge1xuICAgICAgICAgIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGxheSgpLmNhdGNoKChlKSA9PiBjb25zb2xlLndhcm4oXCJTaWxlbnQgYXVkaW8gcGxheSBmYWlsZWRcIiwgZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU0VMRi1IRUFMSU5HOiBJZiBpT1MgU2FmYXJpIHN1c3BlbmRlZCB0aGUgYXVkaW8gY2hhbm5lbCAoYXVkaW8gaXMgcGF1c2VkIGJ1dCB3ZSB0aG91Z2h0IHdlIHdlcmUgcGxheWluZyksXG4gICAgICAgIC8vIG9yIGlmIHRoZXJlIHdhcyBhbiBpbnRlcnJ1cHRpb24sIHdlIGZvcmNlIHJlLWF0dGFjaCB0aGUgc291cmNlIGFuZCByZXN0b3JlIGN1cnJlbnQgdGltZVxuICAgICAgICAvLyB0byByZS1lc3RhYmxpc2ggdGhlIGlPUyBhdWRpbyBzZXNzaW9uIHNhZmVseS5cbiAgICAgICAgY29uc3QgaXNTdXNwZW5kZWRPckJyb2tlbiA9IGlzUGxheWluZyAmJiBhdWRpby5wYXVzZWQ7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNTdXNwZW5kZWRPckJyb2tlbiAmJiBhdWRpby5zcmMgJiYgYXVkaW8uc3JjICE9PSB3aW5kb3cubG9jYXRpb24uaHJlZikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiaU9TIEF1ZGlvIFNlc3Npb24gcmVzdG9yYXRpb24gdHJpZ2dlcmVkLlwiKTtcbiAgICAgICAgICBjb25zdCBjdXJyZW50UG9zID0gYXVkaW8uY3VycmVudFRpbWU7XG4gICAgICAgICAgY29uc3QgY3VycmVudFNyYyA9IGF1ZGlvLnNyYztcbiAgICAgICAgICBhdWRpby5zcmMgPSBjdXJyZW50U3JjO1xuICAgICAgICAgIGF1ZGlvLmN1cnJlbnRUaW1lID0gY3VycmVudFBvcztcbiAgICAgICAgICBhdWRpby5sb2FkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBhdWRpby5wbGF5KCk7XG4gICAgICAgIHNldElzUGxheWluZyh0cnVlKTtcbiAgICAgICAgaWYgKFwibWVkaWFTZXNzaW9uXCIgaW4gbmF2aWdhdG9yKSB7XG4gICAgICAgICAgbmF2aWdhdG9yLm1lZGlhU2Vzc2lvbi5wbGF5YmFja1N0YXRlID0gXCJwbGF5aW5nXCI7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiUGxheWJhY2sgZmFpbGVkIG9yIHdhcyBibG9ja2VkIGJ5IGlPUyBicm93c2VyIHJlc3RyaWN0aW9uczpcIiwgZXJyKTtcbiAgICAgICAgc2V0SXNQbGF5aW5nKGZhbHNlKTtcbiAgICAgICAgaWYgKFwibWVkaWFTZXNzaW9uXCIgaW4gbmF2aWdhdG9yKSB7XG4gICAgICAgICAgbmF2aWdhdG9yLm1lZGlhU2Vzc2lvbi5wbGF5YmFja1N0YXRlID0gXCJwYXVzZWRcIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBhdWRpb1JlZi5jdXJyZW50LnBhdXNlKCk7XG4gICAgICAgIGlmIChzaWxlbnRBdWRpb1JlZi5jdXJyZW50KSB7XG4gICAgICAgICAgc2lsZW50QXVkaW9SZWYuY3VycmVudC5wYXVzZSgpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIlBhdXNlIGNhbGwgZmFpbGVkIHNsaWdodGx5XCIsIGUpO1xuICAgICAgfVxuICAgICAgc2V0SXNQbGF5aW5nKGZhbHNlKTtcbiAgICAgIGlmIChcIm1lZGlhU2Vzc2lvblwiIGluIG5hdmlnYXRvcikge1xuICAgICAgICBuYXZpZ2F0b3IubWVkaWFTZXNzaW9uLnBsYXliYWNrU3RhdGUgPSBcInBhdXNlZFwiO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBTa2lwIGZvcndhcmQgb3IgYmFja3dhcmQgYnkgMTBzXG4gIGNvbnN0IHNraXBUaW1lID0gKGFtb3VudDogbnVtYmVyKSA9PiB7XG4gICAgaWYgKCFhdWRpb1JlZi5jdXJyZW50KSByZXR1cm47XG4gICAgYXVkaW9SZWYuY3VycmVudC5jdXJyZW50VGltZSA9IE1hdGgubWF4KFxuICAgICAgMCxcbiAgICAgIE1hdGgubWluKGF1ZGlvUmVmLmN1cnJlbnQuZHVyYXRpb24gfHwgMCwgYXVkaW9SZWYuY3VycmVudC5jdXJyZW50VGltZSArIGFtb3VudClcbiAgICApO1xuICB9O1xuXG4gIGNvbnN0IHVwZGF0ZU1lZGlhU2Vzc2lvbk1ldGFkYXRhID0gKHRyYWNrOiBUcmFjaykgPT4ge1xuICAgIGlmIChcIm1lZGlhU2Vzc2lvblwiIGluIG5hdmlnYXRvcikge1xuICAgICAgLy8gQ3JlYXRlIGFic29sdXRlIFVSTCBpZiBzb3VuZEJveEljb24gaXMgYSByZWxhdGl2ZSBwYXRoIChpdCB1c3VhbGx5IGlzIC9hc3NldHMvLi4uKVxuICAgICAgY29uc3QgaWNvblVybCA9IHNvdW5kQm94SWNvbi5zdGFydHNXaXRoKFwiaHR0cFwiKSBcbiAgICAgICAgPyBzb3VuZEJveEljb24gXG4gICAgICAgIDogYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0ke3NvdW5kQm94SWNvbi5zdGFydHNXaXRoKFwiL1wiKSA/IFwiXCIgOiBcIi9cIn0ke3NvdW5kQm94SWNvbn1gO1xuXG4gICAgICBuYXZpZ2F0b3IubWVkaWFTZXNzaW9uLm1ldGFkYXRhID0gbmV3IE1lZGlhTWV0YWRhdGEoe1xuICAgICAgICB0aXRsZTogdHJhY2sudGl0bGUsXG4gICAgICAgIGFydGlzdDogdHJhY2suYXJ0aXN0IHx8IFwi5LiN5piO44Gq44Ki44O844OG44Kj44K544OIXCIsXG4gICAgICAgIGFsYnVtOiBcIlNvdW5kQm94IOOCreODo+ODg+OCt+ODpeabslwiLFxuICAgICAgICBhcnR3b3JrOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiBpY29uVXJsLFxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9qcGVnXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pO1xuICAgICAgbmF2aWdhdG9yLm1lZGlhU2Vzc2lvbi5wbGF5YmFja1N0YXRlID0gXCJwbGF5aW5nXCI7XG4gICAgfVxuICB9O1xuXG4gIC8vIE5leHQgVHJhY2sgTG9naWNcbiAgY29uc3QgaGFuZGxlTmV4dCA9ICgpID0+IHtcbiAgICBjb25zdCBuZXh0VHJhY2sgPSBnZXROZXh0VHJhY2soKTtcbiAgICBcbiAgICBpZiAoIW5leHRUcmFjaykge1xuICAgICAgc2V0SXNQbGF5aW5nKGZhbHNlKTtcbiAgICAgIGlmIChzaWxlbnRBdWRpb1JlZi5jdXJyZW50KSB7XG4gICAgICAgIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGF1c2UoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoc2lsZW50QXVkaW9SZWYuY3VycmVudCAmJiBzaWxlbnRBdWRpb1JlZi5jdXJyZW50LnBhdXNlZCkge1xuICAgICAgc2lsZW50QXVkaW9SZWYuY3VycmVudC5wbGF5KCkuY2F0Y2goKGUpID0+IGNvbnNvbGUud2FybihcIlNpbGVudCBhdWRpbyBwbGF5IGZhaWxlZFwiLCBlKSk7XG4gICAgfVxuXG4gICAgLy8gU3luY2hyb25vdXNseSB1cGRhdGUgdGhlIG1lZGlhIHNlc3Npb24gbWV0YWRhdGEgc28gdGhlIExvY2sgU2NyZWVuIC8gRHluYW1pYyBJc2xhbmQgaXMgaW5zdGFudGx5IHVwZGF0ZWQhXG4gICAgdXBkYXRlTWVkaWFTZXNzaW9uTWV0YWRhdGEobmV4dFRyYWNrKTtcblxuICAgIGlmIChhdWRpb1JlZi5jdXJyZW50KSB7XG4gICAgICBsZXQgc291cmNlVXJsID0gXCJcIjtcbiAgICAgIFxuICAgICAgaWYgKHByZWxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCA9PT0gbmV4dFRyYWNrLmlkICYmIHByZWxvYWRlZFVybFJlZi5jdXJyZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU3luY2hyb25vdXMgaGFuZGxlTmV4dCB1c2luZyBwcmVsb2FkZWQgVVJMXCIpO1xuICAgICAgICBzb3VyY2VVcmwgPSBwcmVsb2FkZWRVcmxSZWYuY3VycmVudDtcbiAgICAgICAgcHJlbG9hZGVkVHJhY2tJZFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgICAgcHJlbG9hZGVkVXJsUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJTeW5jaHJvbm91cyBoYW5kbGVOZXh0IHVzaW5nIG9uLXRoZS1mbHkgQmxvYiBVUkxcIik7XG4gICAgICAgIGNvbnN0IGRldGVjdGVkVHlwZSA9IG5leHRUcmFjay5ibG9iLnR5cGUgfHwgXCJhdWRpby9tcDRcIjtcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkQmxvYiA9IG5ldyBCbG9iKFtuZXh0VHJhY2suYmxvYl0sIHsgdHlwZTogZGV0ZWN0ZWRUeXBlIH0pO1xuICAgICAgICBzb3VyY2VVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHNhbml0aXplZEJsb2IpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG9iamVjdFVybFJlZi5jdXJyZW50ICYmIG9iamVjdFVybFJlZi5jdXJyZW50ICE9PSBzb3VyY2VVcmwpIHtcbiAgICAgICAgICBpZiAob2JqZWN0VXJsUmVmLmN1cnJlbnQuc3RhcnRzV2l0aChcImJsb2I6XCIpKSB7XG4gICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKG9iamVjdFVybFJlZi5jdXJyZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0VXJsUmVmLmN1cnJlbnQgPSBzb3VyY2VVcmw7XG4gICAgICB9XG5cbiAgICAgIGxvYWRlZFRyYWNrSWRSZWYuY3VycmVudCA9IG5leHRUcmFjay5pZDsgLy8gTWFyayBhcyBsb2FkZWQgc3luY2hyb25vdXNseVxuXG4gICAgICBhdWRpb1JlZi5jdXJyZW50LnNyYyA9IHNvdXJjZVVybDtcbiAgICAgIGF1ZGlvUmVmLmN1cnJlbnQudm9sdW1lID0gaXNNdXRlZFJlZi5jdXJyZW50ID8gMCA6IHZvbHVtZVJlZi5jdXJyZW50O1xuICAgICAgYXVkaW9SZWYuY3VycmVudC5sb2FkKCk7XG4gICAgICBhdWRpb1JlZi5jdXJyZW50LnBsYXkoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgc2V0SXNQbGF5aW5nKHRydWUpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJQbGF5YmFjayBmYWlsZWQgb24gaGFuZGxlTmV4dDpcIiwgZXJyKTtcbiAgICAgICAgICBzZXRJc1BsYXlpbmcoZmFsc2UpO1xuICAgICAgICB9KTtcblxuICAgICAgb25TZWxlY3RUcmFjayhuZXh0VHJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICBvblNlbGVjdFRyYWNrKG5leHRUcmFjayk7XG4gICAgICBzZXRJc1BsYXlpbmcodHJ1ZSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFByZXZpb3VzIFRyYWNrIExvZ2ljXG4gIGNvbnN0IGhhbmRsZVByZXYgPSAoKSA9PiB7XG4gICAgY29uc3QgcGxheWxpc3QgPSBhY3RpdmVQbGF5bGlzdFJlZi5jdXJyZW50O1xuICAgIGlmIChwbGF5bGlzdC5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgIC8vIElmIG1vcmUgdGhhbiAzIHNlY29uZHMgaGFzIHBhc3NlZCwgcmVzdGFydCB0aGUgY3VycmVudCBzb25nIGZpcnN0XG4gICAgaWYgKGF1ZGlvUmVmLmN1cnJlbnQgJiYgYXVkaW9SZWYuY3VycmVudC5jdXJyZW50VGltZSA+IDMpIHtcbiAgICAgIGF1ZGlvUmVmLmN1cnJlbnQuY3VycmVudFRpbWUgPSAwO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBuZXh0VHJhY2s6IFRyYWNrIHwgbnVsbCA9IG51bGw7XG5cbiAgICBpZiAoaXNTaHVmZmxlUmVmLmN1cnJlbnQpIHtcbiAgICAgIGNvbnN0IHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGxheWxpc3QubGVuZ3RoKTtcbiAgICAgIG5leHRUcmFjayA9IHBsYXlsaXN0W3JhbmRvbUluZGV4XTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gZ2V0Q3VycmVudEluZGV4KCk7XG4gICAgICBpZiAoY3VycmVudEluZGV4IDw9IDApIHtcbiAgICAgICAgaWYgKGxvb3BNb2RlUmVmLmN1cnJlbnQgPT09IFwicXVldWVcIikge1xuICAgICAgICAgIG5leHRUcmFjayA9IHBsYXlsaXN0W3BsYXlsaXN0Lmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChhdWRpb1JlZi5jdXJyZW50KSBhdWRpb1JlZi5jdXJyZW50LmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHRUcmFjayA9IHBsYXlsaXN0W2N1cnJlbnRJbmRleCAtIDFdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChuZXh0VHJhY2spIHtcbiAgICAgIGlmIChzaWxlbnRBdWRpb1JlZi5jdXJyZW50ICYmIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGF1c2VkKSB7XG4gICAgICAgIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGxheSgpLmNhdGNoKChlKSA9PiBjb25zb2xlLndhcm4oXCJTaWxlbnQgYXVkaW8gcGxheSBmYWlsZWRcIiwgZSkpO1xuICAgICAgfVxuXG4gICAgICB1cGRhdGVNZWRpYVNlc3Npb25NZXRhZGF0YShuZXh0VHJhY2spO1xuXG4gICAgICBpZiAoYXVkaW9SZWYuY3VycmVudCkge1xuICAgICAgICBjb25zdCBkZXRlY3RlZFR5cGUgPSBuZXh0VHJhY2suYmxvYi50eXBlIHx8IFwiYXVkaW8vbXA0XCI7XG4gICAgICAgIGNvbnN0IHNhbml0aXplZEJsb2IgPSBuZXcgQmxvYihbbmV4dFRyYWNrLmJsb2JdLCB7IHR5cGU6IGRldGVjdGVkVHlwZSB9KTtcbiAgICAgICAgY29uc3Qgc291cmNlVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChzYW5pdGl6ZWRCbG9iKTtcblxuICAgICAgICBpZiAob2JqZWN0VXJsUmVmLmN1cnJlbnQgJiYgb2JqZWN0VXJsUmVmLmN1cnJlbnQgIT09IHNvdXJjZVVybCkge1xuICAgICAgICAgIGlmIChvYmplY3RVcmxSZWYuY3VycmVudC5zdGFydHNXaXRoKFwiYmxvYjpcIikpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob2JqZWN0VXJsUmVmLmN1cnJlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvYmplY3RVcmxSZWYuY3VycmVudCA9IHNvdXJjZVVybDtcblxuICAgICAgICBsb2FkZWRUcmFja0lkUmVmLmN1cnJlbnQgPSBuZXh0VHJhY2suaWQ7IC8vIE1hcmsgYXMgbG9hZGVkIHN5bmNocm9ub3VzbHlcblxuICAgICAgICBhdWRpb1JlZi5jdXJyZW50LnNyYyA9IHNvdXJjZVVybDtcbiAgICAgICAgYXVkaW9SZWYuY3VycmVudC52b2x1bWUgPSBpc011dGVkUmVmLmN1cnJlbnQgPyAwIDogdm9sdW1lUmVmLmN1cnJlbnQ7XG4gICAgICAgIGF1ZGlvUmVmLmN1cnJlbnQubG9hZCgpO1xuICAgICAgICBhdWRpb1JlZi5jdXJyZW50LnBsYXkoKVxuICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHNldElzUGxheWluZyh0cnVlKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiUGxheWJhY2sgZmFpbGVkIG9uIGhhbmRsZVByZXY6XCIsIGVycik7XG4gICAgICAgICAgICBzZXRJc1BsYXlpbmcoZmFsc2UpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIG9uU2VsZWN0VHJhY2sobmV4dFRyYWNrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9uU2VsZWN0VHJhY2sobmV4dFRyYWNrKTtcbiAgICAgICAgc2V0SXNQbGF5aW5nKHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBUcmFjayBlbmRlZCB0cmlnZ2VyXG4gIGNvbnN0IGhhbmRsZVRyYWNrRW5kZWQgPSAoKSA9PiB7XG4gICAgaWYgKGxvb3BNb2RlUmVmLmN1cnJlbnQgPT09IFwic2luZ2xlXCIpIHtcbiAgICAgIGlmIChhdWRpb1JlZi5jdXJyZW50KSB7XG4gICAgICAgIGF1ZGlvUmVmLmN1cnJlbnQuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICBhdWRpb1JlZi5jdXJyZW50LnBsYXkoKS5jYXRjaCgoKSA9PiBzZXRJc1BsYXlpbmcoZmFsc2UpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBuZXh0VHJhY2sgPSBnZXROZXh0VHJhY2soKTtcblxuICAgIGlmICghbmV4dFRyYWNrKSB7XG4gICAgICBzZXRJc1BsYXlpbmcoZmFsc2UpO1xuICAgICAgaWYgKHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgc2lsZW50QXVkaW9SZWYuY3VycmVudC5wYXVzZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChzaWxlbnRBdWRpb1JlZi5jdXJyZW50ICYmIHNpbGVudEF1ZGlvUmVmLmN1cnJlbnQucGF1c2VkKSB7XG4gICAgICBzaWxlbnRBdWRpb1JlZi5jdXJyZW50LnBsYXkoKS5jYXRjaCgoZSkgPT4gY29uc29sZS53YXJuKFwiU2lsZW50IGF1ZGlvIHBsYXkgZmFpbGVkXCIsIGUpKTtcbiAgICB9XG5cbiAgICAvLyBTeW5jaHJvbm91c2x5IHVwZGF0ZSB0aGUgbWVkaWEgc2Vzc2lvbiBtZXRhZGF0YSBzbyB0aGUgTG9jayBTY3JlZW4gLyBEeW5hbWljIElzbGFuZCBpcyBpbnN0YW50bHkgdXBkYXRlZCFcbiAgICB1cGRhdGVNZWRpYVNlc3Npb25NZXRhZGF0YShuZXh0VHJhY2spO1xuXG4gICAgaWYgKGF1ZGlvUmVmLmN1cnJlbnQpIHtcbiAgICAgIGxldCBzb3VyY2VVcmwgPSBcIlwiO1xuICAgICAgXG4gICAgICBpZiAocHJlbG9hZGVkVHJhY2tJZFJlZi5jdXJyZW50ID09PSBuZXh0VHJhY2suaWQgJiYgcHJlbG9hZGVkVXJsUmVmLmN1cnJlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJTeW5jaHJvbm91cyBoYW5kbGVUcmFja0VuZGVkIHVzaW5nIHByZWxvYWRlZCBVUkxcIik7XG4gICAgICAgIHNvdXJjZVVybCA9IHByZWxvYWRlZFVybFJlZi5jdXJyZW50O1xuICAgICAgICBwcmVsb2FkZWRUcmFja0lkUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICBwcmVsb2FkZWRVcmxSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlN5bmNocm9ub3VzIGhhbmRsZVRyYWNrRW5kZWQgdXNpbmcgb24tdGhlLWZseSBCbG9iIFVSTFwiKTtcbiAgICAgICAgY29uc3QgZGV0ZWN0ZWRUeXBlID0gbmV4dFRyYWNrLmJsb2IudHlwZSB8fCBcImF1ZGlvL21wNFwiO1xuICAgICAgICBjb25zdCBzYW5pdGl6ZWRCbG9iID0gbmV3IEJsb2IoW25leHRUcmFjay5ibG9iXSwgeyB0eXBlOiBkZXRlY3RlZFR5cGUgfSk7XG4gICAgICAgIHNvdXJjZVVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc2FuaXRpemVkQmxvYik7XG4gICAgICAgIFxuICAgICAgICBpZiAob2JqZWN0VXJsUmVmLmN1cnJlbnQgJiYgb2JqZWN0VXJsUmVmLmN1cnJlbnQgIT09IHNvdXJjZVVybCkge1xuICAgICAgICAgIGlmIChvYmplY3RVcmxSZWYuY3VycmVudC5zdGFydHNXaXRoKFwiYmxvYjpcIikpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob2JqZWN0VXJsUmVmLmN1cnJlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvYmplY3RVcmxSZWYuY3VycmVudCA9IHNvdXJjZVVybDtcbiAgICAgIH1cblxuICAgICAgbG9hZGVkVHJhY2tJZFJlZi5jdXJyZW50ID0gbmV4dFRyYWNrLmlkOyAvLyBNYXJrIGFzIGxvYWRlZCBzeW5jaHJvbm91c2x5XG5cbiAgICAgIGF1ZGlvUmVmLmN1cnJlbnQuc3JjID0gc291cmNlVXJsO1xuICAgICAgYXVkaW9SZWYuY3VycmVudC52b2x1bWUgPSBpc011dGVkUmVmLmN1cnJlbnQgPyAwIDogdm9sdW1lUmVmLmN1cnJlbnQ7XG4gICAgICBhdWRpb1JlZi5jdXJyZW50LmxvYWQoKTtcbiAgICAgIGF1ZGlvUmVmLmN1cnJlbnQucGxheSgpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBzZXRJc1BsYXlpbmcodHJ1ZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIlBsYXliYWNrIGZhaWxlZCBvbiBoYW5kbGVUcmFja0VuZGVkOlwiLCBlcnIpO1xuICAgICAgICAgIHNldElzUGxheWluZyhmYWxzZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICBvblNlbGVjdFRyYWNrKG5leHRUcmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9uU2VsZWN0VHJhY2sobmV4dFRyYWNrKTtcbiAgICAgIHNldElzUGxheWluZyh0cnVlKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSGFuZGxlIFNlZWtiYXIgU2NydWJiaW5nXG4gIGNvbnN0IGhhbmRsZVNjcnViQ2hhbmdlID0gKGU6IFJlYWN0LkNoYW5nZUV2ZW50PEhUTUxJbnB1dEVsZW1lbnQ+KSA9PiB7XG4gICAgY29uc3QgdmFsID0gcGFyc2VGbG9hdChlLnRhcmdldC52YWx1ZSk7XG4gICAgc2V0Q3VycmVudFRpbWUodmFsKTtcbiAgICBpZiAoYXVkaW9SZWYuY3VycmVudCkge1xuICAgICAgYXVkaW9SZWYuY3VycmVudC5jdXJyZW50VGltZSA9IHZhbDtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlRGVsZXRlID0gYXN5bmMgKGlkOiBzdHJpbmcsIGU6IFJlYWN0Lk1vdXNlRXZlbnQpID0+IHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlmICghY29uZmlybShcIuOBk+OBruODiOODqeODg+OCr+OCkuWJiumZpOOBl+OBpuOCguOCiOOCjeOBl+OBhOOBp+OBmeOBi++8n1wiKSkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGRlbGV0ZVRyYWNrKGlkKTtcbiAgICAgIGlmIChjdXJyZW50VHJhY2s/LmlkID09PSBpZCkge1xuICAgICAgICBvblNlbGVjdFRyYWNrKG51bGwpO1xuICAgICAgfVxuICAgICAgb25SZWZyZXNoKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICBhbGVydChcIuODiOODqeODg+OCr+OBruWJiumZpOOBq+WkseaVl+OBl+OBvuOBl+OBn+OAglwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gRm9ybWF0dGluZyBzZWNvbmRzIGludG8gTU06U1NcbiAgY29uc3QgZm9ybWF0VGltZSA9IChzZWNzOiBudW1iZXIpID0+IHtcbiAgICBpZiAoaXNOYU4oc2VjcykpIHJldHVybiBcIjA6MDBcIjtcbiAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNzIC8gNjApO1xuICAgIGNvbnN0IHNlY29uZHMgPSBNYXRoLmZsb29yKHNlY3MgJSA2MCk7XG4gICAgcmV0dXJuIGAke21pbnV0ZXN9OiR7c2Vjb25kcyA8IDEwID8gXCIwXCIgOiBcIlwifSR7c2Vjb25kc31gO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIGxnOmdyaWQtY29scy0xMiBnYXAtNiBwYi0yNCBzbTpwYi0yOFwiPlxuICAgICAgey8qIFRyYWNrIExpc3QgKExlZnQgc2lkZSkgKi99XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImxnOmNvbC1zcGFuLTcgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJvdW5kZWQtM3hsIHAtNSBtZDpwLTYgZmxleCBmbGV4LWNvbCBtaW4taC1bNTIwcHhdIGxnOmgtWzU2MHB4XVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgc206ZmxleC1yb3cgc206aXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNCBtYi00IGJvcmRlci1iIGJvcmRlci13aGl0ZS81IHBiLTRcIj5cbiAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1bI0ZGNUYxRl0gdHJhY2tpbmctd2lkZXN0IGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHVwcGVyY2FzZVwiPlxuICAgICAgICAgICAgPExpc3RNdXNpYyBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtWyNGRjVGMUZdXCIgLz5cbiAgICAgICAgICAgIDxzcGFuPkxPQ0FMX0xJQlJBUlkgKHt0cmFja3MubGVuZ3RofSk8L3NwYW4+XG4gICAgICAgICAgPC9oMz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlXCI+XG4gICAgICAgICAgICA8U2VhcmNoIGNsYXNzTmFtZT1cImFic29sdXRlIGxlZnQtMyB0b3AtMS8yIC10cmFuc2xhdGUteS0xLzIgdy00IGgtNCB0ZXh0LXdoaXRlLzQwXCIgLz5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi5puy5ZCN44O75q2M5omL5ZCN44Gn5qSc57SiLi4uXCJcbiAgICAgICAgICAgICAgdmFsdWU9e3NlYXJjaFF1ZXJ5fVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFNlYXJjaFF1ZXJ5KGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGJnLWJsYWNrLzQwIHRleHQtc2xhdGUtMjAwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgZm9jdXM6Ym9yZGVyLVsjRkY1RjFGXSByb3VuZGVkLWxnIHB5LTIgcGwtOSBwci0zIG91dGxpbmUtbm9uZSB0ZXh0LWJhc2Ugc206dGV4dC14cyB0cmFuc2l0aW9uIGZvbnQtbW9ub1wiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7LyogUGxheWJhY2sgQ2F0ZWdvcnkgVGFicyAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy00IGdhcC0xIHAtMSBiZy1ibGFjay80MCByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItd2hpdGUvMTAgbWItNCBoLTExIGl0ZW1zLWNlbnRlciBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICBzZXRBY3RpdmVUYWIoXCJhbGxcIik7XG4gICAgICAgICAgICAgIHNldFNlbGVjdGVkQXJ0aXN0KG51bGwpO1xuICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YGgtZnVsbCByb3VuZGVkLWxnIHRleHQtWzExcHhdIHNtOnRleHQteHMgZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIGN1cnNvci1wb2ludGVyIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyICR7XG4gICAgICAgICAgICAgIGFjdGl2ZVRhYiA9PT0gXCJhbGxcIlxuICAgICAgICAgICAgICAgID8gXCJiZy1bI0ZGNUYxRl0gdGV4dC1ibGFjayBmb250LWV4dHJhYm9sZFwiXG4gICAgICAgICAgICAgICAgOiBcInRleHQtc2xhdGUtNDAwIGhvdmVyOnRleHQtd2hpdGVcIlxuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAg5YWo5puyXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICBzZXRBY3RpdmVUYWIoXCJqcG9wXCIpO1xuICAgICAgICAgICAgICBzZXRTZWxlY3RlZEFydGlzdChudWxsKTtcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BoLWZ1bGwgcm91bmRlZC1sZyB0ZXh0LVsxMXB4XSBzbTp0ZXh0LXhzIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciAke1xuICAgICAgICAgICAgICBhY3RpdmVUYWIgPT09IFwianBvcFwiXG4gICAgICAgICAgICAgICAgPyBcImJnLVsjRkY1RjFGXSB0ZXh0LWJsYWNrIGZvbnQtZXh0cmFib2xkXCJcbiAgICAgICAgICAgICAgICA6IFwidGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICB9YH1cbiAgICAgICAgICA+XG4gICAgICAgICAgICDpgqbmpb1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgIHNldEFjdGl2ZVRhYihcIndlc3Rlcm5cIik7XG4gICAgICAgICAgICAgIHNldFNlbGVjdGVkQXJ0aXN0KG51bGwpO1xuICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YGgtZnVsbCByb3VuZGVkLWxnIHRleHQtWzExcHhdIHNtOnRleHQteHMgZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsIGN1cnNvci1wb2ludGVyIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyICR7XG4gICAgICAgICAgICAgIGFjdGl2ZVRhYiA9PT0gXCJ3ZXN0ZXJuXCJcbiAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgZm9udC1leHRyYWJvbGRcIlxuICAgICAgICAgICAgICAgIDogXCJ0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIOa0i+alvVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgc2V0QWN0aXZlVGFiKFwiYXJ0aXN0XCIpO1xuICAgICAgICAgICAgICBzZXRTZWxlY3RlZEFydGlzdChudWxsKTtcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BoLWZ1bGwgcm91bmRlZC1sZyB0ZXh0LVsxMXB4XSBzbTp0ZXh0LXhzIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciAke1xuICAgICAgICAgICAgICBhY3RpdmVUYWIgPT09IFwiYXJ0aXN0XCJcbiAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgZm9udC1leHRyYWJvbGRcIlxuICAgICAgICAgICAgICAgIDogXCJ0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgID5cbiAgICAgICAgICAgIOatjOaJi1xuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7YWN0aXZlVGFiID09PSBcImFydGlzdFwiICYmICFzZWxlY3RlZEFydGlzdCA/IChcbiAgICAgICAgICAvKiBBcnRpc3RzIERpcmVjdG9yeSBMaXN0ICovXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgb3ZlcmZsb3cteS1hdXRvIHByLTEgc3BhY2UteS0yIHNjcm9sbGJhci10aGluIHNjcm9sbGJhci10aHVtYi13aGl0ZS8xNSBzY3JvbGxiYXItdHJhY2stdHJhbnNwYXJlbnRcIj5cbiAgICAgICAgICAgIHthcnRpc3RzV2l0aENvdW50cy5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgaC1mdWxsIHRleHQtd2hpdGUvMzAgc3BhY2UteS0zXCI+XG4gICAgICAgICAgICAgICAgPERpc2MgY2xhc3NOYW1lPVwidy0xMiBoLTEyIHN0cm9rZS1bMS4yXSB0ZXh0LVsjRkY1RjFGXS80MCBhbmltYXRlLXB1bHNlXCIgLz5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtbW9ubyB0ZXh0LWNlbnRlclwiPuODqeOCpOODluODqeODquOBq+absuOBjOOBguOCiuOBvuOBm+OCk+OAgjxiciAvPuabsuOCkuWkieaPm+OBl+OBpui/veWKoOOBl+OBpuOBj+OBoOOBleOBhOOAgjwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgZ2FwLTIgcGItMlwiPlxuICAgICAgICAgICAgICAgIHthcnRpc3RzV2l0aENvdW50cy5tYXAoKHsgbmFtZSwgY291bnQgfSkgPT4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e25hbWV9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkQXJ0aXN0KG5hbWUpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gcC00IHJvdW5kZWQteGwgY3Vyc29yLXBvaW50ZXIgdHJhbnNpdGlvbiBib3JkZXIgYmctYmxhY2svMjAgaG92ZXI6Ymctd2hpdGUvNSBib3JkZXItd2hpdGUvNSB0ZXh0LXNsYXRlLTMwMCBob3Zlcjpib3JkZXItWyNGRjVGMUZdLzMwIGdyb3VwXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgcm91bmRlZC1sZyBiZy13aGl0ZS81IHRleHQtc2xhdGUtNDAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdyb3VwLWhvdmVyOmJnLVsjRkY1RjFGXS8xNSBncm91cC1ob3Zlcjp0ZXh0LVsjRkY1RjFGXSB0cmFuc2l0aW9uLWNvbG9ycyBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8RGlzYyBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi13LTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1zZW1pYm9sZCB0cnVuY2F0ZSB0ZXh0LXNsYXRlLTEwMCBncm91cC1ob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tY29sb3JzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIGZvbnQtbW9ub1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7Y291bnR9IOabsuOBjOeZu+mMsuOBleOCjOOBpuOBhOOBvuOBmVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgLyogVHJhY2tzIGxpc3QgcmVuZGVyIChmb3IgYWxsLCBqcG9wLCB3ZXN0ZXJuLCBvciBzZWxlY3RlZCBhcnRpc3QpICovXG4gICAgICAgICAgPD5cbiAgICAgICAgICAgIHsvKiBJZiBpbnNpZGUgYXJ0aXN0IGdyb3VwLCBzaG93IGJhY2sgbmF2aWdhdGlvbiBiYXIgKi99XG4gICAgICAgICAgICB7YWN0aXZlVGFiID09PSBcImFydGlzdFwiICYmIHNlbGVjdGVkQXJ0aXN0ICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0zIGJnLVsjRkY1RjFGXS8xMCBib3JkZXIgYm9yZGVyLVsjRkY1RjFGXS8yMCByb3VuZGVkLXhsIHAtMiBmbGV4LXNocmluay0wIGFuaW1hdGUtZmFkZS1pblwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkQXJ0aXN0KG51bGwpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicHgtNCBweS0yIGJnLWJsYWNrLzQwIGhvdmVyOmJnLWJsYWNrLzYwIHRleHQtWyNGRjVGMUZdIGZvbnQtYm9sZCB0ZXh0LXhzIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgY3Vyc29yLXBvaW50ZXIgYm9yZGVyIGJvcmRlci13aGl0ZS81IGFjdGl2ZTpzY2FsZS05NVwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAg4oaQIOaIu+OCi1xuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLXctMCBmbGV4LTEgcGwtMVwiPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjRkY1RjFGXVwiPlxuICAgICAgICAgICAgICAgICAgICBTSU5HRVIgUExBWUxJU1RcbiAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1zZW1pYm9sZCB0cnVuY2F0ZSB0ZXh0LXNsYXRlLTIwMFwiPlxuICAgICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRBcnRpc3R9ICh7YWN0aXZlUGxheWxpc3QubGVuZ3RofeabsilcbiAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy15LWF1dG8gcHItMSBzcGFjZS15LTIgc2Nyb2xsYmFyLXRoaW4gc2Nyb2xsYmFyLXRodW1iLXdoaXRlLzE1IHNjcm9sbGJhci10cmFjay10cmFuc3BhcmVudFwiPlxuICAgICAgICAgICAgICB7ZmlsdGVyZWRUcmFja3MubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgaC1mdWxsIHRleHQtd2hpdGUvMzAgc3BhY2UteS0zXCI+XG4gICAgICAgICAgICAgICAgICA8RGlzYyBjbGFzc05hbWU9XCJ3LTEyIGgtMTIgc3Ryb2tlLVsxLjJdIHRleHQtWyNGRjVGMUZdLzQwIGFuaW1hdGUtcHVsc2VcIiAvPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LW1vbm9cIj5cbiAgICAgICAgICAgICAgICAgICAge3NlYXJjaFF1ZXJ5ID8gXCLkuIDoh7TjgZnjgovmm7LjgYzopovjgaTjgYvjgorjgb7jgZvjgpPjgafjgZfjgZ/jgIJcIiA6IFwi44GT44Gu44Kw44Or44O844OX44Gr44Gv5puy44GM44GC44KK44G+44Gb44KT44CCXCJ9XG4gICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgZmlsdGVyZWRUcmFja3MubWFwKCh0cmFjaykgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgaXNBY3RpdmUgPSBjdXJyZW50VHJhY2s/LmlkID09PSB0cmFjay5pZDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICBrZXk9e3RyYWNrLmlkfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uU2VsZWN0VHJhY2sodHJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SXNQbGF5aW5nKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZ3JvdXAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHAtMyByb3VuZGVkLXhsIGN1cnNvci1wb2ludGVyIHRyYW5zaXRpb24gYm9yZGVyICR7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0FjdGl2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdLzEwIGJvcmRlci1bI0ZGNUYxRl0vNDAgdGV4dC1bI0ZGNUYxRl1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiYmctYmxhY2svMjAgaG92ZXI6Ymctd2hpdGUvNSBib3JkZXItd2hpdGUvNSB0ZXh0LXNsYXRlLTMwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIG1pbi13LTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgdy05IGgtOSByb3VuZGVkLWxnIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNBY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gXCJiZy1bI0ZGNUYxRl0gdGV4dC1ibGFja1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiYmctd2hpdGUvNSB0ZXh0LXNsYXRlLTQwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7aXNBY3RpdmUgJiYgaXNQbGF5aW5nID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEaXNjIGNsYXNzTmFtZT1cInctNSBoLTUgYW5pbWF0ZS1zcGluXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8TXVzaWMgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLXctMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdHJ1bmNhdGUgcHItMlwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0cmFjay50aXRsZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG10LTAuNVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0cmFjay5hcnRpc3QgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPXtgdGV4dC14cyB0cnVuY2F0ZSAke2lzQWN0aXZlID8gXCJ0ZXh0LVsjRkY1RjFGXS83MFwiIDogXCJ0ZXh0LXNsYXRlLTQwMFwifWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dHJhY2suYXJ0aXN0fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBweC0xLjUgcHktMC41IHJvdW5kZWQgYmctd2hpdGUvNSB0ZXh0LXdoaXRlLzQwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3QgZm9udC1ib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dHJhY2suZ2VucmUgfHwgXCLpgqbmpb1cIn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGZsZXgtc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KGUpID0+IGhhbmRsZVNpbmdsZVRyYWNrU3luYyh0cmFjaywgZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtzeW5jaW5nVHJhY2tJZCA9PT0gdHJhY2suaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiB0ZXh0LXdoaXRlLzMwIGhvdmVyOnRleHQtWyNGRjVGMUZdIGhvdmVyOmJnLVsjRkY1RjFGXS8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24gZHVyYXRpb24tMjAwIGN1cnNvci1wb2ludGVyIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIuOBk+OBruabsuOCkkdpdEh1YuOBuDHmm7LlkIzmnJ/jg7vkv53nrqFcIlxuICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICB7c3luY2luZ1RyYWNrSWQgPT09IHRyYWNrLmlkID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxMb2FkZXIyIGNsYXNzTmFtZT1cInctNCBoLTQgYW5pbWF0ZS1zcGluIHRleHQtWyNGRjVGMUZdXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VXBsb2FkQ2xvdWQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVN0YXJ0RWRpdCh0cmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiB0ZXh0LXdoaXRlLzMwIGhvdmVyOnRleHQtWyNGRjVGMUZdIGhvdmVyOmJnLVsjRkY1RjFGXS8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24gZHVyYXRpb24tMjAwIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCLmg4XloLHjgpLnt6jpm4ZcIlxuICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8RWRpdCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoZSkgPT4gaGFuZGxlRGVsZXRlKHRyYWNrLmlkLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHRleHQtd2hpdGUvMzAgaG92ZXI6dGV4dC1yb3NlLTUwMCBob3ZlcjpiZy1yb3NlLTUwMC8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24gZHVyYXRpb24tMjAwIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCLjgZPjga7mm7LjgpLliYrpmaRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8VHJhc2gyIGNsYXNzTmFtZT1cInctNCBoLTRcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC8+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgey8qIE1haW4gUGxheWluZyBDb250cm9sIERlY2sgKFJpZ2h0IHNpZGUpICovfVxuICAgICAgPGRpdiBpZD1cIm1haW4tcGxheWVyLWRlY2tcIiBjbGFzc05hbWU9XCJsZzpjb2wtc3Bhbi01IGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLTN4bCBwLTUgbWQ6cC02IGZsZXggZmxleC1jb2wganVzdGlmeS1iZXR3ZWVuIG1pbi1oLVs1MDBweF0gbGc6aC1bNTYwcHhdIHNoYWRvdy0yeGwgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgIHsvKiBBYnN0cmFjdCBkZXNpZ24gdmlueWwgZ2xvdyBiYWNrZ3JvdW5kIGVmZmVjdCAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtcmlnaHQtMTYgLXRvcC0xNiB3LTQ4IGgtNDggYmctWyNGRjVGMUZdLzUgcm91bmRlZC1mdWxsIGJsdXItM3hsIHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIC1sZWZ0LTE2IC1ib3R0b20tMTYgdy00OCBoLTQ4IGJnLVsjRkY1RjFGXS81IHJvdW5kZWQtZnVsbCBibHVyLTN4bCBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cblxuICAgICAgICB7Y3VycmVudFRyYWNrID8gKFxuICAgICAgICAgIDw+XG4gICAgICAgICAgICB7LyogU3Bpbm5pbmcgZGlzYyBhcnQgKi99XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIHRleHQtY2VudGVyIHNwYWNlLXktNSBteS1hdXRvXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2B3LTQwIGgtNDAgcm91bmRlZC1mdWxsIGJnLVsjMGEwYTBhXSBib3JkZXItWzVweF0gYm9yZGVyLXdoaXRlLzEwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHNoYWRvdy0yeGwgcmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuICR7XG4gICAgICAgICAgICAgICAgICAgIGlzUGxheWluZyA/IFwiYW5pbWF0ZS1zcGluLXNsb3dcIiA6IFwiXCJcbiAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uRHVyYXRpb246IFwiOHNcIixcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgey8qIFZpbnlsIFJlY29yZCBHcm9vdmVzICovfVxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0yIHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXdoaXRlLzUgcG9pbnRlci1ldmVudHMtbm9uZVwiIC8+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTUgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItd2hpdGUvNSBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtOSByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci13aGl0ZS81IHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0xNCByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci13aGl0ZS81IHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuXG4gICAgICAgICAgICAgICAgICB7LyogQ2VudGVyIGN1c3RvbSBhcHAgaWNvbiBsYWJlbCAqL31cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xNCBoLTE0IHJvdW5kZWQtZnVsbCBvdmVyZmxvdy1oaWRkZW4gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB6LTEwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbWcgXG4gICAgICAgICAgICAgICAgICAgICAgc3JjPXtzb3VuZEJveEljb259IFxuICAgICAgICAgICAgICAgICAgICAgIGFsdD1cIlNvdW5kQm94IExhYmVsXCIgXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy1mdWxsIGgtZnVsbCBvYmplY3QtY292ZXJcIlxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMS8yIGxlZnQtMS8yIC10cmFuc2xhdGUteC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB3LTMuNSBoLTMuNSByb3VuZGVkLWZ1bGwgYmctWyNGRjVGMUZdIHBvaW50ZXItZXZlbnRzLW5vbmUgYm9yZGVyIGJvcmRlci1ibGFjayBzaGFkb3cgZ2xvdy1vcmFuZ2UtZG90IHotMjBcIiAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMiBtYXgtdy1mdWxsIHB4LTJcIj5cbiAgICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC1iYXNlIGZvbnQtYm9sZCB0ZXh0LXdoaXRlIGxpbmUtY2xhbXAtMSB0cmFja2luZy10aWdodFwiPlxuICAgICAgICAgICAgICAgICAge2N1cnJlbnRUcmFjay50aXRsZX1cbiAgICAgICAgICAgICAgICA8L2g0PlxuICAgICAgICAgICAgICAgIHtwbGF5YmFja0Vycm9yICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctcm9zZS01MDAvMTAgYm9yZGVyIGJvcmRlci1yb3NlLTUwMC8zMCB0ZXh0LXJvc2UtNDAwIHB4LTMgcHktMiByb3VuZGVkLXhsIHRleHQtWzEwcHhdIGZvbnQtbW9ubyBsZWFkaW5nLXJlbGF4ZWQgbWF4LXctWzI4MHB4XSBteC1hdXRvIGFuaW1hdGUtcHVsc2VcIj5cbiAgICAgICAgICAgICAgICAgICAg4pqg77iPIHtwbGF5YmFja0Vycm9yfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICB7aXNQcmVwYXJpbmcgJiYgKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMS41IHRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LVsjRkY1RjFGXSB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IGJnLVsjRkY1RjFGXS8xMCBib3JkZXIgYm9yZGVyLVsjRkY1RjFGXS8yMCBweC0zIHB5LTEuNSByb3VuZGVkLWZ1bGwgYW5pbWF0ZS1wdWxzZSB3LWZpdCBteC1hdXRvXCI+XG4gICAgICAgICAgICAgICAgICAgIDxMb2FkZXIyIGNsYXNzTmFtZT1cInctMy41IGgtMy41IGFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPuODh+OCs+ODvOODieacgOmBqeWMluS4rS4uLjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiBmbGV4LXdyYXBcIj5cbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS00MDAgZm9udC1tZWRpdW0gdHJ1bmNhdGUgbWF4LXctWzE1MHB4XVwiPlxuICAgICAgICAgICAgICAgICAgICB7Y3VycmVudFRyYWNrLmFydGlzdCB8fCBcIuS4jeaYjuOBquOCouODvOODhuOCo+OCueODiFwifVxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS8yMCB0ZXh0LXhzXCI+4oCiPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVTdGFydEVkaXQoY3VycmVudFRyYWNrKX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXdoaXRlLzQwIGhvdmVyOnRleHQtWyNGRjVGMUZdIHRyYW5zaXRpb24tY29sb3JzIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGN1cnNvci1wb2ludGVyIGJnLXdoaXRlLzUgaG92ZXI6YmctWyNGRjVGMUZdLzEwIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbFwiXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPVwi5puy44Gu5oOF5aCx44KS57eo6ZuGXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPEVkaXQgY2xhc3NOYW1lPVwidy0zIGgtMyB0ZXh0LVsjRkY1RjFGXVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPue3qOmbhjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC13aGl0ZS8yMCB0ZXh0LXhzXCI+4oCiPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoZSkgPT4gaGFuZGxlRGVsZXRlKGN1cnJlbnRUcmFjay5pZCwgZSl9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC13aGl0ZS80MCBob3Zlcjp0ZXh0LXJvc2UtNDAwIHRyYW5zaXRpb24tY29sb3JzIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGN1cnNvci1wb2ludGVyIGJnLXdoaXRlLzUgaG92ZXI6Ymctcm9zZS01MDAvMTAgcHgtMiBweS0wLjUgcm91bmRlZC1mdWxsXCJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCLnj77lnKjlho3nlJ/kuK3jga7mm7LjgpLliYrpmaRcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8VHJhc2gyIGNsYXNzTmFtZT1cInctMy41IGgtMy41IHRleHQtcm9zZS01MDAvNzBcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj7liYrpmaQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIHRleHQtWyNGRjVGMUZdIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICAgICAgSElHSC1SRVMgREVDT0RJTkdcbiAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiBQbGF5YmFjayBDb250cm9scyAmIHNsaWRlcnMgKi99XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNVwiPlxuICAgICAgICAgICAgICB7LyogU2NydWIgU2xpZGVyICovfVxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cInJhbmdlXCJcbiAgICAgICAgICAgICAgICAgIG1pbj1cIjBcIlxuICAgICAgICAgICAgICAgICAgbWF4PXtkdXJhdGlvbiB8fCAxMDB9XG4gICAgICAgICAgICAgICAgICB2YWx1ZT17Y3VycmVudFRpbWV9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17aGFuZGxlU2NydWJDaGFuZ2V9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYWNjZW50LVsjRkY1RjFGXSBoLTEgYmctd2hpdGUvMTAgcm91bmRlZC1sZyBhcHBlYXJhbmNlLW5vbmUgY3Vyc29yLXBvaW50ZXJcIlxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LVsxMHB4XSB0ZXh0LXdoaXRlLzQwIGZvbnQtbW9ubyB0cmFja2luZy13aWRlclwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+e2Zvcm1hdFRpbWUoY3VycmVudFRpbWUpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPntmb3JtYXRUaW1lKGR1cmF0aW9uKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIHsvKiBBY3Rpb24gVG9vbGJhciAoU2h1ZmZsZSwgU2tpcCwgUGxheSwgTG9vcCkgKi99XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHctZnVsbCBtYXgtdy1bMzQwcHhdIG14LWF1dG8gcHgtMVwiPlxuICAgICAgICAgICAgICAgIHsvKiBTaHVmZmxlIEJ1dHRvbiAqL31cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRJc1NodWZmbGUoIWlzU2h1ZmZsZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwLTIgcm91bmRlZC1sZyB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIGZsZXgtc2hyaW5rLTAgJHtcbiAgICAgICAgICAgICAgICAgICAgaXNTaHVmZmxlID8gXCJ0ZXh0LVsjRkY1RjFGXSBiZy1bI0ZGNUYxRl0vMTBcIiA6IFwidGV4dC13aGl0ZS80MCBob3Zlcjp0ZXh0LVsjRkY1RjFGXVwiXG4gICAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICAgIHRpdGxlPVwi44K344Oj44OD44OV44OrXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8U2h1ZmZsZSBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgIHsvKiBTa2lwQmFjayBCdXR0b24gKi99XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlUHJldn1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiB0ZXh0LXNsYXRlLTMwMCBob3Zlcjp0ZXh0LVsjRkY1RjFGXSBob3ZlcjpiZy13aGl0ZS81IHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIGZsZXgtc2hyaW5rLTBcIlxuICAgICAgICAgICAgICAgICAgdGl0bGU9XCLliY3jga7mm7LjgbhcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTa2lwQmFjayBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgIHsvKiAxMHMgUmV3aW5kIEJ1dHRvbiAqL31cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBza2lwVGltZSgtMTApfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHRleHQtd2hpdGUvNDAgaG92ZXI6dGV4dC1bI0ZGNUYxRl0gdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlciBmbGV4LXNocmluay0wXCJcbiAgICAgICAgICAgICAgICAgIHRpdGxlPVwiMTDnp5LmiLvjgotcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxSb3RhdGVDY3cgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgICAgICAgICB7LyogUGxheS9QYXVzZSBCdXR0b24gKi99XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlUGxheVBhdXNlKCl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTE0IGgtMTQgYmctWyNGRjVGMUZdIGhvdmVyOmJnLWFtYmVyLTUwMCB0ZXh0LWJsYWNrIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3cteGwgdHJhbnNpdGlvbiB0cmFuc2Zvcm0gYWN0aXZlOnNjYWxlLTk1IGN1cnNvci1wb2ludGVyIGdsb3ctb3JhbmdlIGZsZXgtc2hyaW5rLTBcIlxuICAgICAgICAgICAgICAgICAgdGl0bGU9e2lzUGxheWluZyA/IFwi5LiA5pmC5YGc5q2iXCIgOiBcIuWGjeeUn1wifVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtpc1BsYXlpbmcgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxQYXVzZSBjbGFzc05hbWU9XCJ3LTYgaC02IGZpbGwtYmxhY2tcIiAvPlxuICAgICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgPFBsYXkgY2xhc3NOYW1lPVwidy02IGgtNiBmaWxsLWJsYWNrIHRyYW5zbGF0ZS14LTAuNVwiIC8+XG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgICAgey8qIDEwcyBGYXN0Rm9yd2FyZCBCdXR0b24gKi99XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2tpcFRpbWUoMTApfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHRleHQtd2hpdGUvNDAgaG92ZXI6dGV4dC1bI0ZGNUYxRl0gdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlciBmbGV4LXNocmluay0wXCJcbiAgICAgICAgICAgICAgICAgIHRpdGxlPVwiMTDnp5LpgLLjgoBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxSb3RhdGVDdyBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgIHsvKiBTa2lwRm9yd2FyZCBCdXR0b24gKi99XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlTmV4dH1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiB0ZXh0LXNsYXRlLTMwMCBob3Zlcjp0ZXh0LVsjRkY1RjFGXSBob3ZlcjpiZy13aGl0ZS81IHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIGZsZXgtc2hyaW5rLTBcIlxuICAgICAgICAgICAgICAgICAgdGl0bGU9XCLmrKHjga7mm7LjgbhcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTa2lwRm9yd2FyZCBjbGFzc05hbWU9XCJ3LTUgaC01XCIgLz5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgICAgIHsvKiBMb29wIE1vZGUgc2VsZWN0b3IgKi99XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9vcE1vZGUgPT09IFwibm9uZVwiKSBzZXRMb29wTW9kZShcInF1ZXVlXCIpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb29wTW9kZSA9PT0gXCJxdWV1ZVwiKSBzZXRMb29wTW9kZShcInNpbmdsZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBzZXRMb29wTW9kZShcIm5vbmVcIik7XG4gICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcC0yIHJvdW5kZWQtbGcgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlciByZWxhdGl2ZSBmbGV4LXNocmluay0wICR7XG4gICAgICAgICAgICAgICAgICAgIGxvb3BNb2RlICE9PSBcIm5vbmVcIiA/IFwidGV4dC1bI0ZGNUYxRl0gYmctWyNGRjVGMUZdLzEwXCIgOiBcInRleHQtd2hpdGUvNDAgaG92ZXI6dGV4dC1bI0ZGNUYxRl1cIlxuICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICB0aXRsZT17bG9vcE1vZGUgPT09IFwic2luZ2xlXCIgPyBcIjHmm7Ljg6vjg7zjg5fkuK1cIiA6IGxvb3BNb2RlID09PSBcInF1ZXVlXCIgPyBcIuWFqOabsuODq+ODvOODl+S4rVwiIDogXCLjg6vjg7zjg5fjgqrjg5VcIn1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8Um90YXRlQ2N3IGNsYXNzTmFtZT1cInctNSBoLTVcIiAvPlxuICAgICAgICAgICAgICAgICAge2xvb3BNb2RlID09PSBcInNpbmdsZVwiICYmIChcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWJzb2x1dGUgYm90dG9tLTAuNSByaWdodC0wLjUgdGV4dC1bOHB4XSBmb250LWJvbGQgYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgcm91bmRlZC1mdWxsIHctMy41IGgtMy41IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGJvcmRlciBib3JkZXItYmxhY2sgZm9udC1tb25vXCI+XG4gICAgICAgICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAge2xvb3BNb2RlID09PSBcInF1ZXVlXCIgJiYgKFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBib3R0b20tMC41IHJpZ2h0LTAuNSB0ZXh0LVs3cHhdIGZvbnQtYm9sZCBiZy1bI0ZGNUYxRl0gdGV4dC1ibGFjayByb3VuZGVkLWZ1bGwgdy0zLjUgaC0zLjUgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYm9yZGVyIGJvcmRlci1ibGFjayBmb250LW1vbm9cIj5cbiAgICAgICAgICAgICAgICAgICAgICBBTExcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8Lz5cbiAgICAgICAgKSA6IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGgtZnVsbCB0ZXh0LXdoaXRlLzMwIHNwYWNlLXktNCBteS1hdXRvXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIGdyb3VwIHAtMSBiZy1ncmFkaWVudC10by10ciBmcm9tLVsjRkY1RjFGXS8yMCB0by1hbWJlci01MDAvMjAgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBzaGFkb3ctMnhsXCI+XG4gICAgICAgICAgICAgIDxpbWcgXG4gICAgICAgICAgICAgICAgc3JjPXtzb3VuZEJveEljb259IFxuICAgICAgICAgICAgICAgIGFsdD1cIlNvdW5kQm94IExvZ29cIiBcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTE2IGgtMTYgcm91bmRlZC14bCBvYmplY3QtY292ZXIgYW5pbWF0ZS1wdWxzZSBzaGFkb3ctbGdcIiBcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlciBzcGFjZS15LTEuNVwiPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQtWyNGRjVGMUZdXCI+REVDS19PRkZMSU5FPC9wPlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtd2hpdGUvNTAgbWF4LXctWzIwMHB4XSBsZWFkaW5nLXJlbGF4ZWRcIj5cbiAgICAgICAgICAgICAgICDjg6rjgrnjg4jjgYvjgonjg4jjg6njg4Pjgq/jgpLpgbjmip7jgZfjgablho3nlJ/jgpLplovlp4vjgZfjgabjgY/jgaDjgZXjgYTjgIJcbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICAgIHsvKiBFZGl0IE1ldGFkYXRhIE1vZGFsICovfVxuICAgICAge2VkaXRpbmdUcmFjayAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZml4ZWQgaW5zZXQtMCBiZy1ibGFjay84MCBiYWNrZHJvcC1ibHVyLW1kIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHotNTAgcC00IGFuaW1hdGUtZmFkZS1pblwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctWyMwYzBjMGNdIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcm91bmRlZC0zeGwgbWF4LXctbWQgdy1mdWxsIHAtNiBzcGFjZS15LTYgc2hhZG93LTJ4bCByZWxhdGl2ZVwiPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRFZGl0aW5nVHJhY2sobnVsbCl9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC00IHJpZ2h0LTQgcC0yIHRleHQtd2hpdGUvNDAgaG92ZXI6dGV4dC13aGl0ZSByb3VuZGVkLWxnIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPVwidy01IGgtNVwiIC8+XG4gICAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ib2xkIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVsjRkY1RjFGXSB1cHBlcmNhc2UgYmxvY2sgbWItMVwiPk1FVEFEQVRBIEVESVRPUjwvc3Bhbj5cbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1ib2xkIHRleHQtd2hpdGUgdHJhY2tpbmctdGlnaHRcIj7nmbvpjLLmg4XloLHjga7nt6jpm4Y8L2gzPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXtoYW5kbGVTYXZlRWRpdH0gY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0xLjVcIj5cbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ib2xkIHRleHQtd2hpdGUvNTAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIGJsb2NrXCI+5puy5ZCNIC8gVFJBQ0sgVElUTEU8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgICAgICAgICAgIHZhbHVlPXtlZGl0VGl0bGV9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEVkaXRUaXRsZShlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctYmxhY2svNDAgdGV4dC1zbGF0ZS0xMDAgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBmb2N1czpib3JkZXItWyNGRjVGMUZdIHJvdW5kZWQteGwgcHktMyBweC00IG91dGxpbmUtbm9uZSB0ZXh0LXNtIHRyYW5zaXRpb24gZm9udC1zYW5zXCJcbiAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi5puy5ZCN44KS5YWl5Yqb44GX44Gm44GP44Gg44GV44GEXCJcbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMS41XCI+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LXdoaXRlLzUwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBibG9ja1wiPuOCouODvOODhuOCo+OCueODiCAvIEFSVElTVDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgICAgICB2YWx1ZT17ZWRpdEFydGlzdH1cbiAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0RWRpdEFydGlzdChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctYmxhY2svNDAgdGV4dC1zbGF0ZS0xMDAgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBmb2N1czpib3JkZXItWyNGRjVGMUZdIHJvdW5kZWQteGwgcHktMyBweC00IG91dGxpbmUtbm9uZSB0ZXh0LXNtIHRyYW5zaXRpb24gZm9udC1zYW5zXCJcbiAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwi44Ki44O844OG44Kj44K544OI5ZCN44KS5YWl5Yqb44GX44Gm44GP44Gg44GV44GEXCJcbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMS41XCI+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LXdoaXRlLzUwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciBibG9ja1wiPuOCq+ODhuOCtOODqiAvIENBVEVHT1JZPC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEVkaXRHZW5yZShcIumCpualvVwiKX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcHktMi41IHJvdW5kZWQteGwgdGV4dC14cyBmb250LWJvbGQgYm9yZGVyIHRyYW5zaXRpb24gZHVyYXRpb24tMjAwIGN1cnNvci1wb2ludGVyICR7XG4gICAgICAgICAgICAgICAgICAgICAgZWRpdEdlbnJlID09PSBcIumCpualvVwiXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdLzE1IGJvcmRlci1bI0ZGNUYxRl0gdGV4dC1bI0ZGNUYxRl1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgOiBcImJnLWJsYWNrLzMwIGJvcmRlci13aGl0ZS81IHRleHQtc2xhdGUtNDAwIGhvdmVyOnRleHQtd2hpdGUgaG92ZXI6Ym9yZGVyLXdoaXRlLzEwXCJcbiAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIOmCpualvSAoSi1QT1AgLyBBbmltZSAvIFN1bm8pXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldEVkaXRHZW5yZShcIua0i+alvVwiKX1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcHktMi41IHJvdW5kZWQteGwgdGV4dC14cyBmb250LWJvbGQgYm9yZGVyIHRyYW5zaXRpb24gZHVyYXRpb24tMjAwIGN1cnNvci1wb2ludGVyICR7XG4gICAgICAgICAgICAgICAgICAgICAgZWRpdEdlbnJlID09PSBcIua0i+alvVwiXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFwiYmctWyNGRjVGMUZdLzE1IGJvcmRlci1bI0ZGNUYxRl0gdGV4dC1bI0ZGNUYxRl1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgOiBcImJnLWJsYWNrLzMwIGJvcmRlci13aGl0ZS81IHRleHQtc2xhdGUtNDAwIGhvdmVyOnRleHQtd2hpdGUgaG92ZXI6Ym9yZGVyLXdoaXRlLzEwXCJcbiAgICAgICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIOa0i+alvSAoV2VzdGVybiAvIEdsb2JhbClcbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTMgcHQtNCBib3JkZXItdCBib3JkZXItd2hpdGUvNVwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0RWRpdGluZ1RyYWNrKG51bGwpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIHB5LTMgYmctd2hpdGUvNSBob3ZlcjpiZy13aGl0ZS8xMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHRleHQtd2hpdGUgcm91bmRlZC14bCB0ZXh0LXhzIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciBhY3RpdmU6c2NhbGUtOTVcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIOOCreODo+ODs+OCu+ODq1xuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIHR5cGU9XCJzdWJtaXRcIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleC0xIHB5LTMgYmctWyNGRjVGMUZdIGhvdmVyOmJnLWFtYmVyLTUwMCB0ZXh0LWJsYWNrIHJvdW5kZWQteGwgdGV4dC14cyBmb250LWV4dHJhYm9sZCBzaGFkb3ctbGcgdHJhbnNpdGlvbi1hbGwgY3Vyc29yLXBvaW50ZXIgYWN0aXZlOnNjYWxlLTk1IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xLjVcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxDaGVjayBjbGFzc05hbWU9XCJ3LTQgaC00IHN0cm9rZS1bMi41XVwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj7mm7TmlrDjgpLkv53lrZg8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG5cbiAgICAgIHsvKiBTdGlja3kgQm90dG9tIE1pbmkgUGxheWVyICovfVxuICAgICAge2N1cnJlbnRUcmFjayAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZml4ZWQgYm90dG9tLTAgbGVmdC0wIHJpZ2h0LTAgei00MCBiZy1bIzA4MDgwOF0vOTUgYmFja2Ryb3AtYmx1ci1sZyBib3JkZXItdCBib3JkZXItd2hpdGUvMTAgc2hhZG93LVswXy04cHhfMzBweF9yZ2IoMCwwLDAsMC44KV0gcGItc2FmZSBhbmltYXRlLWZhZGUtaW5cIj5cbiAgICAgICAgICB7LyogUHJvZ3Jlc3MgYmFyIG9uIHZlcnkgdG9wIG9mIHRoZSBtaW5pIHBsYXllciAqL31cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIHctZnVsbCBoLTEgYmctd2hpdGUvMTAgZ3JvdXAgY3Vyc29yLXBvaW50ZXJcIj5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgICAgICBtaW49XCIwXCJcbiAgICAgICAgICAgICAgbWF4PXtkdXJhdGlvbiB8fCAxMDB9XG4gICAgICAgICAgICAgIHZhbHVlPXtjdXJyZW50VGltZX1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZVNjcnViQ2hhbmdlfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIHctZnVsbCBoLWZ1bGwgb3BhY2l0eS0wIGN1cnNvci1wb2ludGVyIHotMTBcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxkaXYgXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImgtZnVsbCBiZy1ncmFkaWVudC10by1yIGZyb20tWyNGRjVGMUZdIHRvLWFtYmVyLTUwMCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi0xMDAgcmVsYXRpdmVcIlxuICAgICAgICAgICAgICBzdHlsZT17eyB3aWR0aDogYCR7ZHVyYXRpb24gPyAoY3VycmVudFRpbWUgLyBkdXJhdGlvbikgKiAxMDAgOiAwfSVgIH19XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgcmlnaHQtMCB0b3AtMS8yIC10cmFuc2xhdGUteS0xLzIgdy0yLjUgaC0yLjUgcm91bmRlZC1mdWxsIGJnLXdoaXRlIHNoYWRvdy1tZCBib3JkZXIgYm9yZGVyLVsjRkY1RjFGXSBzY2FsZS0wIGdyb3VwLWhvdmVyOnNjYWxlLTEwMCB0cmFuc2l0aW9uLXRyYW5zZm9ybVwiPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIHB4LTQgcHktMi41IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNFwiPlxuICAgICAgICAgICAgey8qIExlZnQ6IE1ldGFkYXRhICYgTmF2aWdhdGlvbiAqL31cbiAgICAgICAgICAgIDxkaXYgXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluLXBsYXllci1kZWNrXCIpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6IFwic21vb3RoXCIgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBtaW4tdy0wIGZsZXgtMSBjdXJzb3ItcG9pbnRlciBncm91cCBob3ZlcjpvcGFjaXR5LTkwXCJcbiAgICAgICAgICAgICAgdGl0bGU9XCLjg6HjgqTjg7Pjg5fjg6zjgqTjg6Tjg7zjgbjnp7vli5VcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHctOSBoLTkgcm91bmRlZC1mdWxsIG92ZXJmbG93LWhpZGRlbiBib3JkZXIgYm9yZGVyLXdoaXRlLzIwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZsZXgtc2hyaW5rLTAgcmVsYXRpdmUgJHtpc1BsYXlpbmcgPyBcImFuaW1hdGUtc3Bpbi1zbG93XCIgOiBcIlwifWB9PlxuICAgICAgICAgICAgICAgIDxpbWcgXG4gICAgICAgICAgICAgICAgICBzcmM9e3NvdW5kQm94SWNvbn0gXG4gICAgICAgICAgICAgICAgICBhbHQ9XCJUcmFjayBJY29uXCIgXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb3ZlclwiXG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItWyNGRjVGMUZdLzIwIHNjYWxlLTEwNSBhbmltYXRlLXBpbmcgb3BhY2l0eS0yNVwiIHN0eWxlPXt7IGFuaW1hdGlvbkR1cmF0aW9uOiAnM3MnIH19PjwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XCI+XG4gICAgICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC13aGl0ZSB0cnVuY2F0ZSBncm91cC1ob3Zlcjp0ZXh0LVsjRkY1RjFGXSB0cmFuc2l0aW9uLWNvbG9yc1wiPntjdXJyZW50VHJhY2sudGl0bGV9PC9oND5cbiAgICAgICAgICAgICAgICAgIDxDaGV2cm9uVXAgY2xhc3NOYW1lPVwidy0zLjUgaC0zLjUgdGV4dC13aGl0ZS80MCBncm91cC1ob3Zlcjp0ZXh0LVsjRkY1RjFGXSB0cmFuc2l0aW9uLWNvbG9ycyBmbGV4LXNocmluay0wIGFuaW1hdGUtYm91bmNlXCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXdoaXRlLzUwIHRydW5jYXRlXCI+e2N1cnJlbnRUcmFjay5hcnRpc3QgfHwgXCLkuI3mmI7jgarjgqLjg7zjg4bjgqPjgrnjg4hcIn08L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiBDZW50ZXI6IENvbnRyb2wgQnV0dG9ucyAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgc206Z2FwLTQgZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgICB7LyogU2h1ZmZsZSAvIFJhbmRvbSBCdXR0b24gKi99XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRJc1NodWZmbGUoIWlzU2h1ZmZsZSl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcC0yIHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIGFjdGl2ZTpzY2FsZS05MCAke1xuICAgICAgICAgICAgICAgICAgaXNTaHVmZmxlID8gXCJ0ZXh0LVsjRkY1RjFGXSBiZy1bI0ZGNUYxRl0vMTAgZm9udC1ib2xkXCIgOiBcInRleHQtd2hpdGUvNDAgaG92ZXI6dGV4dC13aGl0ZVwiXG4gICAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICAgICAgdGl0bGU9XCLjgrfjg6Pjg4Pjg5Xjg6vlho3nlJ9cIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPFNodWZmbGUgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVQcmV2fVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiB0ZXh0LXdoaXRlLzYwIGhvdmVyOnRleHQtWyNGRjVGMUZdIGhvdmVyOmJnLXdoaXRlLzUgcm91bmRlZC1mdWxsIHRyYW5zaXRpb24gY3Vyc29yLXBvaW50ZXIgYWN0aXZlOnNjYWxlLTkwXCJcbiAgICAgICAgICAgICAgICB0aXRsZT1cIuWJjeOBruabsuOBuFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8U2tpcEJhY2sgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVQbGF5UGF1c2UoKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgYmctWyNGRjVGMUZdIGhvdmVyOmJnLWFtYmVyLTUwMCB0ZXh0LWJsYWNrIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzaGFkb3ctbGcgdHJhbnNpdGlvbiB0cmFuc2Zvcm0gYWN0aXZlOnNjYWxlLTk1IGN1cnNvci1wb2ludGVyIGdsb3ctb3JhbmdlXCJcbiAgICAgICAgICAgICAgICB0aXRsZT17aXNQbGF5aW5nID8gXCLkuIDmmYLlgZzmraJcIiA6IFwi5YaN55SfXCJ9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7aXNQbGF5aW5nID8gKFxuICAgICAgICAgICAgICAgICAgPFBhdXNlIGNsYXNzTmFtZT1cInctNCBoLTQgZmlsbC1ibGFjayBzdHJva2UtWzIuNV1cIiAvPlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICA8UGxheSBjbGFzc05hbWU9XCJ3LTQgaC00IGZpbGwtYmxhY2sgc3Ryb2tlLVsyLjVdIHRyYW5zbGF0ZS14LTAuNVwiIC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZU5leHR9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHRleHQtd2hpdGUvNjAgaG92ZXI6dGV4dC1bI0ZGNUYxRl0gaG92ZXI6Ymctd2hpdGUvNSByb3VuZGVkLWZ1bGwgdHJhbnNpdGlvbiBjdXJzb3ItcG9pbnRlciBhY3RpdmU6c2NhbGUtOTBcIlxuICAgICAgICAgICAgICAgIHRpdGxlPVwi5qyh44Gu5puy44G4XCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxTa2lwRm9yd2FyZCBjbGFzc05hbWU9XCJ3LTQgaC00XCIgLz5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgICAgICAgey8qIFJlcGVhdCBNb2RlIEJ1dHRvbiAqL31cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChsb29wTW9kZSA9PT0gXCJub25lXCIpIHNldExvb3BNb2RlKFwicXVldWVcIik7XG4gICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb29wTW9kZSA9PT0gXCJxdWV1ZVwiKSBzZXRMb29wTW9kZShcInNpbmdsZVwiKTtcbiAgICAgICAgICAgICAgICAgIGVsc2Ugc2V0TG9vcE1vZGUoXCJub25lXCIpO1xuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcC0yIHJvdW5kZWQtZnVsbCB0cmFuc2l0aW9uIGN1cnNvci1wb2ludGVyIHJlbGF0aXZlIGFjdGl2ZTpzY2FsZS05MCAke1xuICAgICAgICAgICAgICAgICAgbG9vcE1vZGUgIT09IFwibm9uZVwiID8gXCJ0ZXh0LVsjRkY1RjFGXSBiZy1bI0ZGNUYxRl0vMTBcIiA6IFwidGV4dC13aGl0ZS80MCBob3Zlcjp0ZXh0LXdoaXRlXCJcbiAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICB0aXRsZT17bG9vcE1vZGUgPT09IFwic2luZ2xlXCIgPyBcIjHmm7Ljg6rjg5Tjg7zjg4jkuK1cIiA6IGxvb3BNb2RlID09PSBcInF1ZXVlXCIgPyBcIuWFqOabsuODquODlOODvOODiOS4rVwiIDogXCLjg6rjg5Tjg7zjg4jjgqrjg5VcIn1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxSb3RhdGVDY3cgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+XG4gICAgICAgICAgICAgICAge2xvb3BNb2RlID09PSBcInNpbmdsZVwiICYmIChcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImFic29sdXRlIGJvdHRvbS0wIHJpZ2h0LTAgdGV4dC1bN3B4XSBmb250LWJvbGQgYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgcm91bmRlZC1mdWxsIHctMy41IGgtMy41IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZvbnQtbW9ubyBib3JkZXIgYm9yZGVyLWJsYWNrIHNjYWxlLTkwXCI+XG4gICAgICAgICAgICAgICAgICAgIDFcbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIHtsb29wTW9kZSA9PT0gXCJxdWV1ZVwiICYmIChcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImFic29sdXRlIGJvdHRvbS0wIHJpZ2h0LTAgdGV4dC1bNnB4XSBmb250LWJvbGQgYmctWyNGRjVGMUZdIHRleHQtYmxhY2sgcm91bmRlZC1mdWxsIHctMy41IGgtMy41IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGZvbnQtbW9ubyBib3JkZXIgYm9yZGVyLWJsYWNrIHNjYWxlLTkwXCI+XG4gICAgICAgICAgICAgICAgICAgIEFMTFxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiBSaWdodDogVGltaW5nIGRpc3BsYXkgKHZpc2libGUgb24gc20gc2NyZWVucyB1cCkgKi99XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImhpZGRlbiBzbTpmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHRleHQteHMgZm9udC1tb25vIHRleHQtd2hpdGUvNDAgZmxleC1zaHJpbmstMCBiZy13aGl0ZS81IHB4LTMgcHktMS41IHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLXdoaXRlLzVcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bI0ZGNUYxRl0vODAgZm9udC1ib2xkXCI+e2Zvcm1hdFRpbWUoY3VycmVudFRpbWUpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4+Lzwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4+e2Zvcm1hdFRpbWUoZHVyYXRpb24pfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9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