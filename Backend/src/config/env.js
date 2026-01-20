import path from "path";

export const config = {
  port: process.env.PORT || 5002,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/franklin",
  streamDir: path.join(process.cwd(), "streams"),
  ffmpegPath: "",
  cameras: [
    //{ id: 'camera1', rtspUrl: 'rtsp://admin:EDSNNP@IP_Address:554/Streaming/Channels/101' },
  ],
};
