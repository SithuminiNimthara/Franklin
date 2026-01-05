import { Droplets, Activity, TrendingUp, AlertTriangle, ThermometerSun, Wind } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';

export default function HatcheryPage() {
  const tanks = [
    { id: 1, name: 'Tank A', species: 'Loggerhead', count: 45, health: 'excellent', temp: 28.5, activity: 'normal' },
    { id: 2, name: 'Tank B', species: 'Green Turtle', count: 38, health: 'good', temp: 27.8, activity: 'normal' },
    { id: 3, name: 'Tank C', species: 'Hawksbill', count: 52, health: 'excellent', temp: 28.2, activity: 'high' },
    { id: 4, name: 'Tank D', species: 'Loggerhead', count: 41, health: 'fair', temp: 29.1, activity: 'low' },
  ];

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'fair':
        return 'bg-amber-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hatchery Management</h1>
        <p className="text-gray-600 mt-1">Monitor baby turtles and optimize care conditions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatSummaryCard
          icon={Droplets}
          value="234"
          label="Total Hatchlings"
          colorTheme="blue"
        />
        <StatSummaryCard
          icon={Activity}
          value="98.5%"
          label="Survival Rate"
          colorTheme="green"
        />
        <StatSummaryCard
          icon={AlertTriangle}
          value="1"
          label="Abnormal Alerts"
          colorTheme="amber"
        />
        <StatSummaryCard
          icon={TrendingUp}
          value="4"
          label="Active Tanks"
          colorTheme="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tanks.map((tank) => (
          <div
            key={tank.id}
            className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100 hover:border-cyan-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{tank.name}</h3>
                  <p className="text-sm text-cyan-100">{tank.species}</p>
                </div>
                <div className={`${getHealthColor(tank.health)} w-4 h-4 rounded-full border-2 border-white shadow-lg`}></div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Hatchlings</p>
                  <p className="text-2xl font-bold text-gray-900">{tank.count}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Health Status</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{tank.health}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <ThermometerSun className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-gray-700 font-medium">Temperature</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{tank.temp}°C</span>
                </div>

                <div className="flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm text-gray-700 font-medium">Activity Level</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${tank.activity === 'high' ? 'bg-green-100 text-green-700' :
                    tank.activity === 'low' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                    {tank.activity.toUpperCase()}
                  </span>
                </div>
              </div>

              <Button className="mt-4 w-full">
                View Detailed Analytics
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Species Distribution"
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Loggerhead</span>
                <span className="text-sm font-bold text-gray-900">86 (36.8%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full shadow-md" style={{ width: '36.8%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Green Turtle</span>
                <span className="text-sm font-bold text-gray-900">38 (16.2%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full shadow-md" style={{ width: '16.2%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Hawksbill</span>
                <span className="text-sm font-bold text-gray-900">52 (22.2%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full shadow-md" style={{ width: '22.2%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Leatherback</span>
                <span className="text-sm font-bold text-gray-900">58 (24.8%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full shadow-md" style={{ width: '24.8%' }}></div>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Environmental Monitoring"
          icon={Wind}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
        >
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Average Water Temperature</p>
              <div className="flex items-end justify-between mt-1">
                <h4 className="text-xl font-bold text-gray-900">28.4°C</h4>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Optimal</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">pH Level</p>
              <div className="flex items-end justify-between mt-1">
                <h4 className="text-xl font-bold text-gray-900">8.1</h4>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Stable</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Oxygen Level</p>
              <div className="flex items-end justify-between mt-1">
                <h4 className="text-xl font-bold text-gray-900">7.2 mg/L</h4>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Good</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Water Quality</p>
              <div className="flex items-end justify-between mt-1">
                <h4 className="text-xl font-bold text-gray-900">Excellent</h4>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">All systems optimal</p>
            <p className="text-xs text-gray-600">Last checked: 5 minutes ago</p>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard
        title="Recent Activity Log"
        icon={Activity}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
      >
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">Tank C - High activity detected</p>
                <p className="text-sm text-gray-600 mt-1">52 hatchlings showing increased movement</p>
                <p className="text-xs text-gray-500 mt-1">15 minutes ago</p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">NORMAL</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">Feeding completed - All tanks</p>
                <p className="text-sm text-gray-600 mt-1">234 hatchlings fed successfully</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">SUCCESS</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">Tank D - Low activity alert</p>
                <p className="text-sm text-gray-600 mt-1">Monitoring 41 hatchlings closely</p>
                <p className="text-xs text-gray-500 mt-1">3 hours ago</p>
              </div>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">MONITORING</span>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
