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
            ffmpegArgs.push('-rtsp_transport', 'tcp');
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
            '-preset', 'fast',
            '-tune', 'zerolatency',
            '-vf', 'scale=-2:720,format=yuv420p',
            '-g', '30',
            '-sc_threshold', '0',
            '-c:a', 'aac',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '5',
            '-hls_flags', 'delete_segments',
            '-hls_segment_filename', normalizedSegmentPattern,
            normalizedPlaylist
        );

        console.log(`[Camera ${id}] Source: ${normalizedInput}`);
        console.log(`[Camera ${id}] Executing: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);
        const process = spawn(ffmpegPath, ffmpegArgs);

        process.stdout.on('data', (data) => {
            // console.log(`[Camera ${id}] stdout: ${data}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`[Camera ${id}] stderr: ${data}`);
        });

        process.on('close', (code) => {
            console.log(`[Camera ${id}] ffmpeg process exited with code ${code}`);
            this.processes.delete(id);
        });

        this.processes.set(id, {
            process,
            startTime: new Date(),
            rtspUrl
        });
    }

    stopCamera(id) {
        const cameraProcess = this.processes.get(id);
        if (cameraProcess) {
            console.log(`Stopping streaming for camera ${id}...`);
            cameraProcess.process.kill('SIGTERM');
            this.processes.delete(id);
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
