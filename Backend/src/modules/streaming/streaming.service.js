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

        // Audio-enabled FFmpeg arguments
        const args = [
            '-rtsp_transport', 'tcp',
            '-i', cam.rtspUrl,
            '-map', '0:v:0',      // Map first video stream
            '-map', '0:a:0?',     // Map first audio stream if it exists

            // OPTIMIZATION: Try to copy video stream first (consumes almost 0 CPU)
            // If the camera is not H.264, change 'copy' to 'libx264' and use '-preset ultrafast'
            '-c:v', 'copy',
            // '-c:v', 'libx264', '-preset', 'ultrafast', // Uncomment this if 'copy' fails or video is blank

            ['-sn'], // Disable subtitles to prevent issues

            '-c:a', 'aac',        // Encode audio to AAC
            '-b:a', '128k',       // Audio bitrate
            '-ar', '44100',       // Audio sample rate
            '-ac', '2',            // Stereo audio

            '-f', 'hls',
            '-hls_time', '2',     // Smaller segments for lower latency (2s)
            '-hls_list_size', '5', // Keep playlist small
            '-hls_flags', 'delete_segments+append_list', // Don't use independent_segments with copy usually, but ok if keyframes match
            '-start_number', '1',
            '-hls_allow_cache', '0',

            outPath
        ];

        const startProcess = () => {
            console.log(`[Streaming] Starting FFmpeg process for ${cam.id}`);
            const ff = spawn(ffmpegPath, args);

            ff.stderr.on('data', d => {
                const msg = d.toString();

                // Audio detection logging
                if (msg.includes('Audio:')) {
                    console.log(`[Streaming Info ${cam.id}] Audio stream detected and being processed.`);
                }

                if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
                    console.error(`[FFmpeg Error ${cam.id}] ${msg.trim()}`);
                }
            });

            ff.on('exit', (code, signal) => {
                if (signal === 'SIGTERM' || signal === 'SIGINT') {
                    console.log(`[Streaming] ${cam.id} process terminated manually.`);
                    return;
                }
                console.warn(`[Streaming] ${cam.id} process exited with code ${code}. Restarting in 1s...`);
                const timeout = setTimeout(startProcess, 1000);
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
