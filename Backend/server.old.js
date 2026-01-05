import express from 'express'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 8000
const STREAM_DIR = path.join(process.cwd(), 'streams')

// Ensure stream directory exists
if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR, { recursive: true })

// CAMERA CONFIG
const CAMERAS = [
  { id: 'camera1', rtspUrl: 'rtsp://admin:EDSNNP@IP_Address:554/Streaming/Channels/101' },
]

// FULL PATH TO FFMPEG
const FFMPEG_PATH = 'C:\\Users\\Migara\\Downloads\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe'

// Function to start ffmpeg for a camera
function startCamera(cam) {
  const outDir = path.join(STREAM_DIR, cam.id)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'stream.m3u8')

  const args = [
    '-rtsp_transport', 'tcp',
    '-i', cam.rtspUrl,
    '-fflags', 'nobuffer',
    '-max_delay', '0',
    '-c:v', 'libx264',      // re-encode to HLS-friendly codec
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '3',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_allow_cache', '0',
    outPath
  ]

  let ff
  const startFFmpeg = () => {
    console.log(`Starting ffmpeg for ${cam.id}`)
    ff = spawn(FFMPEG_PATH, args)

    ff.stdout.on('data', d => console.log(`[ffmpeg ${cam.id} stdout] ${d.toString()}`))
    ff.stderr.on('data', d => console.log(`[ffmpeg ${cam.id} stderr] ${d.toString()}`))

    ff.on('exit', (code, signal) => {
      console.warn(`ffmpeg for ${cam.id} exited code=${code} signal=${signal}, restarting in 1s...`)
      setTimeout(startFFmpeg, 1000) // restart after 1 second
    })
  }

  startFFmpeg()
}

// Start all cameras
CAMERAS.forEach(cam => startCamera(cam))

// Serve streams folder
app.use('/streams', express.static(STREAM_DIR, {
  setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
}))

// Test endpoint
app.get('/', (req, res) => {
  res.send('EZVIZ HLS streaming server. Streams: ' + CAMERAS.map(c => `/streams/${c.id}/stream.m3u8`).join(', '))
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
