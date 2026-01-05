import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env.js';

class StreamingService {
    constructor() {
        this.processes = new Map();
        this.init();
    }

    init() {
        // Ensure stream directory exists
        if (!fs.existsSync(config.streamDir)) {
            fs.mkdirSync(config.streamDir, { recursive: true });
        }
    }

    startAllCameras() {
        config.cameras.forEach(cam => this.startCamera(cam));
    }

    startCamera(cam) {
        const outDir = path.join(config.streamDir, cam.id);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, 'stream.m3u8');

        const args = [
            '-rtsp_transport', 'tcp',
            '-i', cam.rtspUrl,
            '-fflags', 'nobuffer',
            '-max_delay', '0',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-c:a', 'aac',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '3',
            '-hls_flags', 'delete_segments+append_list',
            '-hls_allow_cache', '0',
            outPath
        ];

        const startFFmpeg = () => {
            console.log(`Starting ffmpeg for ${cam.id}`);
            const ff = spawn(config.ffmpegPath, args);

            ff.stdout.on('data', d => console.log(`[ffmpeg ${cam.id} stdout] ${d.toString()}`));
            ff.stderr.on('data', d => console.log(`[ffmpeg ${cam.id} stderr] ${d.toString()}`));

            ff.on('error', (err) => {
                console.error(`Failed to start ffmpeg for ${cam.id}:`, err);
            });

            ff.on('exit', (code, signal) => {
                console.warn(`ffmpeg for ${cam.id} exited code=${code} signal=${signal}, restarting in 1s...`);
                // Clean up process tracking if needed, though we just restart here
                setTimeout(startFFmpeg, 1000);
            });

            this.processes.set(cam.id, ff);
        };

        startFFmpeg();
    }

    getStreamPath(cameraId) {
        // In a real scenario, this might return the file path or verify existence
        return path.join(config.streamDir, cameraId, 'stream.m3u8');
    }

    getStreamDir() {
        return config.streamDir;
    }
}

export const streamingService = new StreamingService();
