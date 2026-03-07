import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, MapPin, CheckCircle, Search, Filter } from "lucide-react";
import { API_BASE_URL } from "../../shared/config";

export default function NotificationsPage({ onTabChange }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/hatchery/alerts`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setAlerts(data);
            } catch (error) {
                console.error("Error fetching alerts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    const getTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMin = Math.floor((now - date) / 60000);
        if (diffInMin < 1) return "Just now";
        if (diffInMin < 60) return `${diffInMin}m ago`;
        if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const pendingAlerts = alerts.filter(a => a.status === 'pending');
    const otherAlerts = alerts.filter(a => a.status !== 'pending');

    return (
        <div className="animate-fadeIn min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
                    <AlertTriangle className="mr-3 h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                    System Notifications
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                    Monitor and manage alerts across all modules and active operations.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-32">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {pendingAlerts.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <span className="bg-red-500 text-white text-sm px-2.5 py-1 rounded-lg mr-3 shadow-sm">
                                    {pendingAlerts.length}
                                </span>
                                Pending Alerts
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {pendingAlerts.map(alert => (
                                    <NotificationCard key={alert._id || alert.id} alert={alert} getTimeAgo={getTimeAgo} onTabChange={onTabChange} />
                                ))}
                            </div>
                        </div>
                    )}

                    {otherAlerts.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-10 mb-4 flex items-center">
                                <CheckCircle className="text-emerald-500 mr-2 h-6 w-6" />
                                Resolved & Acknowledged
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {otherAlerts.map(alert => (
                                    <NotificationCard key={alert._id || alert.id} alert={alert} getTimeAgo={getTimeAgo} isResolved={true} onTabChange={onTabChange} />
                                ))}
                            </div>
                        </div>
                    )}

                    {alerts.length === 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-gray-100 dark:border-slate-800 shadow-sm">
                            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Systems Normal</h3>
                            <p className="text-gray-500 dark:text-gray-400">There are currently no alerts or notifications.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function NotificationCard({ alert, getTimeAgo, isResolved, onTabChange }) {
    const handleCardClick = () => {
        if (alert.type === 'health_warning') {
            onTabChange && onTabChange('health', alert.linkedRecordId);
        } else if (alert.type === 'nest_motion') {
            onTabChange && onTabChange('nests', alert.linkedRecordId);
        } else {
            onTabChange && onTabChange('hatchery');
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className={`bg-white dark:bg-slate-900 border ${isResolved ? 'border-gray-100 dark:border-slate-800 opacity-75' : 'border-red-100 dark:border-red-900/30'} rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-cyan-500 cursor-pointer transition-all group`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                    {!isResolved && <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />}
                    {isResolved && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${isResolved ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400' : 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'}`}>
                        {alert.type || alert.status || "Alert"}
                    </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimeAgo(alert.createdAt || new Date())}
                </span>
            </div>

            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4 line-clamp-3">
                {alert.message}
            </p>

            <div className="flex items-center text-xs font-medium text-gray-500 bg-gray-50 dark:bg-slate-800/50 w-fit px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-slate-800 mt-auto">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                {alert.location || alert.tank || "System Wide"}
            </div>
        </div>
    );
}
