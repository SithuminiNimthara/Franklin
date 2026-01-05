import React, { useState } from 'react';
import { Upload, FileVideo, Play, Loader, CheckCircle, RefreshCcw } from 'lucide-react';

export default function SimulationUpload({ onSimulationComplete, onClear }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            if (onClear) onClear();
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            setResult(data);
            if (onSimulationComplete) {
                onSimulationComplete(data);
            }
        } catch (error) {
            console.error(error);
            alert('Error analyzing video. Ensure the Unified Backend is running on port 8000.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Upload className="h-5 w-5 text-teal-600 mr-2" />
                    Offline Simulation (Turtles, Predators, Humans)
                </h3>
                {result && (
                    <button
                        onClick={() => {
                            setFile(null);
                            setResult(null);
                            if (onClear) onClear();
                        }}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <RefreshCcw className="h-4 w-4" />
                    </button>
                )}
            </div>

            {!result ? (
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors bg-gray-50">
                        <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            id="video-upload"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                            <FileVideo className="h-12 w-12 text-teal-500 mb-2" />
                            <span className="text-sm font-medium text-gray-700">
                                {file ? file.name : "Upload CCTV Video for Analysis"}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">MP4, AVI, MOV</span>
                        </label>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className={`flex items-center px-4 py-2 rounded-lg text-white font-medium transition-all ${!file || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader className="h-4 w-4 animate-spin mr-2" />
                                    Processing Models...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Run Simulation
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 animate-fadeIn">
                    <div className="flex items-center mb-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                        <span className="font-bold text-emerald-800">Simulation Ready</span>
                    </div>
                    <p className="text-sm text-emerald-700">
                        Analysis complete for <strong>{file.name}</strong>.
                        Video duration: {result.duration?.toFixed(1)}s.
                        Play the video below to see mapped detections.
                    </p>
                </div>
            )}
        </div>
    );
}
