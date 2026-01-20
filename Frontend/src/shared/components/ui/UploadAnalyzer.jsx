import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Upload, Play, CheckCircle, X } from "lucide-react";

export default function UploadAnalyzer() {
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  // video & data states
  const [videoId, setVideoId] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const [aiStats, setAiStats] = useState({
    species: "Detecting...",
    status: "Analyzing...",
    health: "Unknown",
  });

  // handle file select
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploading(true);
    setProgress(0);
    setUploadComplete(false);
    setShowPlayer(false);
    setAiStats({
      species: "Detecting...",
      status: "Analyzing...",
      health: "Unknown",
    });

    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await axios.post(
        "http://localhost:5002/api/hatchery/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) =>
            setProgress(Math.round((e.loaded * 100) / e.total)),
        },
      );

      setVideoId(response.data.videoId);
      setStreamUrl(response.data.streamUrl);
      setUploadComplete(true);
      setUploading(false);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed! Please try again.");
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!videoId || !showPlayer) return;

    const interval = setInterval(() => {
      fetch(`http://localhost:5001/data/upload_${videoId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.species) setAiStats(data);
        })
        .catch(() => {});
    }, 1000);

    return () => clearInterval(interval);
  }, [videoId, showPlayer]);

  // reset handler
  const handleReset = () => {
    setVideoId(null);
    setStreamUrl(null);
    setShowPlayer(false);
    setUploadComplete(false);
    setAiStats({
      species: "Detecting...",
      status: "Analyzing...",
      health: "Unknown",
    });
  };

  // helper for text colors
  const getStatusColor = (val) =>
    val === "Floater" ? "text-red-600" : "text-green-600";
  const getHealthColor = (val) =>
    val === "Critical" ? "text-red-600" : "text-green-600";

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center bg-gray-50">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-gray-800">Video Analysis</h3>
          <p className="text-sm text-gray-500">Upload footage here</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {showPlayer && (
            <button
              onClick={handleReset}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Close Video"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          {!showPlayer && !uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload New
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* 1. IInitial state */}
        {!uploading && !uploadComplete && !showPlayer && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <Upload className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No video selected</p>
          </div>
        )}

        {/* 2. Uploading state */}
        {uploading && (
          <div className="py-8 px-4 text-center">
            <div className="mb-2 flex justify-between text-sm font-medium text-gray-600">
              <span>Uploading video...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 3. Upload complete (Ready to Play) */}
        {uploadComplete && !showPlayer && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <div className="text-center">
              <h4 className="text-lg font-bold text-gray-800">
                Upload Successful!
              </h4>
              <p className="text-gray-500 text-sm">
                Your video is ready for processing.
              </p>
            </div>
            <button
              onClick={() => setShowPlayer(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95"
            >
              <Play className="w-5 h-5" />
              Analyze Video
            </button>
          </div>
        )}

        {/* 4. Player + stats  */}
        {showPlayer && streamUrl && (
          <div className="animate-in fade-in duration-500">
            {/* Video controller - Centered & Smaller */}
            <div className="relative mx-auto mb-6 bg-black rounded-xl overflow-hidden shadow-lg border border-gray-200 max-w-[480px]">
              <div className="aspect-[4/3] w-full relative">
                <img
                  src={streamUrl}
                  className="absolute inset-0 w-full h-full object-contain"
                  alt="AI Stream"
                />
                {/* Live Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  AI PROCESSING
                </div>
              </div>
            </div>

            {/* Seperator */}
            <div className="h-px bg-gray-100 w-full mb-4"></div>

            <div className="grid grid-cols-3 gap-6">
              {/* Box 1: Species */}
              <div className="flex flex-col items-center justify-center text-center bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-6">
                <p className="text-xl font-black text-blue-900 leading-tight">
                  {aiStats.species}
                </p>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-2">
                  Species
                </p>
              </div>

              {/* Box 2: Behavior */}
              <div
                className={`flex flex-col items-center justify-center text-center rounded-2xl border shadow-sm p-6 transition-colors
    ${aiStats.status === "Aggressive" ? "bg-orange-50 border-orange-100" : "bg-indigo-50 border-indigo-100"}`}
              >
                <p
                  className={`text-xl font-black leading-tight ${getStatusColor(aiStats.status)}`}
                >
                  {aiStats.status}
                </p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                  Behavior
                </p>
              </div>

              {/* Box 3: Health */}
              <div
                className={`flex flex-col items-center justify-center text-center rounded-2xl border shadow-sm p-6 transition-colors
    ${aiStats.health === "Critical" ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}
              >
                <p
                  className={`text-xl font-black leading-tight ${getHealthColor(aiStats.health)}`}
                >
                  {aiStats.health}
                </p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                  Health
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
