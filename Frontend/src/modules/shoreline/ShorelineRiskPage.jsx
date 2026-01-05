import { MapPin, AlertTriangle, Cloud, Waves, TrendingUp, Droplets } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import { useState } from 'react';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import { Card, CardContent } from '../../shared/components/ui/Card';

export default function ShorelineRiskPage() {
  const riskZones = [
    { id: '1', zone: 'Zone A', riskLevel: 'high', nests: 12, x: 20, y: 35, threats: ['Erosion', 'High tide'] },
    { id: '2', zone: 'Zone B', riskLevel: 'high', nests: 8, x: 45, y: 45, threats: ['Flooding risk'] },
    { id: '3', zone: 'Zone C', riskLevel: 'medium', nests: 15, x: 65, y: 30, threats: ['Storm surge'] },
    { id: '4', zone: 'Zone D', riskLevel: 'low', nests: 8, x: 80, y: 55, threats: [] },
    { id: '5', zone: 'Zone E', riskLevel: 'medium', nests: 10, x: 35, y: 65, threats: ['Erosion'] },
    { id: '6', zone: 'Zone F', riskLevel: 'high', nests: 6, x: 55, y: 50, threats: ['Beach loss', 'Flooding'] },
    { id: '7', zone: 'Zone G', riskLevel: 'low', nests: 14, x: 70, y: 70, threats: [] },
  ];

  const [hoveredZone, setHoveredZone] = useState(null);

  const getRiskColor = (level) => {
    switch (level) {
      case 'high':
        return 'bg-red-500 border-red-600 shadow-red-500/50';
      case 'medium':
        return 'bg-amber-500 border-amber-600 shadow-amber-500/50';
      case 'low':
        return 'bg-green-500 border-green-600 shadow-green-500/50';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Shoreline Risk Assessment</h1>
        <p className="text-gray-600 mt-1">Monitor environmental threats and protect nesting sites</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatSummaryCard
          icon={AlertTriangle}
          value="4"
          label="High Risk Zones"
          colorTheme="red"
        />
        <StatSummaryCard
          icon={Cloud}
          value="7"
          label="Medium Risk Zones"
          colorTheme="amber"
        />
        <StatSummaryCard
          icon={Waves}
          value="32"
          label="Low Risk Zones"
          colorTheme="green"
        />
        <StatSummaryCard
          icon={MapPin}
          value="73"
          label="Nests Monitored"
          colorTheme="cyan"
        />
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Risk Assessment Map</h3>
                <p className="text-sm text-gray-600">Erosion, flooding, and environmental threats</p>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[500px] bg-gradient-to-br from-yellow-100 via-amber-50 to-blue-200 rounded-2xl overflow-hidden shadow-inner">
            <div className="absolute inset-0">
              <svg className="w-full h-full opacity-20">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-blue-400/40 to-transparent">
              <svg className="w-full h-full">
                <pattern id="waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0 10 Q 25 5, 50 10 T 100 10" fill="none" stroke="currentColor" className="text-blue-500" strokeWidth="2" opacity="0.3" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#waves)" />
              </svg>
            </div>

            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg z-10">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Risk Levels</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-red-600"></div>
                  <span className="text-gray-700 font-medium">High Risk (4 zones)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-amber-600"></div>
                  <span className="text-gray-700 font-medium">Medium Risk (7 zones)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-green-600"></div>
                  <span className="text-gray-700 font-medium">Low Risk (32 zones)</span>
                </div>
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg z-10 max-w-xs">
              <div className="flex items-center space-x-2 mb-2">
                <Droplets className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-gray-800">Weather Alert</h4>
              </div>
              <p className="text-xs text-gray-600">High tide expected: 6:30 PM</p>
              <p className="text-xs text-gray-600 mt-1">Storm warning: Next 48 hours</p>
            </div>

            {riskZones.map((zone) => (
              <div
                key={zone.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20"
                style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <div className={`${getRiskColor(zone.riskLevel)} rounded-full w-16 h-16 border-4 shadow-2xl flex items-center justify-center hover:scale-125 transition-all duration-300 ${zone.riskLevel === 'high' ? 'animate-pulse' : ''}`}>
                  <div className="text-center">
                    <p className="text-white font-bold text-xs">{zone.zone}</p>
                    <p className="text-white text-xs">{zone.nests}</p>
                  </div>
                </div>

                {hoveredZone === zone.id && (
                  <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl whitespace-nowrap shadow-2xl z-30 min-w-[200px]">
                    <p className="font-bold mb-1">{zone.zone}</p>
                    <p className="text-gray-300">Risk: <span className={`font-bold ${zone.riskLevel === 'high' ? 'text-red-400' : zone.riskLevel === 'medium' ? 'text-amber-400' : 'text-green-400'}`}>{zone.riskLevel.toUpperCase()}</span></p>
                    <p className="text-gray-300">Nests: {zone.nests}</p>
                    {zone.threats.length > 0 && (
                      <p className="text-gray-300 mt-1">Threats: {zone.threats.join(', ')}</p>
                    )}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Environmental Threats"
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-100"
        >
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Beach Erosion - Zone A</p>
                  <p className="text-sm text-gray-600 mt-1">12 nests at risk</p>
                  <p className="text-xs text-gray-500 mt-1">Last updated: 2 hours ago</p>
                </div>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">CRITICAL</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Storm Surge Warning - Zone C</p>
                  <p className="text-sm text-gray-600 mt-1">15 nests monitored</p>
                  <p className="text-xs text-gray-500 mt-1">Last updated: 30 min ago</p>
                </div>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">WARNING</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Flooding Risk - Zone F</p>
                  <p className="text-sm text-gray-600 mt-1">6 nests at risk</p>
                  <p className="text-xs text-gray-500 mt-1">Last updated: 1 hour ago</p>
                </div>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">CRITICAL</span>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Mitigation Actions"
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        >
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">Immediate Actions</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                  <span>Deploy sand barriers in Zone A</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                  <span>Relocate nests from high-risk zones</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                  <span>Increase monitoring frequency</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-2">Long-term Solutions</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                  <span>Beach restoration projects</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                  <span>Install erosion control structures</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                  <span>Vegetation buffer zones</span>
                </li>
              </ul>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
