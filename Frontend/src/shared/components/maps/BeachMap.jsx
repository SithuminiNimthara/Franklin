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
      case 'nest':
        return MapPin;
      case 'human':
        return Users;
      case 'predator':
        return Dog;
      case 'turtle':
        return Turtle;
      default:
        return MapPin;
    }
  };

  const getEntityColor = (entity) => {
    if (entity.type === 'nest') {
      switch (entity.status) {
        case 'danger':
          return 'bg-red-500 border-red-600 shadow-red-500/50 animate-pulse';
        case 'warning':
          return 'bg-amber-500 border-amber-600 shadow-amber-500/50';
        case 'safe':
        default:
          return 'bg-teal-500 border-teal-600 shadow-teal-500/50';
      }
    }
    if (entity.type === 'human') {
      return 'bg-blue-500 border-blue-600 shadow-blue-500/50';
    }
    if (entity.type === 'predator') {
      return 'bg-red-600 border-red-700 shadow-red-600/50 animate-pulse';
    }
    if (entity.type === 'turtle') {
      return 'bg-emerald-500 border-emerald-600 shadow-emerald-500/50';
    }
    return 'bg-gray-500';
  };

  const [hoveredEntity, setHoveredEntity] = useState(null);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-br from-amber-100 via-yellow-50 to-cyan-100 rounded-2xl overflow-hidden shadow-inner">
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-30">
          <pattern id="wave" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M0 10 Q 25 5, 50 10 T 100 10"
              fill="none"
              stroke="currentColor"
              className="text-cyan-400"
              strokeWidth="2"
            />
          </pattern>
          <rect width="100%" height="30%" y="70%" fill="url(#wave)" />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-cyan-300/40 to-transparent"></div>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg z-10">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Live Beach Map</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-teal-500 rounded-full border-2 border-teal-600"></div>
            <span className="text-gray-700">Safe Nests ({entities.filter(e => e.type === 'nest' && e.status === 'safe').length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full border-2 border-amber-600"></div>
            <span className="text-gray-700">Warning ({entities.filter(e => e.type === 'nest' && e.status === 'warning').length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-red-600 animate-pulse"></div>
            <span className="text-gray-700">Danger ({entities.filter(e => e.type === 'nest' && e.status === 'danger').length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-blue-600"></div>
            <span className="text-gray-700">Patrol Teams ({entities.filter(e => e.type === 'human').length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full border-2 border-red-700 animate-pulse"></div>
            <span className="text-gray-700">Predators ({entities.filter(e => e.type === 'predator').length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-emerald-600"></div>
            <span className="text-gray-700">Turtles ({entities.filter(e => e.type === 'turtle').length})</span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-red-50 border-2 border-red-200 backdrop-blur-sm rounded-xl p-3 shadow-lg z-10">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
          <div>
            <p className="text-xs font-bold text-red-700">Active Threat</p>
            <p className="text-xs text-red-600">Predator near Nest #201</p>
          </div>
        </div>
      </div>

      {entities.map((entity) => {
        const Icon = getEntityIcon(entity.type);
        return (
          <div
            key={entity.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out cursor-pointer z-20"
            style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
            onMouseEnter={() => setHoveredEntity(entity.id)}
            onMouseLeave={() => setHoveredEntity(null)}
          >
            <div
              className={`${getEntityColor(
                entity
              )} rounded-full p-2 border-2 shadow-lg hover:scale-125 transition-transform duration-200`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>

            {hoveredEntity === entity.id && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap shadow-xl z-30">
                {entity.label}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            )}

            {entity.type === 'nest' && entity.status === 'danger' && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 border-2 border-white animate-ping"></div>
            )}
          </div>
        );
      })}

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
        <p className="text-xs font-semibold text-gray-700">
          Real-time tracking <span className="inline-block h-2 w-2 bg-green-500 rounded-full ml-2 animate-pulse"></span>
        </p>
      </div>
    </div>
  );
}
