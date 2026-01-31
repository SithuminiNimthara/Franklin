import { useState, useEffect } from 'react';
import { Video, Plus, Trash2, Save, Power, PowerOff, Loader2, AlertCircle, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';
import { API_BASE_URL } from '../../shared/config';

export default function CameraSection() {
    const { getToken } = useAuth();
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [newCamera, setNewCamera] = useState({ name: '', ipAddress: '' });
    const [showAddForm, setShowAddForm] = useState(false);

    const API_BASE = API_BASE_URL.replace(/\/api$/, '');

    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get(`${API_BASE}/api/cameras`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setCameras(res.data.data);
            }
        } catch (error) {
            console.error('[Cameras] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(newCamera.ipAddress.trim())) {
            alert('Please enter a valid IPv4 address.');
            return;
        }

        setActionLoading('add');
        try {
            const token = await getToken();
            const res = await axios.post(`${API_BASE}/api/cameras`, newCamera, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                fetchCameras(); // Refresh to catch "Main Camera" logic changes
                setNewCamera({ name: '', ipAddress: '' });
                setShowAddForm(false);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add camera');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggle = async (id, isEnabled) => {
        setActionLoading(id);
        try {
            const token = await getToken();
            const res = await axios.put(`${API_BASE}/api/cameras/${id}`, { isEnabled: !isEnabled }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setCameras(cameras.map(c => c._id === id ? res.data.data : c));
            }
        } catch (error) {
            alert('Failed to update camera');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this camera? All stream data will be removed.')) return;

        setActionLoading(id);
        try {
            const token = await getToken();
            await axios.delete(`${API_BASE}/api/cameras/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCameras(cameras.filter(c => c._id !== id));
        } catch (error) {
            alert('Failed to delete camera');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <DashboardCard
            title="CCTV Camera Management"
            icon={Video}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-100 dark:bg-cyan-900/30"
        >
            <div className="space-y-4 pt-2">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    </div>
                ) : cameras.length === 0 && !showAddForm ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                        <Video className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-xs">No cameras configured</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline"
                        >
                            + Register Device
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {cameras.map(cam => (
                            <div key={cam._id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all hover:border-cyan-500/30">
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-full ${cam.isEnabled ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                                        <Video className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{cam.name}</h4>
                                            {cam.isMain && (
                                                <span className="bg-cyan-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Main</span>
                                            )}
                                        </div>
                                        <div className="flex items-center text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            <span>IP: {cam.ipAddress}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleToggle(cam._id, cam.isEnabled)}
                                        disabled={actionLoading === cam._id}
                                        className={`p-2 rounded-xl border transition-all ${cam.isEnabled ? 'text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 border-gray-200 dark:border-slate-700'}`}
                                        title={cam.isEnabled ? 'Active - Click to disable' : 'Disabled - Click to enable'}
                                    >
                                        {actionLoading === cam._id ? <Loader2 className="h-4 w-4 animate-spin" /> : cam.isEnabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cam._id)}
                                        disabled={actionLoading === cam._id}
                                        className="p-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-500 transition-all hover:bg-red-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showAddForm ? (
                    <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Device Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Main Camera"
                                    value={newCamera.name}
                                    onChange={e => setNewCamera({ ...newCamera, name: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Camera IP Address</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: 192.168.x.xxx"
                                    value={newCamera.ipAddress}
                                    onChange={e => setNewCamera({ ...newCamera, ipAddress: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-cyan-500 outline-none dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" disabled={actionLoading === 'add'} className="flex-1 py-2 text-xs font-black uppercase">
                                {actionLoading === 'add' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Initialize Feed
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)} className="px-6 py-2 text-xs font-bold">
                                Close
                            </Button>
                        </div>
                        <div className="text-[9px] text-gray-500 italic bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                            * RTSP URL is managed automatically. Use "Main Camera" as name for the priority feed.
                        </div>
                    </form>
                ) : (
                    !loading && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-gray-400 dark:text-slate-500 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center justify-center font-bold text-xs"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Provision New Camera
                        </button>
                    )
                )}
            </div>
        </DashboardCard>
    );
}
