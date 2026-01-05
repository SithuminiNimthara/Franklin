import path from 'path';

export const config = {
    port: process.env.PORT || 5002,
    mongoUri: "mongodb+srv://it22143204_db_user:CPnJ0RFeKTfWRK0a@cluster0.o7txatz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    streamDir: path.join(process.cwd(), 'streams'),
    ffmpegPath: '',
    cameras: [
        //{ id: 'camera1', rtspUrl: 'rtsp://admin:EDSNNP@IP_Address:554/Streaming/Channels/101' },
    ]
};
