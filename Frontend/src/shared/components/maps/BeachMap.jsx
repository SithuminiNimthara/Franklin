import { useState, useEffect } from 'react';
import { MapPin, Users, Dog, Turtle, AlertTriangle } from 'lucide-react';

export default function BeachMap({ simulationEntities }) {
  const [internalEntities, setInternalEntities] = useState([
    { id: 'nest-1', type: 'nest', x: 25, y: 40, status: 'safe', label: 'Nest #234' },
    { id: 'nest-2', type: 'nest', x: 45, y: 55, status: 'warning', label: 'Nest #189' },
    { id: 'nest-3', type: 'nest', x: 65, y: 35, status: 'safe', label: 'Nest #156' },
    { id: 'nest-4', type: 'nest', x: 80, y: 60, status: 'danger', label: 'Nest #201' },
    { id: 'nest-5', type: 'nest', x: 15, y: 70, status: 'safe', label: 'Nest #178' },
    { id: 'nest-6', type: 'nest', x: 55, y: 25, status: 'safe', label: 'Nest #192' },
    { id: 'human-1', type: 'human', x: 30, y: 50, label: 'Patrol Team A' },
    { id: 'human-2', type: 'human', x: 70, y: 45, label: 'Patrol Team B' },
    { id: 'predator-1', type: 'predator', x: 78, y: 58, label: 'Dog detected' },
    { id: 'turtle-1', type: 'turtle', x: 42, y: 30, label: 'Adult turtle' },
    { id: 'turtle-2', type: 'turtle', x: 60, y: 65, label: 'Nesting female' },
  ]);

  const entities = simulationEntities || internalEntities;

  useEffect(() => {
    if (simulationEntities) return;
    const interval = setInterval(() => {
      setInternalEntities((prev) =>
        prev.map((entity) => {
          if (entity.type === 'human' || entity.type === 'predator') {
            return {
              ...entity,
              x: Math.max(5, Math.min(95, entity.x + (Math.random() - 0.5) * 3)),
              y: Math.max(5, Math.min(95, entity.y + (Math.random() - 0.5) * 3)),
            };
          }
          return entity;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [simulationEntities]);

  const getEntityIcon = (type) => {
    switch (type) {
      case 'nest': return MapPin;
      case 'human': return Users;
      case 'predator': return Dog;
      case 'turtle': return Turtle;
      default: return MapPin;
    }
  };

  const getEntityColor = (entity) => {
    if (entity.type === 'nest') {
      switch (entity.status) {
        case 'danger': return 'bg-red-500 border-red-600 shadow-red-500/50 animate-pulse';
        case 'warning': return 'bg-amber-500 border-amber-600 shadow-amber-500/50';
        default: return 'bg-teal-500 border-teal-600 shadow-teal-500/50';
      }
    }
    if (entity.type === 'human') return 'bg-blue-500 border-blue-600 shadow-blue-500/50';
    if (entity.type === 'predator') return 'bg-red-600 border-red-700 shadow-red-600/50 animate-pulse';
    if (entity.type === 'turtle') return 'bg-emerald-500 border-emerald-600 shadow-emerald-500/50';
    return 'bg-gray-500';
  };

  const [hoveredEntity, setHoveredEntity] = useState(null);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-b from-cyan-100 via-yellow-50 to-amber-100 dark:from-cyan-950/30 dark:via-slate-950 dark:to-slate-900 rounded-2xl overflow-hidden shadow-inner transition-all duration-700">
      {/* Sea/Ocean Indicator Overlay */}
      <div className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none overflow-hidden">
        {/* Deep Sea Fade */}
        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-cyan-500/20 via-blue-500/5 to-transparent dark:from-cyan-900/30 dark:via-blue-900/10 dark:to-transparent"></div>

        {/* Wave Pattern */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-30 dark:opacity-40" preserveAspectRatio="none" viewBox="0 0 1440 100">
          <path
            fill="url(#wave-gradient)"
            d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,42.7C840,32,960,32,1080,42.7C1200,53,1320,75,1380,85.3L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
          ></path>
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Dynamic Sea Label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center space-x-2">
          <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-cyan-400"></span>
          <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.3em] opacity-80">Open Ocean</span>
          <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-cyan-400"></span>
        </div>
      </div>

      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
        <svg className="w-full h-full">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-400 dark:text-gray-800" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-3 shadow-xl z-20 border border-white/20 dark:border-slate-800 transition-all">
        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-100 dark:border-slate-800 pb-2">Topography View</h3>
        <div className="space-y-1.5 text-[10px] font-bold">
          {[
            { color: 'bg-teal-500', label: 'Safe Nest' },
            { color: 'bg-amber-500', label: 'Warning Nest' },
            { color: 'bg-red-500 animate-pulse', label: 'Danger Nest' },
            { color: 'bg-blue-500', label: 'Patrol Team' },
            { color: 'bg-red-600', label: 'Predator' },
            { color: 'bg-emerald-500', label: 'Sea Turtle' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <div className={`w-2 h-2 ${item.color} rounded-full`}></div>
              <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Warning Overlay */}
      {entities.some(e => e.status === 'danger' || e.type === 'predator') && (
        <div className="absolute top-4 right-4 bg-red-600/90 dark:bg-red-950/80 backdrop-blur-md rounded-xl p-2.5 shadow-xl z-20 border border-red-500/50 flex items-center space-x-3 text-white animate-in slide-in-from-right-4">
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          <div>
            <p className="text-[10px] font-black uppercase">Conflict Detection</p>
            <p className="text-[9px] font-medium opacity-90 truncate max-w-[120px]">Threat activity confirmed in sector</p>
          </div>
        </div>
      )}

      {/* Entities */}
      {entities.map((entity) => {
        const Icon = getEntityIcon(entity.type);
        return (
          <div
            key={entity.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out cursor-pointer z-30"
            style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
            onMouseEnter={() => setHoveredEntity(entity.id)}
            onMouseLeave={() => setHoveredEntity(null)}
          >
            <div className={`${getEntityColor(entity)} rounded-full p-2 border-2 border-white dark:border-slate-900 shadow-xl hover:scale-125 transition-transform`}>
              <Icon className="h-3 w-3 text-white" />
            </div>

            {hoveredEntity === entity.id && (
              <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] font-black px-2 py-1.5 rounded-lg whitespace-nowrap shadow-2xl z-40 uppercase tracking-widest border border-white/10">
                {entity.label}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer Info */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/20 dark:border-slate-800 transition-all">
        <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter flex items-center">
          Satellite Telemetry Active <span className="inline-block h-1.5 w-1.5 bg-green-500 rounded-full ml-2 animate-pulse"></span>
        </p>
      </div>
    </div>
  );
}
