import path from 'path';

export const config = {
    port: process.env.PORT || 8000,
    streamDir: path.join(process.cwd(), 'streams'),
    ffmpegPath: '',
    cameras: [
        { id: 'camera1', rtspUrl: 'rtsp://admin:EDSNNP@IP_Address:554/Streaming/Channels/101' },
    ]
};
