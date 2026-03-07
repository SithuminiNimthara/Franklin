import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Activity, AlertCircle, CheckCircle, Image, X, MapPin, Camera, History, Plus, Stethoscope, Map } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';
import GoogleMapPicker from '../../shared/components/maps/GoogleMapPicker';
import DiseaseHotspotMap from './DiseaseHotspotMap';
import { API_BASE_URL, DISEASE_MODEL_URL } from '../../shared/config';

/* ───────────────────────── Stats sidebar → now horizontal row ───────────────────────── */
function HealthStats({ refreshTrigger }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to fetch stats", err));
  }, [refreshTrigger]);

  if (!stats) return <p className="text-gray-500 animate-pulse">Loading analytics...</p>;

  const cards = [
    { label: 'Total Scans (24h)', value: stats.recentScans, sub: 'Live Syncing', gradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10', border: 'border-blue-100 dark:border-blue-900/20', valueColor: 'text-gray-900 dark:text-white', subColor: 'text-green-600 dark:text-green-400' },
    { label: 'Healthy Turtles', value: stats.stats.healthy.count, sub: `${stats.stats.healthy.percentage}% of total`, gradient: 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10', border: 'border-green-100 dark:border-green-900/20', valueColor: 'text-green-700 dark:text-green-400', subColor: 'text-gray-600 dark:text-gray-400' },
    { label: 'FP Cases', value: stats.stats.fp.count, sub: `${stats.stats.fp.percentage}% of total`, gradient: 'from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10', border: 'border-red-100 dark:border-red-900/20', valueColor: 'text-red-700 dark:text-red-400', subColor: 'text-gray-600 dark:text-gray-400' },
    { label: 'Barnacle Cases', value: stats.stats.barnacles.count, sub: `${stats.stats.barnacles.percentage}% of total`, gradient: 'from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10', border: 'border-amber-100 dark:border-amber-900/20', valueColor: 'text-amber-700 dark:text-amber-400', subColor: 'text-gray-600 dark:text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={i} className={`bg-gradient-to-br ${c.gradient} rounded-xl p-4 border ${c.border} shadow-sm`}>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{c.label}</p>
          <p className={`text-2xl font-black ${c.valueColor}`}>{c.value}</p>
          <p className={`text-[10px] font-bold mt-1 ${c.subColor}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Recent Diagnoses Table ───────────────────────── */
function RecentDiagnosesTracker({ refreshTrigger }) {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    // Reset to page 1 on fresh load or when refreshTrigger changes
    setPage(1);
    fetchData(1, true);
  }, [refreshTrigger]);

  const fetchData = async (pageNum, reset = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/health/recent?page=${pageNum}&limit=10`);
      const data = await res.json();

      if (data && data.diagnoses) {
        setHistory(prev => (reset ? data.diagnoses : [...prev, ...data.diagnoses]));
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, false);
  };

  return (
    <DashboardCard title="Recent Diagnoses History" icon={History} iconColor="text-indigo-600" iconBg="bg-indigo-100 dark:bg-indigo-900/30">
      {history.length === 0 && !loading ? (
        <p className="text-gray-500 text-sm text-center py-6">No recent diagnostic records found.</p>
      ) : (
        <div className="flex flex-col w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="pb-3 font-bold">Health Status</th>
                  <th className="pb-3 font-bold pl-4">Confidence</th>
                  <th className="pb-3 font-bold pl-4">Date & Time</th>
                  <th className="pb-3 font-bold pl-4">Photo</th>
                  <th className="pb-3 font-bold pl-4">GPS Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {history.map((record) => (
                  <tr key={record._id} onClick={() => setSelectedRecord(record)} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer group">
                    <td className="py-3">
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${record.diagnosisClass === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        record.diagnosisClass === 'fp' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                        {record.diagnosisClass === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span>{record.diagnosisClass === 'fp' ? 'Fibropapillomatosis' : record.diagnosisClass}</span>
                      </span>
                    </td>
                    <td className="py-3 pl-4">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {record.confidence ? (record.confidence * 100).toFixed(1) : 'N/A'}%
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      {new Date(record.timestamp).toLocaleString('en-LK')}
                    </td>
                    <td className="py-3 pl-4">
                      {record.imageUrl ? (
                        <div className="text-blue-500 group-hover:text-blue-700 flex items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit text-[10px] font-bold">
                          <Image className="h-3 w-3 mr-1" /> View Image
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic font-medium">No Image</span>
                      )}
                    </td>
                    <td className="py-3 pl-4">
                      {record.location && record.location.lat ? (
                        <div className="flex items-center text-[10px] text-gray-500 font-medium font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-flex">
                          <MapPin className="h-3 w-3 mr-1 opacity-70" />
                          {record.location.lat.toFixed(5)}, {record.location.lng.toFixed(5)}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Unknown Location</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center shadow-sm"
              >
                See More <Plus className="ml-2 h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
      <DiagnosisDetailsModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </DashboardCard>
  );
}

/* ───────────────────────── Diagnosis Details Modal ───────────────────────── */
function DiagnosisDetailsModal({ record, onClose }) {
  if (!record) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-5 flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl text-white shadow-lg ${record.diagnosisClass === 'healthy' ? 'bg-gradient-to-br from-green-500 to-emerald-500' : record.diagnosisClass === 'fp' ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
              {record.diagnosisClass === 'healthy' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase">Diagnostic Record</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">
                {new Date(record.timestamp).toLocaleString('en-LK')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 pb-8 space-y-5 overflow-y-auto custom-scrollbar">
          {record.imageUrl && (
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-slate-800 group flex items-center justify-center" style={{ minHeight: '200px' }}>
              <img
                src={record.imageUrl}
                alt="Diagnosis"
                className="w-full max-h-72 object-contain relative z-10"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (record.imageUrl.includes('drive.google.com/uc')) {
                    try {
                      const urlObj = new URL(record.imageUrl);
                      const fileId = urlObj.searchParams.get('id');
                      if (fileId && !e.target.dataset.triedFallback) {
                        e.target.dataset.triedFallback = 'true';
                        e.target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
                        return;
                      }
                    } catch (err) {
                      console.error("URL parse error", err);
                    }
                  }
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) {
                    e.target.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="absolute inset-0 hidden flex-col items-center justify-center text-gray-400 z-0 bg-gray-100 dark:bg-slate-800">
                <Image className="h-10 w-10 mb-2 opacity-30" />
                <span className="text-xs uppercase font-bold tracking-widest">Image preview protected</span>
                <a href={record.imageUrl} target="_blank" rel="noreferrer" className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md">
                  Open in Google Drive
                </a>
              </div>
            </div>
          )}

          <div className={`border-2 rounded-2xl p-5 ${record.diagnosisClass === 'healthy' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' : record.diagnosisClass === 'fp' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Primary Diagnosis</p>
                <h3 className="text-xl font-black dark:text-white uppercase leading-none mt-1">{record.diagnosisClass === 'fp' ? 'Fibropapillomatosis (FP)' : record.diagnosisClass}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase">Confidence</p>
                <span className="text-lg font-black dark:text-white mt-1">{(record.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            {record.probabilities && Object.keys(record.probabilities).length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(record.probabilities).map(([key, val]) => (
                  <div key={key} className="bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-white/20 dark:border-slate-800">
                    <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-tighter">
                      <span className="text-gray-600 dark:text-gray-400">{key}</span>
                      <span className="text-gray-900 dark:text-white">{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-700 ${key === 'healthy' ? 'bg-green-500' : key === 'fp' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${val * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700 col-span-2">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">GPS Coordinates</p>
              </div>
              {record.location && record.location.lat ? (
                <div className="h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 shadow-inner w-full relative">
                  <GoogleMapPicker initialLocation={record.location} />
                  <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow border border-gray-200 dark:border-slate-700 pointer-events-none z-10">
                    <p className="font-mono text-[10px] font-bold dark:text-white">
                      {record.location.lat.toFixed(5)}, {record.location.lng.toFixed(5)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm dark:text-gray-400 italic">Location unrecorded</p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700 col-span-2">
              <div className="flex items-center space-x-2 mb-2">
                <History className="h-4 w-4 text-purple-500" />
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">System Notes</p>
              </div>
              <p className="text-sm dark:text-white">{record.notes || <span className="italic text-gray-400">Auto-saved from diagnostics</span>}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────────────── Diagnostic Modal ───────────────────────── */
function DiagnosticModal({ isOpen, onClose, onDiagnosisComplete }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [location, setLocation] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [confirmLocation, setConfirmLocation] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay so the close animation finishes before clearing
      const t = setTimeout(() => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setIsAnalyzing(false);
        setAnalysisResult(null);
        setLocation(null);
        setShowCamera(false);
        setConfirmLocation(false);
        setValidationError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera. Please ensure permissions are granted.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          setSelectedImage(file);
          setPreviewUrl(URL.createObjectURL(file));
          setAnalysisResult(null);
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSelectedImage(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setConfirmLocation(false);
    setValidationError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    if (!confirmLocation) {
      setValidationError("Please tick the checkbox to confirm your location before identifying the health status.");
      return;
    }
    if (!location) {
      setValidationError("Location coordinate tracking failed. Please allow location permissions or click on the map to pinpoint.");
      return;
    }

    setValidationError("");
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const response = await fetch(`${DISEASE_MODEL_URL}/ai/disease/classify`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setAnalysisResult(data);

      // Send image + diagnosis data to backend (FormData for file upload)
      const saveFormData = new FormData();
      saveFormData.append('image', selectedImage);
      saveFormData.append('diagnosisClass', data.class);
      saveFormData.append('confidence', data.confidence);
      saveFormData.append('probabilities', JSON.stringify(data.probabilities));
      saveFormData.append('location', JSON.stringify(location));
      saveFormData.append('notes', 'Auto-saved from diagnostics');

      await fetch(`${API_BASE_URL}/api/health/save`, {
        method: 'POST',
        body: saveFormData,
      });

      if (onDiagnosisComplete) onDiagnosisComplete();
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Failed to analyze image. Ensure backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">New Diagnosis</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">AI-powered health assessment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Image input area */}
          {!previewUrl ? (
            showCamera ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-black group border border-slate-800">
                <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 px-4">
                  <Button onClick={stopCamera} className="bg-red-500 hover:bg-red-600 text-white shadow-lg flex-1">Cancel</Button>
                  <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex-1 font-bold">
                    <Camera className="h-4 w-4 mr-2 inline" /> Capture
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={startCamera}
                  className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer bg-gray-50 dark:bg-slate-800/50 group flex flex-col items-center justify-center hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-widest">Take Photo</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Use device camera</p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer bg-gray-50 dark:bg-slate-800/50 group flex flex-col items-center justify-center hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 mb-3 group-hover:scale-110 transition-transform">
                    <Image className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-widest">Upload File</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Choose from gallery</p>
                </div>
              </div>
            )
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-900 border border-gray-100 dark:border-slate-800 group">
              <img src={previewUrl} alt="Preview" className="w-full h-56 object-contain" />
              <div className="absolute top-3 right-3">
                <button onClick={clearSelection} className="bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white shadow-lg transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col">
                  <Activity className="h-10 w-10 text-blue-400 animate-pulse mb-3" />
                  <p className="text-white text-xs font-black uppercase tracking-widest">Analyzing Biological Patterns...</p>
                </div>
              )}
            </div>
          )}

          {/* Location Picker */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Location Pinpoint</p>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm relative z-0">
              <GoogleMapPicker onLocationSelect={setLocation} />
            </div>
            {location && <p className="text-[10px] text-gray-400 text-right">Selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}

            {/* Location confirmation */}
            <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${confirmLocation ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/40' : validationError ? 'bg-red-50 dark:bg-red-900/10 border-red-400 dark:border-red-900/40' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700'}`}>
              <input
                type="checkbox"
                id="modal-location-confirm"
                checked={confirmLocation}
                onChange={(e) => {
                  setConfirmLocation(e.target.checked);
                  if (e.target.checked) setValidationError("");
                }}
                className="h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
              />
              <div className="flex flex-col">
                <label htmlFor="modal-location-confirm" className={`text-sm font-bold cursor-pointer transition-colors ${validationError ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Confirm Location Recording
                </label>
                <span className={`text-[10px] cursor-pointer transition-colors ${validationError ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'}`} onClick={() => {
                  setConfirmLocation(!confirmLocation);
                  if (!confirmLocation) setValidationError("");
                }}>
                  I confirm that the map pinpoints the exact location of this turtle for the database.
                </span>
              </div>
            </div>
            {validationError && (
              <div className="flex items-start space-x-1.5 mt-1">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-red-500">{validationError}</span>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          {previewUrl && !analysisResult && !isAnalyzing && (
            <Button onClick={analyzeImage} className="w-full px-10 py-3.5 font-bold text-[15px] bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xl shadow-blue-500/20 rounded-xl transition-all">
              <Stethoscope className="h-5 w-5 mr-2 inline" />
              Identify Health Status
            </Button>
          )}

          {/* Results */}
          {analysisResult && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className={`border-2 rounded-2xl p-5 ${analysisResult.class === 'healthy' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' : analysisResult.class === 'fp' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'}`}>
                <div className="flex items-center space-x-4 mb-5">
                  <div className={`p-3.5 rounded-xl text-white shadow-lg ${analysisResult.class === 'healthy' ? 'bg-gradient-to-br from-green-500 to-emerald-500' : analysisResult.class === 'fp' ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
                    {analysisResult.class === 'healthy' ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Detection Result</p>
                    <h3 className="text-xl font-black dark:text-white uppercase leading-none">{analysisResult.class === 'fp' ? 'Fibropapillomatosis (FP)' : analysisResult.class}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-1 italic">Confidence: {(analysisResult.confidence * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(analysisResult.probabilities || {}).map(([key, val]) => (
                    <div key={key} className="bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-white/20 dark:border-slate-800">
                      <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-tighter">
                        <span className="text-gray-600 dark:text-gray-400">{key}</span>
                        <span className="text-gray-900 dark:text-white">{(val * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${key === 'healthy' ? 'bg-green-500' : key === 'fp' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${val * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={onClose} className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all">
                  Close & Return
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────────────── Main Page ───────────────────────── */
export default function TurtleHealthPage() {
  const [showModal, setShowModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDiagnosisComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Health Diagnostics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm italic">AI-powered disease detection and health monitoring</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="group flex items-center space-x-2.5 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="p-1 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-sm">New Diagnosis</span>
        </button>
      </div>

      {/* Stats Row */}
      <HealthStats refreshTrigger={refreshTrigger} />

      {/* Disease Hotspot Map */}
      <DashboardCard title="Disease Hotspot Map" icon={Map} iconColor="text-cyan-600" iconBg="bg-cyan-100 dark:bg-cyan-900/30">
        <DiseaseHotspotMap refreshTrigger={refreshTrigger} />
      </DashboardCard>

      {/* Care Protocols */}
      <DashboardCard title="Care Protocols" icon={AlertCircle} iconColor="text-purple-600" iconBg="bg-purple-100 dark:bg-purple-900/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'FP (Disease)', color: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/30', items: ['Isolate immediately', 'Surgical review', 'Long-term monitoring'] },
            { label: 'Barnacles', color: 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30', items: ['Manual extraction', 'Surface cleaning', 'Healing ointment'] },
            { label: 'Safe Health', color: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30', items: ['Tag and release', 'Documentation update', 'Growth recording'] }
          ].map((protocol, pi) => (
            <div key={pi} className={`${protocol.color} rounded-xl p-4 border ${protocol.border}`}>
              <p className="text-[10px] font-black uppercase mb-2 tracking-wider">{protocol.label}</p>
              <ul className="text-[11px] space-y-1.5">
                {protocol.items.map((it, ii) => <li key={ii} className="flex items-center"><CheckCircle className="h-3 w-3 mr-2 opacity-60 shrink-0" />{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Recent Diagnoses History */}
      <RecentDiagnosesTracker refreshTrigger={refreshTrigger} />

      {/* Diagnostic Modal */}
      <DiagnosticModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onDiagnosisComplete={handleDiagnosisComplete}
      />
    </div>
  );
}
