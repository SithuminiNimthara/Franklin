import { Waves, Activity, Video, MapPin, Droplets, FileText, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navigation({ activeTab, onTabChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: Waves },
    { id: 'health', label: 'Turtle Health', icon: Activity },
    { id: 'nests', label: 'Nest Monitoring', icon: Video },
    { id: 'shoreline', label: 'Shoreline Risks', icon: MapPin },
    { id: 'hatchery', label: 'Hatchery Management', icon: Droplets },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <nav className="bg-gradient-to-r from-cyan-700 via-teal-600 to-blue-700 shadow-xl backdrop-blur-lg border-b border-white/10 sticky top-0 z-50 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-400 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <Waves className="relative h-10 w-10 text-white drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div>
                <span className="text-white font-extrabold text-xl tracking-wide drop-shadow-sm">
                  Sea Turtle Conservation
                </span>
                <p className="text-cyan-100 text-xs font-medium italic">Marine Protection System</p>
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
                        ? 'bg-white text-cyan-700 shadow-md scale-105'
                        : 'text-white/90 hover:bg-white/15 hover:text-white hover:scale-105 hover:shadow-lg'
                      }`}
                  >
                    <Icon
                      className={`h-4 w-4 transition-transform duration-200 ${activeTab === tab.id
                          ? 'text-cyan-600 scale-110'
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

          <div className="flex items-center space-x-3">
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
