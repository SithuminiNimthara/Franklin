import { useEffect, useState } from "react";
import { Bell, Turtle, Layers, Heart, Database, AlertTriangle, Clock, MapPin, CheckCircle, User } from "lucide-react";

import TankVideoCard from "../../shared/components/ui/TankVideoCard";
import UploadAnalyzer from "../../shared/components/ui/UploadAnalyzer";
import StatSummaryCard from "../../shared/components/ui/StatSummaryCard";
import { API_BASE_URL } from "../../shared/config";

export default function HatcheryPage() {
  const [alerts, setAlerts] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const ALERT_PREVIEW_COUNT = 6;

  const tanks = [
    { id: "tankA", label: "Tank Alpha" },
    { id: "tankB", label: "Tank Beta" },
    { id: "tankC", label: "Tank Gamma" },
    { id: "tankD", label: "Tank Delta" },
  ];

  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now - date) / 60000);
    if (diffInMin < 1) return "Just now";
    if (diffInMin < 60) return `${diffInMin}m ago`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/hatchery/alerts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Map exactly like AlertsPanel did
        const formattedAlerts = data.map((a) => ({
          id: a._id, type: a.type, message: a.message, time: getTimeAgo(a.createdAt),
          location: a.location || a.tank, status: a.status || "pending",
          createdAt: a.createdAt, notes: a.notes || "", resolvedBy: a.resolvedBy || "",
          resolvedAt: a.resolvedAt,
        }));
        setAlerts(formattedAlerts);
        setLoadingAlerts(false);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    setLoadingAlerts(true);
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id) => {
    setResolvingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hatchery/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged", resolvedBy: "System Operator" }),
      });
      if (response.ok) setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a)));
    } catch (e) { console.error(e); } finally { setResolvingId(null); }
  };

  const handleResolve = async (id) => {
    const notes = prompt("Incident Resolution Notes:");
    setResolvingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hatchery/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", notes: notes || "Resolved mechanically", resolvedBy: "System Operator" }),
      });
      if (response.ok) setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "resolved", notes: notes || "" } : a)));
    } catch (e) { console.error(e); } finally { setResolvingId(null); }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return { bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-600 dark:text-red-400', icon: 'text-red-500' };
      case 'acknowledged': return { bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500' };
      case 'resolved': return { bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' };
      default: return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600', icon: 'text-slate-500' };
    }
  };

  const visibleAlerts = showAllAlerts
    ? alerts
    : alerts.slice(0, ALERT_PREVIEW_COUNT);

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Hatchery Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-md">
            Automated monitoring of hatchling vitality and development
          </p>
        </div>

        <div className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-4 py-2 rounded-xl font-bold text-xs flex items-center shadow-sm">
          <span className="inline-block h-2 w-2 bg-teal-500 rounded-full mr-2 animate-pulse" />
          RECIRCULATION OPERATIONAL
        </div>
      </div>

      {/* STATS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatSummaryCard icon={Turtle} value="40" label="Total Hatchlings" />
        <StatSummaryCard icon={Layers} value="2" label="Species Diversity" />
        <StatSummaryCard icon={Heart} value="92%" label="Vitality Avg" />
        <StatSummaryCard icon={Database} value="4" label="Active Units" />
      </section>

      {/* VIDEOS */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 dark:bg-slate-800/40">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Live Surveillance Detections
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {tanks.map((tank) => (
            <TankVideoCard
              key={tank.id}
              tankId={tank.id}
              tankLabel={tank.label}
            />
          ))}
        </div>
      </section>

      {/* ANALYZER */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Historical Behavior Analysis
        </h3>
        <UploadAnalyzer />
      </section>

      {/* ALERTS */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b bg-gray-50 dark:bg-slate-800/40 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
              Bio-Grid Event Logs
            </h3>
            <p className="text-[10px] items-center flex font-bold text-red-500 uppercase tracking-widest mt-1">
              <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse mr-1.5" />
              {alerts.filter((a) => a.status === 'pending').length} Critical Unresolved
            </p>
          </div>
          <span className="text-[10px] px-3 py-1 bg-white dark:bg-slate-900 shadow-sm rounded-lg border dark:border-slate-700 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
            Live Stream
          </span>
        </div>

        <div className="p-6 overflow-y-auto max-h-[800px] custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
          {loadingAlerts && alerts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Scanning Bio-Grid...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-20 text-center opacity-40">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
              <p className="text-xs font-black uppercase tracking-widest dark:text-white">All Clear</p>
              <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase italic tracking-tighter">Monitoring systems operational</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleAlerts.map((alert) => {
                  const s = getStatusStyle(alert.status);
                  const isP = resolvingId === alert.id;

                  return (
                    <div key={alert.id} className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl transition-all shadow-sm ${alert.status === 'resolved' ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`h-4 w-4 ${s.icon} ${alert.status === 'pending' ? 'animate-pulse' : ''}`} />
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${s.bg} ${s.text} border border-current border-opacity-10`}>
                            {alert.status}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase flex items-center bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                          <Clock className="h-3 w-3 mr-1" />{alert.time}
                        </span>
                      </div>

                      <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug mb-3">
                        {alert.message}
                      </p>

                      <div className="flex items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-5 bg-gray-50 dark:bg-slate-800/50 w-fit px-2 py-1.5 rounded-lg border border-gray-100 dark:border-slate-800">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-blue-500" />{alert.location}
                      </div>

                      {alert.status === 'resolved' && alert.notes && (
                        <div className="mb-5 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 italic">
                          <User className="h-3 w-3 inline mr-2 opacity-60" />{alert.notes}
                        </div>
                      )}

                      <div className="flex gap-2 mt-auto">
                        {alert.status === 'pending' && (
                          <>
                            <button onClick={() => handleAcknowledge(alert.id)} disabled={isP} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50">
                              ACKNOWLEDGE
                            </button>
                            <button onClick={() => handleResolve(alert.id)} disabled={isP} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50">
                              FIX SYSTEM
                            </button>
                          </>
                        )}
                        {alert.status === 'acknowledged' && (
                          <button onClick={() => handleResolve(alert.id)} disabled={isP} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50">
                            COMPLETE RESOLUTION
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {alerts.length > ALERT_PREVIEW_COUNT && (
                <div className="mt-8 flex justify-center border-t border-gray-200 dark:border-slate-800 pt-6">
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                  >
                    {showAllAlerts ? "Contract Event Logs" : "Expand All Event Logs"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
