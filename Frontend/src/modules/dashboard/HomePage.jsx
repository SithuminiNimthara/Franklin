import { useState, useEffect } from 'react';
import { Activity, Video, MapPin, Droplets, AlertCircle, Loader2, Info, ArrowUpRight, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/clerk-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import HlsPlayer from '../../shared/components/media/HlsPlayer';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';
import { API_BASE_URL } from '../../shared/config';

export default function HomePage({ onTabChange }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [mainCamera, setMainCamera] = useState(null);
  const [healthStats, setHealthStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = API_BASE_URL.replace(/\/api$/, '');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.allSettled([
        fetchMainCamera(),
        fetchSystemData()
      ]);
      setLoading(false);
    };
    fetchAllData();
  }, [getToken]);

  const fetchMainCamera = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/api/cameras`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        // Strictly find "Main Camera" by flag or name
        const main = res.data.data.find(c =>
          (c.isMain || c.name.toLowerCase() === 'main camera') && c.isEnabled
        );
        setMainCamera(main || null);
      }
    } catch (error) {
      console.error('[HomePage] Camera fetch error:', error);
    }
  };

  const fetchSystemData = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/api/health/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHealthStats(res.data);
    } catch (error) {
      console.error('[HomePage] System data fetch error:', error);
    }
  };

  const streamUrl = mainCamera
    ? `${API_BASE_URL.replace(/\/api$/, '')}/streams/${mainCamera._id}/stream.m3u8`
    : null;

  return (
    <div className="space-y-8 pb-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="z-10 animate-slideUp">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back, {user?.firstName || 'Conservationist'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">Here's your sea turtle conservation overview.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 animate-slideUp delay-300">
        <StatSummaryCard
          icon={Activity}
          value="127"
          label="Turtles Monitored"
          subtext="↑ 12% this week"
          colorTheme="blue"
          className=""
        />
        <StatSummaryCard
          icon={Video}
          value="43"
          label="Active Nests"
          subtext="8 protected today"
          colorTheme="teal"
          className="delay-75"
        />
        <StatSummaryCard
          icon={AlertCircle}
          value="5"
          label="Active Alerts"
          subtext="3 require attention"
          colorTheme="amber"
          className="delay-150"
        />
        <StatSummaryCard
          icon={Droplets}
          value="234"
          label="Hatchlings Tracked"
          subtext="↑ 18% vs last month"
          colorTheme="purple"
          className="delay-200"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-10 animate-fadeIn delay-500">

        {/* Left Column (2/3 width) */}
        <div className="xl:col-span-2 space-y-8">

          {/* Main Feed Card */}
          <DashboardCard
            title="Nest Monitoring & Predators Feed"
            icon={Video}
            iconColor="text-teal-500"
            iconBg="bg-teal-500/10 dark:bg-teal-500/20"
            right={
              mainCamera && (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{mainCamera.ipAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm border border-teal-500/20 shadow-sm">
                      Live Feed
                    </span>
                  </div>
                </div>
              )
            }
          >
            <div className="mb-6 bg-slate-950 rounded-lg overflow-hidden aspect-video relative border border-slate-200 dark:border-slate-800">

              {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-teal-900/20"></div>
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-400 mb-4 relative z-10" />
                  <p className="text-cyan-400/80 font-medium tracking-wide relative z-10 animate-pulse">Initializing Camera Feed...</p>
                </div>
              ) : streamUrl ? (
                <div className="w-full h-full relative">
                  <HlsPlayer
                    src={streamUrl}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    <button className="bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/10 transition shadow-lg">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-900/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/30 to-transparent"></div>
                  <Video className="h-14 w-14 opacity-20 relative z-10 mb-2" />
                  <div className="text-center relative z-10">
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-300">No Stream Available</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-[250px] leading-relaxed">System could not locate an active main camera feed. Please check configurations.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase mb-1.5 block">Total Scans</span>
                  <div className="flex items-end gap-2.5">
                    <span className="font-black text-3xl text-slate-900 dark:text-white leading-none">1,492</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">+42 today</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-slate-100 dark:border-transparent">
                  <Activity className="w-6 h-6 text-cyan-500" />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase mb-1.5 block">Threats Detected</span>
                  <div className="flex items-end gap-2.5">
                    <span className="font-black text-3xl text-slate-900 dark:text-white leading-none">3</span>
                    <span className="text-[10px] font-black text-rose-50 bg-rose-500 dark:text-rose-200 dark:bg-rose-600/80 px-2 py-0.5 rounded-full mb-0.5 tracking-wider uppercase shadow-sm">Active</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-xl shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 border border-slate-100 dark:border-transparent">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
              </div>
            </div>

            {/* <div className="mt-6">
              <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 border-none shadow-lg shadow-teal-500/25 text-white font-bold tracking-widest uppercase group py-4">
                Open Live Intelligence <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div> */}
            <Button
              variant="secondary"
              className="w-full mt-6 text-xs font-bold uppercase tracking-widest group hover:border-slate-300 dark:hover:border-slate-600 py-3.5"
              onClick={() => onTabChange && onTabChange('nests')}
            >
              Open Live Intelligence <ArrowRight className="w-4 h-4 ml-1.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Button>
          </DashboardCard>

        </div>

        {/* Right Column (1/3 width) - Secondary Data */}
        <div className="space-y-8">

          {/* Health Mini Card */}
          <DashboardCard
            title="Health Diagnostics"
            icon={Activity}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10 dark:bg-blue-500/20"
          >
            <div className="flex flex-col gap-3.5 mt-2">
              {[
                { label: 'FP Cases Detected', value: healthStats?.stats?.fp?.count || 0, status: `${healthStats?.stats?.fp?.percentage || 0}% of all cases`, color: 'text-amber-500 text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' },
                { label: 'Barnacle Infestation', value: healthStats?.stats?.barnacles?.count || 0, status: `${healthStats?.stats?.barnacles?.percentage || 0}% of all cases`, color: 'text-emerald-500 text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
                { label: 'Clear Scans', value: healthStats?.stats?.healthy?.count || 0, status: `${healthStats?.stats?.healthy?.percentage || 0}% success rate`, color: 'text-blue-500 text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20' },
              ].map((item, i) => (
                <div key={i} className="group relative bg-white dark:bg-slate-800/40 p-4.5 py-4 px-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>
                  <div className="relative z-10">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</span>
                    <p className={`text-[11px] mt-1.5 font-bold uppercase tracking-wider ${item.color.split(' ')[0]} opacity-80`}>{item.status}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl border ${item.bg} flex items-center justify-center relative z-10 shadow-inner group-hover:scale-105 transition-transform`}>
                    <span className={`font-black text-xl ${item.color.split(' ')[1]}`}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              className="w-full mt-6 text-xs font-bold uppercase tracking-widest group hover:border-slate-300 dark:hover:border-slate-600 py-3.5"
              onClick={() => onTabChange && onTabChange('health')}
            >
              Open Health Center <ArrowRight className="w-4 h-4 ml-1.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Button>
          </DashboardCard>

          {/* Shoreline Risk */}
          <DashboardCard
            title="Shoreline Risk Level"
            icon={MapPin}
            iconColor="text-orange-500"
            iconBg="bg-orange-500/10 dark:bg-orange-500/20"
          >
            <div className="mt-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-inner group cursor-pointer border border-slate-700">
              {/* Decorative map background */}
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700 group-hover:scale-110 pointer-events-none translate-x-4 translate-y-4">
                <svg className="w-40 h-40 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1.5">Current Status</p>
                  <p className="text-3xl font-black text-white drop-shadow-md">Moderate</p>
                  <div className="flex items-center gap-1.5 mt-3 text-orange-200/70 text-xs font-semibold bg-orange-900/30 px-2 py-1 rounded-md border border-orange-500/20 w-max backdrop-blur-sm">
                    <Info className="w-3.5 h-3.5 text-orange-400" /> Area 4 approaches high runup
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <div className="w-2.5 h-12 rounded-full bg-slate-800 shadow-inner border border-slate-700 flex flex-col justify-end overflow-hidden">
                    <div className="w-full h-[65%] bg-gradient-to-t from-orange-600 to-orange-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,146,60,0.5)]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-widest mb-1.5">High Risk</span>
                <span className="text-2xl font-black text-orange-700 dark:text-orange-300 drop-shadow-sm">4</span>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-1.5">Stable</span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 drop-shadow-sm">32</span>
              </div>
            </div>
            <Button variant="secondary" className="w-full mt-6 text-xs font-bold uppercase tracking-widest group hover:border-slate-300 dark:hover:border-slate-600 py-3.5">
              View Intel Map <ArrowRight className="w-4 h-4 ml-1.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Button>
          </DashboardCard>

        </div>
      </div>

    </div>
  );
}
