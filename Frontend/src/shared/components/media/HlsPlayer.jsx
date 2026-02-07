import { useEffect, useRef, useState, useCallback } from "react"
import Hls from "hls.js"
import {
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Expand,
  Shrink,
  AlertCircle,
  Volume1,
  Maximize
} from "lucide-react"

export default function HlsPlayer({ src, className }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [status, setStatus] = useState("loading")
  const [retryCount, setRetryCount] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [useFallback, setUseFallback] = useState(false)

  // Audio state
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('hls-player-muted');
    return saved !== null ? JSON.parse(saved) : true;
  })
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('hls-player-volume');
    return saved !== null ? parseFloat(saved) : 0.7;
  })
  const [hasAudio, setHasAudio] = useState(false)
  const [isUnmutedByInteraction, setIsUnmutedByInteraction] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Persist settings
  useEffect(() => {
    localStorage.setItem('hls-player-muted', JSON.stringify(isMuted));
    localStorage.setItem('hls-player-volume', volume.toString());
  }, [isMuted, volume])

  // Monitor fullscreen
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, [])

  const initHls = useCallback(async () => {
    const video = videoRef.current
    if (!video || !src) return

    // Fallback logic for production/cloud
    let currentSrc = src;
    if (useFallback) {
      currentSrc = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }

    // Pre-flight check if URL is reachable
    if (!useFallback && retryCount === 0) {
      try {
        const check = await fetch(currentSrc, { method: 'HEAD' });
        if (!check.ok) throw new Error('Stream 404');
      } catch (err) {
        console.warn("[HlsPlayer] Primary stream unreachable, attempting fallback");
        setUseFallback(true);
        return; // Re-trigger via effect
      }
    }

    if (hlsRef.current) {
      hlsRef.current.destroy()
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 15000,
        fragLoadingTimeOut: 15000,
        liveSyncDurationCount: 3,
        autoStartLoad: true
      })

      hlsRef.current = hls
      hls.loadSource(currentSrc)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log("[HlsPlayer] Manifest parsed. Audio tracks:", hls.audioTracks.length)
        setHasAudio(hls.audioTracks.length > 0)
        setStatus("playing")
        setRetryCount(0)

        video.muted = isMuted
        video.volume = volume
        video.play().catch(err => {
          console.warn("[HlsPlayer] Autoplay blocked:", err.message)
          setIsPlaying(false)
        })
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error(`[HlsPlayer] Fatal Error: ${data.details}`)
          if (data.details === 'manifestLoadError' && !useFallback) {
            setUseFallback(true);
          } else {
            setStatus("reconnecting")
            const wait = Math.min(1000 * Math.pow(2, retryCount), 15000)
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
              initHls()
            }, wait)
          }
        }
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentSrc
      video.muted = true
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => setIsPlaying(false))
        setStatus("playing")
        setHasAudio(true)
      })
    }
  }, [src, retryCount, isMuted, volume, useFallback])

  useEffect(() => {
    initHls()
    return () => hlsRef.current?.destroy()
  }, [initHls])

  // Reset fallback if src changes
  useEffect(() => {
    setUseFallback(false);
  }, [src])

  // Controls
  const togglePlay = (e) => {
    e?.stopPropagation()
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleUnmute = (e) => {
    e?.stopPropagation()
    console.log("[HlsPlayer] User unmuted via interaction")
    videoRef.current.muted = false
    setIsMuted(false)
    setIsUnmutedByInteraction(true)
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const toggleMute = (e) => {
    e?.stopPropagation()
    const newMuted = !isMuted
    videoRef.current.muted = newMuted
    setIsMuted(newMuted)
    if (!newMuted) setIsUnmutedByInteraction(true)
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    videoRef.current.volume = val
    if (val > 0) {
      videoRef.current.muted = false
      setIsMuted(false)
      setIsUnmutedByInteraction(true)
    } else {
      setIsMuted(true)
      videoRef.current.muted = true
    }
  }

  const toggleFullscreen = (e) => {
    e?.stopPropagation()
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative group ${className} bg-slate-950 flex items-center justify-center overflow-hidden rounded-xl cursor-default`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        onClick={togglePlay}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
      />

      {/* Autoplay/Muted Overlay */}
      {status === "playing" && isMuted && hasAudio && (
        <button
          onClick={handleUnmute}
          className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex flex-col items-center justify-center text-white group-hover:bg-black/40 transition-all animate-fadeIn"
        >
          <div className="bg-cyan-500/20 p-4 rounded-full border border-cyan-500/50 mb-4 animate-pulse">
            <Volume2 className="h-10 w-10 text-cyan-400" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em] bg-cyan-600 px-4 py-1.5 rounded-full shadow-lg">
            Click to Enable Sound
          </span>
        </button>
      )}

      {/* Connection Overlays */}
      {(status === "loading" || status === "reconnecting") && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white z-40">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500">
            {status === "loading" ? "Initializing Live Feed" : "Signal Loss • Reconnecting"}
          </p>
        </div>
      )}

      {/* Live HUD */}
      {status === "playing" && (
        <div className="absolute top-4 left-4 z-10 flex items-start gap-4">
          <div className={`${useFallback ? 'bg-amber-600' : 'bg-red-600'} text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg border border-white/20 flex items-center gap-1.5 transition-colors`}>
            <span className={`h-1 w-1 bg-white rounded-full ${useFallback ? '' : 'animate-pulse'}`} />
            {useFallback ? 'DEMO MODE' : 'LIVE FEED'}
          </div>
          {!hasAudio && (
            <div className="bg-slate-800/80 text-yellow-400 text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter">
              Video Only
            </div>
          )}
          {useFallback && (
            <div className="bg-amber-100/10 backdrop-blur-sm text-amber-400 text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter border border-amber-500/20">
              Cloud Environment • Primary Feed Offline
            </div>
          )}
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent z-30 flex items-end px-4 pb-4 transition-all duration-300 ${showControls || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors p-1">
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            {hasAudio ? (
              <div className="flex items-center gap-2 group/volume">
                <button onClick={toggleMute} className="text-white hover:text-cyan-400 transition-colors p-1">
                  {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-20 lg:group-hover/volume:w-24 transition-all duration-300 h-1 bg-white/20 rounded-full appearance-none accent-cyan-500 cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/30 cursor-not-allowed">
                <VolumeX className="h-4 w-4" />
                <span className="text-[9px] font-bold uppercase tracking-widest hidden sm:inline">No Audio Track</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleFullscreen} className="text-white hover:text-cyan-400 transition-colors p-1">
              {isFullscreen ? <Shrink className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Scrim when paused */}
      {!isPlaying && status === "playing" && (
        <div className="absolute inset-0 bg-slate-950/40 z-10 pointer-events-none" />
      )}
    </div>
  )
}
