import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env.js';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { Camera } from '../cameras/camera.model.js';

let ffmpegPath;
try {
    ffmpegPath = ffmpegInstaller.path;
} catch (e) {
    ffmpegPath = 'ffmpeg'; // fallback to system ffmpeg
}
console.log(`[Streaming] FFmpeg path: ${ffmpegPath}`);

class StreamingService {
    constructor() {
        this.processes = new Map();
        this.init();
    }

    init() {
        if (!fs.existsSync(config.streamDir)) {
            fs.mkdirSync(config.streamDir, { recursive: true });
        }
    }

    async startAllCameras() {
        try {
            console.log('[Streaming] Starting all enabled cameras from DB...');
            const cameras = await Camera.find({ isEnabled: true });
            for (const cam of cameras) {
                this.startCamera({ id: cam._id.toString(), rtspUrl: cam.rtspUrl });
            }
        } catch (error) {
            console.error('[Streaming] Start all error:', error);
        }
    }

    startCamera(cam) {
        if (this.processes.has(cam.id)) return;

        const outDir = path.join(config.streamDir, cam.id);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, 'stream.m3u8');

        // Optimized FFmpeg arguments for low-latency HLS
        const args = [
            '-rtsp_transport', 'tcp',        // Stable transport
            '-i', cam.rtspUrl,               // Input
            '-c:v', 'libx264',               // Video Codec
            '-preset', 'superfast',          // Speed over compression
            '-tune', 'zerolatency',          // Latency optimization
            '-pix_fmt', 'yuv420p',           // Compatibility
            '-g', '60',                      // Keyframe interval (2x FPS)
            '-c:a', 'aac',                   // Audio Codec
            '-b:a', '64k',                   // Low bitrate audio
            '-ar', '44100',
            '-f', 'hls',
            '-hls_time', '2',                // 2 second segments (Lower = less latency but more requests)
            '-hls_list_size', '3',           // Keep 3 segments in manifest
            '-hls_flags', 'delete_segments+append_list+independent_segments',
            '-hls_segment_type', 'mpegts',
            '-hls_allow_cache', '0',
            '-master_pl_name', 'master.m3u8',
            outPath
        ];

        const startProcess = () => {
            console.log(`[Streaming] Spawning FFmpeg for camera: ${cam.id}`);
            const ff = spawn(ffmpegPath, args);

            ff.stderr.on('data', d => {
                const msg = d.toString();
                // We only log errors to keep stdout clean
                if (msg.toLowerCase().includes('error')) {
                    console.error(`[FFmpeg Error ${cam.id}] ${msg.trim()}`);
                }
            });

            ff.on('exit', (code, signal) => {
                if (signal === 'SIGTERM') {
                    console.log(`[Streaming] ${cam.id} stopped.`);
                    return;
                }
                console.warn(`[Streaming] ${cam.id} crashed (code ${code}). Restarting...`);
                const timeout = setTimeout(startProcess, 2000);
                this.processes.set(cam.id, { process: null, restartTimeout: timeout });
            });

            this.processes.set(cam.id, { process: ff, restartTimeout: null });
        };

        startProcess();
    }

    stopCamera(cameraId) {
        const entry = this.processes.get(cameraId);
        if (entry) {
            if (entry.restartTimeout) clearTimeout(entry.restartTimeout);
            if (entry.process) entry.process.kill('SIGTERM');
            this.processes.delete(cameraId);

            // Cleanup HLS files
            const camDir = path.join(config.streamDir, cameraId);
            if (fs.existsSync(camDir)) {
                fs.rmSync(camDir, { recursive: true, force: true });
                console.log(`[Streaming] Cleaned up stream folder for ${cameraId}`);
            }
        }
    }

    getStreamPath(cameraId) {
        return path.join(config.streamDir, cameraId, 'stream.m3u8');
    }

    getStreamingStatus() {
        const statuses = [];
        this.processes.forEach((val, key) => {
            statuses.push({
                cameraId: key,
                status: val.process ? 'active' : 'restarting'
            });
        });
        return statuses;
    }
}

export const streamingService = new StreamingService();
