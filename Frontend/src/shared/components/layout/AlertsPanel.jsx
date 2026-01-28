import { useEffect, useState } from "react";
import { AlertTriangle, Clock, MapPin, X, CheckCircle, User, ShieldAlert } from 'lucide-react';

export default function AlertsPanel({ isOpen, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5002/api/hatchery/alerts");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAlerts(data.map((a) => ({
          id: a._id, type: a.type, message: a.message, time: getTimeAgo(a.createdAt),
          location: a.location || a.tank, status: a.status || "pending",
          createdAt: a.createdAt, notes: a.notes || "", resolvedBy: a.resolvedBy || "",
          resolvedAt: a.resolvedAt,
        })));
      } catch (error) {
        console.error("Error fetching alerts:", error);
        setAlerts([]);
      } finally { setLoading(false); }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now - date) / 60000);
    if (diffInMin < 1) return "Just now";
    if (diffInMin < 60) return `${diffInMin}m ago`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleAcknowledge = async (id) => {
    setResolvingId(id);
    try {
      const response = await fetch(`http://localhost:5002/api/hatchery/alerts/${id}`, {
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
      const response = await fetch(`http://localhost:5002/api/hatchery/alerts/${id}`, {
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

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.3)] transform transition-transform duration-500 ease-in-out z-[60] border-l border-white/5 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 p-6 flex items-center justify-between border-b border-white/5">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Event Logs</h2>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1 italic animate-pulse">
                {alerts.filter((a) => a.status === 'pending').length} Critical Unresolved
              </p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all shadow-inner"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="py-20 text-center"><p className="text-[10px] font-black uppercase text-gray-400 animate-pulse">Scanning Bio-Grid...</p></div>
            ) : alerts.length === 0 ? (
              <div className="py-20 text-center opacity-40">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                <p className="text-xs font-black uppercase tracking-widest dark:text-white">All Clear</p>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase italic tracking-tighter">Monitoring systems operational</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const s = getStatusStyle(alert.status);
                const isP = resolvingId === alert.id;
                return (
                  <div key={alert.id} className={`bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl transition-all group ${alert.status === 'resolved' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className={`h-4 w-4 ${s.icon} ${alert.status === 'pending' ? 'animate-pulse' : ''}`} />
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${s.bg} ${s.text} border border-current border-opacity-10`}>
                          {alert.status}
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase flex items-center"><Clock className="h-3 w-3 mr-1" />{alert.time}</span>
                    </div>

                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-2">{alert.message}</p>

                    <div className="flex items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-4 bg-white dark:bg-slate-800/50 w-fit px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-800">
                      <MapPin className="h-3 w-3 mr-1.5 text-blue-500" />{alert.location}
                    </div>

                    {alert.status === 'resolved' && alert.notes && (
                      <div className="mb-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 italic">
                        <User className="h-3 w-3 inline mr-2 opacity-60" />{alert.notes}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {alert.status === 'pending' && (
                        <>
                          <button onClick={() => handleAcknowledge(alert.id)} disabled={isP} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">ACK</button>
                          <button onClick={() => handleResolve(alert.id)} disabled={isP} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">FIX</button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <button onClick={() => handleResolve(alert.id)} disabled={isP} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">Complete Resolution</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
