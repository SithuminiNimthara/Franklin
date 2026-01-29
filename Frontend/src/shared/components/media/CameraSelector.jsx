import { useState, useEffect } from 'react';
import { Camera, ChevronDown, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

export default function CameraSelector({ onSelect, activeCameraId }) {
    const { getToken } = useAuth();
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';

    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        try {
            const token = await getToken();
            const res = await axios.get(`${API_BASE}/api/cameras`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                const activeCams = res.data.data.filter(c => c.isEnabled);
                setCameras(activeCams);

                // On initial load, try to find "Main Camera" or just pick the first one
                if (activeCams.length > 0 && !activeCameraId) {
                    const main = activeCams.find(c => c.isMain) || activeCams[0];
                    onSelect(main);
                }
            }
        } catch (error) {
            console.error('[CameraSelector] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const activeCamera = cameras.find(c => c._id === activeCameraId);

    if (loading) return <div className="h-10 w-32 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />;
    if (cameras.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all h-10"
            >
                <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[120px]">
                    {activeCamera?.name || 'Select Source'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] py-2 animate-fadeIn border-t-4 border-t-cyan-500">
                    <p className="px-4 py-1 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex justify-between items-center">
                        Active Streams
                        <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[8px] animate-pulse">Live</span>
                    </p>
                    {cameras.map(cam => (
                        <button
                            key={cam._id}
                            onClick={() => {
                                onSelect(cam);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center justify-between group ${activeCameraId === cam._id ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/10' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                            <div className="flex items-center space-x-2">
                                <Camera className={`h-3.5 w-3.5 transition-transform group-hover:scale-110 ${activeCameraId === cam._id ? 'text-cyan-500' : 'text-gray-400'}`} />
                                <span className="truncate max-w-[140px]">{cam.name}</span>
                            </div>
                            {cam.isMain && <span className="text-[8px] font-black bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">MAIN</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
