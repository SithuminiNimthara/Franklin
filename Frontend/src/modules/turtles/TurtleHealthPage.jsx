import { useState, useRef, useEffect } from 'react';
import { Upload, Activity, AlertCircle, CheckCircle, Image, X } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';

function HealthStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/health/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to fetch stats", err));
  }, []);

  if (!stats) return <p className="text-gray-500">Loading stats...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-sm text-gray-600 mb-1">Total Scans (24h)</p>
        <p className="text-3xl font-bold text-gray-900">{stats.recentScans}</p>
        <p className="text-xs text-green-600 font-medium mt-1">Real-time Data</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-sm text-gray-600 mb-1">Healthy Turtles</p>
        <p className="text-3xl font-bold text-green-700">{stats.stats.healthy.count}</p>
        <p className="text-xs text-gray-600 mt-1">{stats.stats.healthy.percentage}% of scans</p>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-sm text-gray-600 mb-1">FP Cases</p>
        <p className="text-3xl font-bold text-red-700">{stats.stats.fp.count}</p>
        <p className="text-xs text-gray-600 mt-1">{stats.stats.fp.percentage}% of scans</p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <p className="text-sm text-gray-600 mb-1">Barnacle Cases</p>
        <p className="text-3xl font-bold text-amber-700">{stats.stats.barnacles.count}</p>
        <p className="text-xs text-gray-600 mt-1">{stats.stats.barnacles.percentage}% of scans</p>
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
      // Use dedicated Disease Service on 8001
      const response = await fetch('http://localhost:8001/classify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysisResult(data);

      // Save to database
      try {
        await fetch('http://localhost:5000/api/health/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diagnosisClass: data.class,
            confidence: data.confidence,
            probabilities: data.probabilities,
            notes: 'Auto-saved from diagnostics'
          })
        });
      } catch (saveError) {
        console.error("Failed to save diagnosis to DB", saveError);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Failed to analyze image. Please ensure the backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceLevel = (conf) => {
    return (conf * 100).toFixed(1) + '%';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Turtle Health Diagnostics</h1>
        <p className="text-gray-600 mt-1">AI-powered disease detection and health monitoring</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardCard
            title="Upload Image for Diagnosis"
            icon={Upload}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          >
            <div className="space-y-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/jpeg,image/png,image/heic"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-gray-50 to-blue-50/30 group"
                >
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity"></div>
                    <Image className="h-20 w-20 text-gray-400 group-hover:text-blue-500 transition-colors relative" />
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Drop image here or click to upload
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports JPG, PNG, HEIC formats (Max 10MB)
                  </p>
                  <Button className="px-8 py-3 shadow-lg hover:shadow-2xl">
                    Select Image
                  </Button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gray-900 group">
                  <img src={previewUrl} alt="Preview" className="w-full h-80 object-contain bg-gray-900" />
                  <div className="absolute top-4 right-4">
                    <button onClick={clearSelection} className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-all">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {!analysisResult && !isAnalyzing && (
                    <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                      <Button onClick={analyzeImage} className="px-8 py-3 shadow-xl hover:scale-105 transition-transform bg-blue-600 hover:bg-blue-700 border-none text-white">
                        Run Diagnosis
                      </Button>
                    </div>
                  )}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
                      <p className="text-white font-semibold animate-pulse">Analyzing Image Patterns...</p>
                    </div>
                  )}
                </div>
              )}

              {analysisResult && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">Diagnosis Results</h3>

                  <div className={`border-2 rounded-xl p-6 ${analysisResult.class === 'healthy'
                    ? 'bg-green-50 border-green-200'
                    : analysisResult.class === 'fp'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-4 rounded-xl shadow-md ${analysisResult.class === 'healthy' ? 'bg-green-500' :
                          analysisResult.class === 'fp' ? 'bg-red-500' : 'bg-amber-500'
                          }`}>
                          {analysisResult.class === 'healthy' ? (
                            <CheckCircle className="h-8 w-8 text-white" />
                          ) : (
                            <AlertCircle className="h-8 w-8 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 capitalize">
                            Result: {analysisResult.class === 'fp' ? 'Fibropapillomatosis (FP)' : analysisResult.class}
                          </p>
                          <p className="text-gray-600">
                            Confidence: <span className="font-semibold">{getConfidenceLevel(analysisResult.confidence)}</span>
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${analysisResult.class === 'healthy' ? 'bg-green-200 text-green-800' :
                        analysisResult.class === 'fp' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                        }`}>
                        {analysisResult.class}
                      </span>
                    </div>

                    <div className="mt-6">
                      <p className="font-medium text-gray-800 mb-2">Class Potentials (Probabilities):</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(analysisResult.probabilities || {}).map(([key, val]) => (
                          <div key={key} className="bg-white/60 p-3 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize font-medium text-gray-700">{key}</span>
                              <span className="text-gray-500">{(val * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${key === 'healthy' ? 'bg-green-500' :
                                  key === 'fp' ? 'bg-red-500' : 'bg-amber-500'
                                  }`}
                                style={{ width: `${val * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200/50">
                      <p className="text-xs text-gray-500">
                        Note: This diagnosis is based on a Few-Shot Learning Model (Protonet-Conv4).
                        If the results are inconsistent, please ensure the system has been calibrated with the latest support set.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard
            title="Health Statistics"
            icon={Activity}
            iconColor="text-teal-600"
            iconBg="bg-teal-100"
          >
            <HealthStats />
          </DashboardCard>

          <DashboardCard
            title="Treatment Guidelines"
            icon={AlertCircle}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          >
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">Fibropapillomatosis (FP)</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Isolate affected turtle</li>
                  <li>Schedule surgical removal</li>
                  <li>Monitor for recurrence</li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">Barnacle Infestation</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Gentle manual removal</li>
                  <li>Clean affected areas</li>
                  <li>Apply healing ointment</li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">Preventive Care</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Regular health checkups</li>
                  <li>Water quality monitoring</li>
                  <li>Nutrition optimization</li>
                </ul>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
