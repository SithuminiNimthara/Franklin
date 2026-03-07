import { Waves, Activity, Video, MapPin, Droplets, FileText, User, Menu, X, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { API_BASE_URL } from '../../config';

export default function Navigation({ activeTab, onTabChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewAlerts, setPreviewAlerts] = useState([]);

  useEffect(() => {
    const fetchAlertsCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/hatchery/alerts`);
        if (res.ok) {
          const data = await res.json();
          const pending = data.filter(a => (!a.status || a.status === 'pending'));
          setUnreadCount(pending.length);
          setPreviewAlerts(pending.slice(0, 4));
        }
      } catch (e) {
        console.error("Failed to fetch alerts count", e);
      }
    };

    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 15000); // Check every 15s globally
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'home', label: 'Home', icon: Waves },
    { id: 'health', label: 'Turtle Health', icon: Activity },
    { id: 'nests', label: 'Nest Monitoring', icon: Video },
    { id: 'shoreline', label: 'Shoreline Risks', icon: MapPin },
    { id: 'hatchery', label: 'Hatchery Management', icon: Droplets },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <nav className="bg-gradient-to-r from-cyan-500 via-teal-600 to-blue-700 shadow-xl backdrop-blur-lg border-b border-white/10 sticky top-0 z-50 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4 lg:gap-8">
          <div className="flex items-center space-x-4 lg:space-x-8 overflow-hidden">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-cyan-400 blur-md opacity-30 transition-opacity duration-300 group-hover:opacity-50"></div>

                <img
                  src="/images/logo.png"
                  alt="Franklin Logo"
                  className="relative w-24 h-24 object-contain rounded-full"
                />
              </div>

              <div className="leading-tight">
                <span className="block font-extrabold text-xl tracking-wide text-white drop-shadow-sm">
                  FRANKLIN
                </span>
                <p className="text-xs font-medium italic text-blue-700 dark:text-blue-300">
                  Sea Turtle Protection System
                </p>
              </div>
            </div>

            <div className="hidden lg:flex space-x-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`group relative flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-semibold tracking-wide ${activeTab === tab.id
                      ? 'bg-white-100 text-black shadow-md scale-105'
                      : 'text-white/90 hover:bg-white/15 hover:text-white hover:scale-105 hover:shadow-lg'
                      }`}
                  >
                    <Icon
                      className={`h-4 w-4 transition-transform duration-200 ${activeTab === tab.id
                        ? 'text-black scale-110'
                        : 'group-hover:scale-110 text-white'
                        }`}
                    />
                    <span className="text-sm">{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-400 rounded-full shadow-sm"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-xl transition-all duration-300 group relative overflow-hidden border border-white/20 flex items-center justify-center"
                title="View Alerts"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <Bell className="h-5 w-5 text-white drop-shadow" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-md animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Alerts Dropdown Overlay */}
              {alertsDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAlertsDropdownOpen(false)}
                  />
                  <div className="absolute top-14 right-0 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all z-50 animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">Recent Alerts</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {unreadCount} NEW EVENT{unreadCount !== 1 && 'S'}
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {previewAlerts.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                          <Activity className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-xs font-bold uppercase tracking-widest">No pending alerts</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50 dark:divide-slate-800/50">
                          {previewAlerts.map(alert => (
                            <div key={alert._id || alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                              <p className="text-xs font-bold text-gray-900 dark:text-white mb-1.5 line-clamp-2 leading-relaxed">
                                {alert.message}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-900/10 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/20">
                                  {alert.tank || alert.location || 'Unknown Unit'}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Pending</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                      <button
                        onClick={() => {
                          setAlertsDropdownOpen(false);
                          onTabChange('hatchery');
                        }}
                        className="w-full py-2.5 text-[11px] font-black text-white hover:bg-cyan-700 bg-cyan-600 shadow-lg shadow-cyan-600/20 rounded-xl transition-all uppercase tracking-widest"
                      >
                        Action Center
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onTabChange('profile')}
              className="hidden lg:block bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-300 group relative overflow-hidden border border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/10 to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-2">
                <User className="h-5 w-5 text-white drop-shadow" />
                <span className="text-white font-medium text-sm">Profile</span>
              </div>
            </button>

            <div className="hover:bg-white/20 transition-all duration-300">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>


            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden bg-white/15 hover:bg-white/25 p-2.5 rounded-xl transition-all duration-200"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 right-0 bg-gradient-to-b from-cyan-700 via-teal-700 to-blue-800 shadow-2xl border-t border-white/10 backdrop-blur-md animate-slideDown">
            <div className="px-5 py-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id
                      ? 'bg-white text-cyan-700 shadow-lg'
                      : 'text-white/90 hover:bg-white/10 hover:scale-[1.02]'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  onTabChange('profile');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 transition-all duration-300"
              >
                <User className="h-5 w-5" />
                <span className="font-semibold">Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
