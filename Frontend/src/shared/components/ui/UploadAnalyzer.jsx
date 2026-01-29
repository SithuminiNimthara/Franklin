import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Upload, Play, CheckCircle, X, Activity, ShieldCheck, Bug } from "lucide-react";

export default function UploadAnalyzer() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [aiStats, setAiStats] = useState({ species: "Detecting...", status: "Analyzing...", health: "Unknown" });

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setUploadComplete(false);
    setShowPlayer(false);
    setAiStats({ species: "Detecting...", status: "Analyzing...", health: "Unknown" });
    const formData = new FormData();
    formData.append("video", file);
    try {
      const response = await axios.post("http://localhost:5002/api/hatchery/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      });
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
        .then((data) => { if (data.species) setAiStats(data); })
        .catch(() => { });
    }, 1000);
    return () => clearInterval(interval);
  }, [videoId, showPlayer]);

  const handleReset = () => {
    setVideoId(null);
    setStreamUrl(null);
    setShowPlayer(false);
    setUploadComplete(false);
    setAiStats({ species: "Detecting...", status: "Analyzing...", health: "Unknown" });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
      <div className="p-5 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest">Behavior Diagnostics</h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mt-0.5">Offline Video Processing</p>
        </div>

        <div className="flex gap-2">
          {showPlayer && (
            <button onClick={handleReset} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"><X className="w-4 h-4" /></button>
          )}

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
          {!showPlayer && !uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />Upload Clip
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {!uploading && !uploadComplete && !showPlayer && (
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl h-40 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-slate-900/50">
            <Upload className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Footage</p>
          </div>
        )}

        {uploading && (
          <div className="py-6 text-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase">Transferring...</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {uploadComplete && !showPlayer && (
          <div className="flex flex-col items-center justify-center py-6 gap-4 animate-in zoom-in-95 duration-300">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full"><CheckCircle className="w-10 h-10 text-green-500" /></div>
            <div className="text-center">
              <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest">Buffer Synchronized</h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1">Ready for behavioral analysis</p>
            </div>
            <button
              onClick={() => setShowPlayer(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />Initiate Diagnostics
            </button>
          </div>
        )}

        {showPlayer && streamUrl && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative mx-auto mb-6 bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 max-w-[400px]">
              <div className="aspect-video w-full relative">
                <img src={streamUrl} className="absolute inset-0 w-full h-full object-contain" alt="AI Analytics" />
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-white uppercase tracking-tighter">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />Processing Buffer
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricBox label="Species" value={aiStats.species} color="blue" />
              <MetricBox label="Activity" value={aiStats.status} color={aiStats.status === "Aggressive" ? "orange" : "indigo"} />
              <MetricBox label="Vitality" value={aiStats.health} color={aiStats.health === "Critical" ? "red" : "emerald"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400",
    orange: "bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20 text-orange-600 dark:text-orange-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    red: "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400"
  };

  return (
    <div className={`p-4 rounded-xl border text-center ${colors[color] || colors.blue}`}>
      <p className="text-[10px] font-black uppercase tracking-tighter opacity-70 mb-1">{label}</p>
      <p className="text-sm font-black uppercase leading-tight truncate">{value}</p>
    </div>
  );
}
