import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  X,
  CheckCircle,
  User,
} from 'lucide-react';

export default function AlertsPanel({ isOpen, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  // Fetch  hatchery alerts when panel opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5002/api/hatchery/alerts");

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        // console.log(`Fetched ${data.length} total alerts from DB`);

        const mappedAlerts = data.map((a) => ({
          id: a._id,
          type: a.type,
          message: a.message,
          time: getTimeAgo(a.createdAt),
          location: a.location || a.tank,
          status: a.status || "pending",
          createdAt: a.createdAt,
          notes: a.notes || "",
          resolvedBy: a.resolvedBy || "",
          resolvedAt: a.resolvedAt,
        }));

        setAlerts(mappedAlerts);
      } catch (error) {
        console.error("Error fetching alerts:", error);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Helper function
  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now - date) / 60000);

    if (diffInMin < 1) return "Just now";
    if (diffInMin < 60) return `${diffInMin} min ago`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Acknowledge handler
  const handleAcknowledge = async (id) => {
    setResolvingId(id);
    try {
      const response = await fetch(
        `http://localhost:5002/api/hatchery/alerts/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "acknowledged",
            resolvedBy: "Staff Member",
          }),
        }
      );

      if (response.ok) {
        // console.log("Alert acknowledged");
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a))
        );
      }
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    } finally {
      setResolvingId(null);
    }
  };

  // Resolve handler
  const handleResolve = async (id) => {
    const notes = prompt("Add resolution notes (optional):");
    setResolvingId(id);

    try {
      const response = await fetch(
        `http://localhost:5002/api/hatchery/alerts/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "resolved",
            notes: notes || "Resolved by staff",
            resolvedBy: "Staff Member",
          }),
        }
      );

      if (response.ok) {
        // console.log("Alert resolved");
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: "resolved", notes: notes || "" } : a
          )
        );
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    } finally {
      setResolvingId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          icon: 'text-amber-500',
        };
      case 'acknowledged':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          icon: 'text-blue-500',
        };
      case 'resolved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          icon: 'text-green-500',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: 'text-gray-500',
        };
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-teal-600 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Alerts & Notifications
              </h2>
              <p className="text-xs text-white/80 mt-1">
                {alerts.filter((a) => a.status === 'pending').length} pending
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No alerts found</p>
                <p className="text-xs mt-1">All systems operating normally</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const statusStyle = getStatusStyle(alert.status);
                const isProcessing = resolvingId === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={`bg-white border-2 rounded-xl p-4 hover:shadow-md transition-all duration-200 ${
                      alert.status === 'resolved'
                        ? 'border-green-200 opacity-75'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle
                          className={`h-5 w-5 ${statusStyle.icon}`}
                        />
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {alert.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {alert.time}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {alert.message}
                    </p>

                    <div className="flex items-center text-xs text-gray-600 mb-3">
                      <MapPin className="h-3 w-3 mr-1" />
                      {alert.location}
                    </div>

                    {/* Resolution notes */}
                    {alert.status === 'resolved' && alert.notes && (
                      <div className="mb-3 p-2 bg-green-50 rounded text-xs text-green-800">
                        <User className="h-3 w-3 inline mr-1" />
                        {alert.notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    {alert.status === 'pending' && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={isProcessing}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Acknowledge'}
                        </button>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={isProcessing}
                          className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Resolve'}
                        </button>
                      </div>
                    )}

                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        disabled={isProcessing}
                        className="w-full mt-3 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? 'Processing...' : 'Mark as Resolved'}
                      </button>
                    )}

                    {alert.status === 'resolved' && (
                      <div className="mt-3 flex items-center justify-center text-green-600 text-xs font-medium">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolved
                      </div>
                    )}
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
