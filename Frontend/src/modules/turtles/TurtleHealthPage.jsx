import { useState, useRef, useEffect } from 'react';
import { Upload, Activity, AlertCircle, CheckCircle, Image, X } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';

function HealthStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5002/api/health/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to fetch stats", err));
  }, []);

  if (!stats) return <p className="text-gray-500 animate-pulse">Loading analytics...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/20 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Scans (24h)</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.recentScans}</p>
        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1 uppercase italic">Live Syncing</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl p-4 border border-green-100 dark:border-green-900/20 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Healthy Turtles</p>
        <p className="text-2xl font-black text-green-700 dark:text-green-400">{stats.stats.healthy.count}</p>
        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{stats.stats.healthy.percentage}% of total</p>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/20 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">FP Cases</p>
        <p className="text-2xl font-black text-red-700 dark:text-red-400">{stats.stats.fp.count}</p>
        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{stats.stats.fp.percentage}% of total</p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/20 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Barnacle Cases</p>
        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.stats.barnacles.count}</p>
        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{stats.stats.barnacles.percentage}% of total</p>
      </div>
    </div>
  );
}

export default function TurtleHealthPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const response = await fetch('http://localhost:8001/classify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setAnalysisResult(data);

      await fetch('http://localhost:5002/api/health/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosisClass: data.class,
          confidence: data.confidence,
          probabilities: data.probabilities,
          notes: 'Auto-saved from diagnostics'
        })
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Failed to analyze image. Ensure backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">Health Diagnostics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm italic">AI-powered disease detection and health monitoring</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardCard title="Diagnostic Center" icon={Upload} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-900/30">
            <div className="space-y-6">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer bg-gray-50 dark:bg-slate-900/50 group"
                >
                  <Image className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4 group-hover:text-blue-500 transition-colors" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 leading-none uppercase tracking-widest">Identify Turtle Health</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Drop image or click to choose from system</p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-900 border border-gray-100 dark:border-slate-800 group">
                  <img src={previewUrl} alt="Preview" className="w-full h-72 object-contain" />
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button onClick={clearSelection} className="bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white shadow-lg transition-all">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {!analysisResult && !isAnalyzing && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button onClick={analyzeImage} className="px-10 py-3 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-2xl rounded-xl">
                        Identify Health Status
                      </Button>
                    </div>
                  )}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col">
                      <Activity className="h-10 w-10 text-blue-400 animate-pulse mb-3" />
                      <p className="text-white text-xs font-black uppercase tracking-widest">Analyzing Biological Patterns...</p>
                    </div>
                  )}
                </div>
              )}

              {analysisResult && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className={`border-2 rounded-2xl p-6 ${analysisResult.class === 'healthy' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' : analysisResult.class === 'fp' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'}`}>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className={`p-4 rounded-xl text-white shadow-lg ${analysisResult.class === 'healthy' ? 'bg-green-500' : analysisResult.class === 'fp' ? 'bg-red-500' : 'bg-amber-500'}`}>
                        {analysisResult.class === 'healthy' ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Detection Result</p>
                        <h3 className="text-xl font-black dark:text-white uppercase leading-none">{analysisResult.class === 'fp' ? 'Fibropapillomatosis (FP)' : analysisResult.class}</h3>
                        <p className="text-xs font-medium text-gray-500 mt-1 italic">Confidence: {(analysisResult.confidence * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(analysisResult.probabilities || {}).map(([key, val]) => (
                        <div key={key} className="bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-white/20 dark:border-slate-800">
                          <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-tighter">
                            <span className="text-gray-600 dark:text-gray-400">{key}</span>
                            <span className="text-gray-900 dark:text-white">{(val * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full ${key === 'healthy' ? 'bg-green-500' : key === 'fp' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${val * 100}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard title="Biological Metrics" icon={Activity} iconColor="text-teal-600" iconBg="bg-teal-100 dark:bg-teal-900/30">
            <HealthStats />
          </DashboardCard>

          <DashboardCard title="Care Protocols" icon={AlertCircle} iconColor="text-purple-600" iconBg="bg-purple-100 dark:bg-purple-900/30">
            <div className="space-y-2">
              {[
                { label: 'FP (Disease)', color: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400', items: ['Isolate immediately', 'Surgical review', 'Long-term monitoring'] },
                { label: 'Barnacles', color: 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400', items: ['Manual extraction', 'Surface cleaning', 'Healing ointment'] },
                { label: 'Safe Health', color: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400', items: ['Tag and release', 'Documentation update', 'Growth recording'] }
              ].map((protocol, pi) => (
                <div key={pi} className={`${protocol.color} rounded-xl p-3 border border-current opacity-80 border-opacity-10`}>
                  <p className="text-[10px] font-black uppercase mb-1.5">{protocol.label}</p>
                  <ul className="text-[10px] grid grid-cols-1 gap-1">
                    {protocol.items.map((it, ii) => <li key={ii} className="flex items-center"><CheckCircle className="h-2.5 w-2.5 mr-2 opacity-60" />{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
