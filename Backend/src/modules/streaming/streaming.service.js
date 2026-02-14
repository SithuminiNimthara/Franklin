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

class StreamingService {
    constructor() {
        this.processes = new Map();
        this.init();
    }

    init() {
        // In production on Render, we prefer /tmp for ephemeral HLS segments
        if (process.env.NODE_ENV === 'production') {
            config.streamDir = '/tmp/franklin_streams';
        }

        if (!fs.existsSync(config.streamDir)) {
            fs.mkdirSync(config.streamDir, { recursive: true });
        }
        console.log(`[Streaming] Serving HLS from: ${config.streamDir}`);
    }

    async startAllCameras() {
        try {
            const cameras = await Camera.find({ isEnabled: true });
            console.log(`[Streaming] Found ${cameras.length} enabled cameras.`);
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

        // Render-safe FFmpeg args (no GPU, use libx264)
        const args = [
            '-rtsp_transport', 'tcp',
            '-i', cam.rtspUrl,
            '-map', '0:v:0',
            '-map', '0:a:0?',     // Maps audio if available, doesn't fail if missing
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-pix_fmt', 'yuv420p',
            '-g', '60',
            '-c:a', 'aac',
            '-b:a', '64k',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '3',
            '-hls_flags', 'delete_segments+append_list+independent_segments',
            '-hls_segment_type', 'mpegts',
            outPath
        ];

        const startProcess = () => {
            console.log(`[Streaming] Starting FFmpeg for ${cam.id}`);
            const ff = spawn(ffmpegPath, args);

            ff.stderr.on('data', d => {
                const msg = d.toString();
                if (msg.toLowerCase().includes('error')) {
                    // console.error(`[FFmpeg ${cam.id}] ${msg.trim()}`);
                }
            });

            ff.on('exit', (code, signal) => {
                if (signal === 'SIGTERM') return;
                console.warn(`[Streaming] ${cam.id} exited (code ${code}). Restarting in 5s...`);
                const timeout = setTimeout(startProcess, 5000);
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
        }
    }

    getStreamPath(cameraId) {
        return path.join(config.streamDir, cameraId, 'stream.m3u8');
    }

    getStreamingStatus() {
        return Array.from(this.processes.keys()).map(id => ({
            cameraId: id,
            status: this.processes.get(id).process ? 'active' : 'restarting'
        }));
    }
}

export const streamingService = new StreamingService();
