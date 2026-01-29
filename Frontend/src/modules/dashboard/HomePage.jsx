import { useState, useEffect } from 'react';
import { Activity, Video, MapPin, Droplets, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import HlsPlayer from '../../shared/components/media/HlsPlayer';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';

export default function HomePage() {
  const { getToken } = useAuth();
  const [mainCamera, setMainCamera] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';

  useEffect(() => {
    fetchMainCamera();
  }, []);

  const fetchMainCamera = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/api/cameras`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const main = res.data.data.find(c => c.isMain && c.isEnabled);
        setMainCamera(main);
      }
    } catch (error) {
      console.error('[HomePage] Camera fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const streamUrl = mainCamera
    ? `${API_BASE}/streams/${mainCamera._id}/stream.m3u8`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time monitoring of sea turtle conservation efforts</p>
        </div>
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white !text-white [&_*]:text-white px-6 py-3 rounded-xl shadow-lg">
          <p className="text-sm font-medium !text-white">System Status</p>
          <p className="text-2xl font-bold !text-white">All Systems Operational</p>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatSummaryCard
          icon={Activity}
          value="127"
          label="Turtles Monitored"
          stat="↑ 12%"
          colorTheme="blue"
        />
        <StatSummaryCard
          icon={Video}
          value="43"
          label="Active Nests"
          stat="8 new"
          colorTheme="teal"
        />
        <StatSummaryCard
          icon={AlertCircle}
          value="5"
          label="Active Alerts"
          stat="3 priority"
          colorTheme="amber"
        />
        <StatSummaryCard
          icon={Droplets}
          value="234"
          label="Hatchlings Tracked"
          stat="↑ 18%"
          colorTheme="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Turtle Health Monitoring"
          icon={Activity}
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
        >
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Turtles Scanned Today</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 dark:text-white">23</span>
                <span className="text-xs text-green-600 font-medium">+8</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">FP Cases Detected</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 dark:text-white">3</span>
                <span className="text-xs text-gray-500 font-medium">Stable</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Barnacle Infestations</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 dark:text-white">7</span>
                <span className="text-xs text-red-600 font-medium">-2</span>
              </div>
            </div>
          </div>
          <Button className="mt-4 w-full text-xs font-bold uppercase tracking-wider">
            Diagnostics Hub
          </Button>
        </DashboardCard>

        <DashboardCard
          title="Nest Monitoring & Predators"
          icon={Video}
          iconColor="text-teal-600"
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          action={mainCamera && <div className="text-[10px] font-black bg-cyan-500 text-white px-2 py-1 rounded uppercase tracking-tighter">Main Feed</div>}
        >
          <div className="mb-4 bg-gray-900 rounded-2xl overflow-hidden aspect-video relative shadow-inner border border-gray-200 dark:border-slate-800 transition-all hover:shadow-2xl hover:scale-[1.01]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              </div>
            ) : streamUrl ? (
              <HlsPlayer
                src={streamUrl}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 space-y-2 bg-slate-950">
                <Video className="h-10 w-10 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No Main Camera Configured</p>
                <p className="text-[9px] opacity-40 italic">Set a camera as "Main Camera" in Profile</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Global Nests</span>
              <span className="font-bold text-gray-900 dark:text-white">43</span>
            </div>
            <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Predator Alert</span>
              <span className="font-bold text-red-600">Active</span>
            </div>
          </div>
          <Button variant="success" className="mt-4 w-full text-xs font-bold uppercase tracking-wider">
            Live Intelligence
          </Button>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Shoreline Risk Assessment"
          icon={MapPin}
          iconColor="text-orange-600"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
        >
          <div className="mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-slate-800 dark:to-slate-900 rounded-xl h-48 relative overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
              <MapPin className="h-16 w-16 text-cyan-600/30" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">High Risk Zones</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded font-black text-[10px]">04</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center border border-red-100 dark:border-red-900/40">
              <p className="text-[9px] text-red-600 dark:text-red-400 font-black uppercase">Critical</p>
              <p className="text-xl font-black text-red-700 dark:text-red-500">4</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center border border-amber-100 dark:border-amber-900/40">
              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase">Warning</p>
              <p className="text-xl font-black text-amber-700 dark:text-amber-500">7</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center border border-green-100 dark:border-green-900/40">
              <p className="text-[9px] text-green-600 dark:text-green-400 font-black uppercase">Stable</p>
              <p className="text-xl font-black text-green-700 dark:text-green-500">32</p>
            </div>
          </div>
          <Button variant="warning" className="mt-4 w-full text-white text-xs font-bold uppercase tracking-wider">
            Risk Intel Map
          </Button>
        </DashboardCard>

        <DashboardCard
          title="Hatchery Monitoring"
          icon={Droplets}
          iconColor="text-purple-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
        >
          <div className="space-y-3 mb-4">
            <div className="space-y-3">
              <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <p className="text-[10px] uppercase font-black text-gray-500 dark:text-gray-400 tracking-widest">Hatchlings Sync</p>
                <div className="flex items-end justify-between mt-1">
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white">234</h4>
                  <span className="text-[10px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">+12 Today</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-purple-100 dark:border-purple-900/20">
            <div className="flex items-center justify-between mb-3 text-xs font-black uppercase tracking-widest text-purple-600">
              <span>Genus Distro</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Loggerhead</span>
                  <span className="text-gray-900 dark:text-white">45%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <Button variant="purple" className="mt-4 w-full text-xs font-bold uppercase tracking-wider">
            Biological Analytics
          </Button>
        </DashboardCard>
      </div>
    </div>
  );
}
