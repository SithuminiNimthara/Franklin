import { useEffect, useRef } from "react"
import Hls from "hls.js"

export default function HlsPlayer({ src, className }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, function (_event, data) {
        if (data.fatal) {
          console.warn("HLS fatal error, trying to recover...")
          hls.destroy()
          setTimeout(() => {
            if (video) hls.loadSource(src)
          }, 1000)
        }
      })
      return () => hls.destroy()
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
    }
  }, [src])

  return <video ref={videoRef} className={className} controls autoPlay muted />
}
