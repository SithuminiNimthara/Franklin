import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../../config/env.js';
import { Camera } from '../cameras/camera.model.js';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const ffmpegPath = ffmpegInstaller.path;

class StreamingService {
    constructor() {
        this.processes = new Map();
        this.ensureStreamDir();
    }

    ensureStreamDir() {
        if (!fs.existsSync(config.streamDir)) {
            fs.mkdirSync(config.streamDir, { recursive: true });
        }
    }

    async startAllCameras() {
        try {
            const cameras = await Camera.find({ isEnabled: true });
            console.log(`Starting ${cameras.length} cameras...`);
            for (const camera of cameras) {
                this.startCamera({
                    id: camera._id.toString(),
                    rtspUrl: camera.rtspUrl
                });
            }
        } catch (error) {
            console.error('Error starting all cameras:', error);
        }
    }

    startCamera({ id, rtspUrl }) {
        if (this.processes.has(id)) {
            console.log(`Camera ${id} is already streaming.`);
            return;
        }

        const cameraDir = path.join(config.streamDir, id);
        if (!fs.existsSync(cameraDir)) {
            fs.mkdirSync(cameraDir, { recursive: true });
        }

        const playlistPath = path.join(cameraDir, 'stream.m3u8');

        // FFmpeg command to convert input to HLS
        const isRtsp = rtspUrl.startsWith('rtsp://');
        const ffmpegArgs = [];

        // For local files, read at native frame rate to simulate a stream
        if (!isRtsp) {
            ffmpegArgs.push('-re');
        } else {
            ffmpegArgs.push(
                '-rtsp_transport', 'tcp',
                '-rtsp_flags', 'prefer_tcp',
                '-fflags', 'nobuffer+genpts',
                '-use_wallclock_as_timestamps', '1',
                '-probesize', '32768',
                '-analyzeduration', '0'
            );
        }

        // Use forward slashes for FFmpeg paths even on Windows
        const normalizedInput = rtspUrl.replace(/\\/g, '/');
        const normalizedSegmentPattern = path.join(cameraDir, 'p%d.ts').replace(/\\/g, '/');
        const normalizedPlaylist = playlistPath.replace(/\\/g, '/');

        ffmpegArgs.push(
            '-i', normalizedInput,
            '-c:v', 'libx264',
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-vf', 'scale=-2:480,format=yuv420p',
            '-g', '30',
            '-sc_threshold', '0',
            '-c:a', 'aac',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '1',
            '-hls_list_size', '3',
            '-hls_flags', 'delete_segments+independent_segments',
            '-hls_segment_filename', `file:${normalizedSegmentPattern}`,
            `file:${normalizedPlaylist}`
        );

        console.log(`[Camera ${id}] Source: ${normalizedInput}`);
        console.log(`[Camera ${id}] Executing: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);
        const process = spawn(ffmpegPath, ffmpegArgs);

        process.stdout.on('data', (data) => {
            // console.log(`[Camera ${id}] stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            // Log only critical errors or performance issues to avoid spamming
            const msg = data.toString();
            if (msg.includes('Error') || msg.includes('speed=')) {
                console.error(`[Camera ${id}] info: ${msg.trim()}`);
            }
        });

        process.on('close', (code) => {
            const entry = this.processes.get(id);
            const wasStopping = entry?.isStopping;

            console.log(`[Camera ${id}] ffmpeg process exited with code ${code}${wasStopping ? ' (Manual Stop)' : ''}`);
            this.processes.delete(id);

            // Auto-restart logic for "always on" streaming - skip if manually stopping
            if (!wasStopping) {
                if (code !== null && code !== 0) {
                    console.warn(`[Camera ${id}] Unexpected exit. Restarting in 5 seconds...`);
                    setTimeout(() => {
                        this.startCamera({ id, rtspUrl });
                    }, 5000);
                } else if (code === 0) {
                    console.log(`[Camera ${id}] Process ended. Restarting to ensure "always on" stream...`);
                    setTimeout(() => {
                        this.startCamera({ id, rtspUrl });
                    }, 1000);
                }
            }
        });

        this.processes.set(id, {
            process,
            startTime: new Date(),
            rtspUrl,
            isStopping: false
        });
    }

    stopCamera(id) {
        const cameraProcess = this.processes.get(id);
        if (cameraProcess) {
            console.log(`Stopping streaming for camera ${id}...`);
            cameraProcess.isStopping = true; // Mark as intentional stop
            cameraProcess.process.kill('SIGTERM');
            // Entry will be deleted in the 'close' event handler
        }
    }

    getStatus() {
        const status = [];
        this.processes.forEach((value, key) => {
            status.push({
                id: key,
                startTime: value.startTime,
                rtspUrl: value.rtspUrl,
                active: true
            });
        });
        return status;
    }

    getHealth(id) {
        const cameraProcess = this.processes.get(id);
        if (!cameraProcess) return { active: false };

        const cameraDir = path.join(config.streamDir, id);
        const playlistPath = path.join(cameraDir, 'stream.m3u8');
        const exists = fs.existsSync(playlistPath);

        return {
            active: true,
            startTime: cameraProcess.startTime,
            playlistExists: exists,
            lastUpdate: exists ? fs.statSync(playlistPath).mtime : null
        };
    }
}

export const streamingService = new StreamingService();
