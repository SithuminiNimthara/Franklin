import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle,
  Wrench,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { API_BASE_URL } from "../../config";

const ALERT_PREVIEW_COUNT = 6;

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

const getTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInMin = Math.floor((now - date) / 60000);
  if (diffInMin < 1) return "Just now";
  if (diffInMin < 60) return `${diffInMin}m ago`;
  if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h ago`;
  return date.toLocaleDateString();
};

export default function HatcheryAlertList() {
  const { getToken } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [fixingAlert, setFixingAlert] = useState(null);
  const [fixNote, setFixNote] = useState("");

  const fetchAlerts = async () => {
  try {
    const { start, end } = getTodayRange();
    const res = await fetch(
      `${API_BASE_URL}/api/hatchery/alerts?startDate=${start}&endDate=${end}`,
    );
    if (!res.ok) return;
    const data = await res.json();
    console.log("Fetched alerts:", data); 
    setAlerts(data);
  } catch (err) {
    console.error("Failed to fetch alerts:", err);
  } finally {
    setLoadingAlerts(false);
  }
};

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const openFix = (id) => {
    setFixingAlert(id);
    setFixNote("");
  };

  const cancelFix = () => {
    setFixingAlert(null);
    setFixNote("");
  };

  const handleResolve = async (id) => {
    if (!id || typeof id !== "string") return;
    if (!fixNote.trim()) return;

    setResolvingId(id);
    const url = `${API_BASE_URL}/api/hatchery/alerts/${id}`;

    try {
      const token = await getToken();
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: "fixed",
          notes: fixNote.trim(),
          resolvedBy: "System Operator",
        }),
      });

      if (response.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a._id?.toString() === id
              ? { ...a, status: "fixed", notes: fixNote.trim() }
              : a,
          ),
        );
        setFixingAlert(null);
        setFixNote("");
      } else {
        //console.error("[PATCH Failed]", response.status, await response.text());
      }
    } catch (e) {
      //console.error("[PATCH Error]", e);
    } finally {
      setResolvingId(null);
    }
  };

  const visibleAlerts = showAllAlerts
    ? alerts
    : alerts.slice(0, ALERT_PREVIEW_COUNT);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-xl flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gray-50 dark:bg-slate-800/40 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Hatchery Alerts
          </h3>
          <p className="text-sm items-center flex text-red-500 mt-1">
            <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse mr-1.5" />
            {alerts.filter((a) => a.status === "pending").length} Unresolved
            Today
          </p>
        </div>
        <span className="text-sm px-3 py-1 bg-white dark:bg-slate-900 shadow-sm rounded-lg border dark:border-slate-700 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
          {new Date().toLocaleDateString("en-LK", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Colombo",
          })}
        </span>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto max-h-[800px] custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
        {loadingAlerts && alerts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
              Scanning Bio-Grid...
            </span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <p className="text-md font-semibold dark:text-white">
              All Clear Today
            </p>
            <p className="text-sm text-gray-500 mt-1 italic">
              No hatchery alerts recorded today
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleAlerts.map((alert) => {
                const id = alert._id?.toString();
                const isResolving = resolvingId === id;
                const isFixing = fixingAlert === id;
                const isFixed = alert.status === "fixed";
                const isPending = alert.status === "pending";

                return (
                  <div
                    key={id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all hover:shadow-xl ${
                      isFixed
                        ? "border-emerald-200 dark:border-emerald-900/30 opacity-70"
                        : "border-gray-200 dark:border-slate-800"
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isFixed ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                        )}
                        <span
                          className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                            isFixed
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isFixed ? "Fixed" : "Pending"}
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 flex items-center gap-1 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(alert.createdAt)}
                      </span>
                    </div>

                    {/* Alert message */}
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-3">
                      {alert.message}
                    </p>

                    {/* Tank location */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-black dark:text-gray-400 mb-4 bg-gray-50 dark:bg-slate-800/50 w-fit px-2 py-2 rounded-lg border border-gray-100 dark:border-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      {alert.location || alert.tank}
                    </div>

                    {/* Fix note — shown after fixed */}
                    {isFixed && alert.notes && (
                      <div className="mb-3 p-3 dark:bg-emerald-900/10 rounded-xl dark:border-emerald-900/20">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-600 flex items-start gap-1">
                          <Wrench className="h-3 w-3 mt-1 shrink-0" />
                          {alert.notes}
                        </p>
                        {alert.resolvedBy && (
                          <p className="text-[9px] text-blue-600 mt-1 ml-[18px]">
                            Fixed by {alert.resolvedBy}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Fix textarea panel */}
                    {isPending && isFixing && (
                      <div className="mb-3 flex flex-col gap-2">
                        <textarea
                          autoFocus
                          value={fixNote}
                          onChange={(e) => setFixNote(e.target.value)}
                          placeholder="Describe what was fixed..."
                          rows={2}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(id)}
                            disabled={!fixNote.trim() || isResolving}
                            className="flex-1 bg-red-500 hover:bg-red-700 disabled:opacity-40 text-white text-sm py-2 rounded-xl transition-all active:scale-95"
                          >
                            {isResolving ? "Saving..." : "Save & Mark Fixed"}
                          </button>
                          <button
                            onClick={cancelFix}
                            className="px-4 py-2 text-sm rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Fix button */}
                    {isPending && !isFixing && (
                      <button
                        onClick={() => openFix(id)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        Fix Issue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {alerts.length > ALERT_PREVIEW_COUNT && (
              <div className="mt-8 flex justify-center border-t border-gray-200 dark:border-slate-800 pt-6">
                <button
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="p-2 text-gray-700 dark:text-gray-300 transition"
                >
                  {showAllAlerts ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
