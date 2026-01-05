import { Activity, Video, MapPin, Droplets, TrendingUp, AlertCircle } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import HlsPlayer from '../../shared/components/media/HlsPlayer';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of sea turtle conservation efforts</p>
        </div>
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-6 py-3 rounded-xl shadow-lg">
          <p className="text-sm font-medium">System Status</p>
          <p className="text-2xl font-bold">All Systems Operational</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatSummaryCard
          icon={Activity}
          value="127"
          label="Turtles Monitored"
          subtext="↑ 12% from last month"
          colorTheme="blue"
        />
        <StatSummaryCard
          icon={Video}
          value="43"
          label="Active Nests"
          subtext="8 new this week"
          colorTheme="teal"
        />
        <StatSummaryCard
          icon={AlertCircle}
          value="5"
          label="Active Alerts"
          subtext="3 require attention"
          colorTheme="amber"
        />
        <StatSummaryCard
          icon={Droplets}
          value="234"
          label="Hatchlings Tracked"
          subtext="↑ 18% survival rate"
          colorTheme="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Turtle Health Monitoring"
          icon={Activity}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        >
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600">Turtles Scanned Today</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900">23</span>
                <span className="text-xs text-green-600 font-medium">+8</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600">FP Cases Detected</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900">3</span>
                <span className="text-xs text-gray-500 font-medium">Stable</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600">Barnacle Infestations</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900">7</span>
                <span className="text-xs text-red-600 font-medium">-2</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600">Healthy Assessments</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900">13</span>
                <span className="text-xs text-green-600 font-medium">+5</span>
              </div>
            </div>
          </div>
          <Button className="mt-4 w-full">
            View Health Dashboard
          </Button>
        </DashboardCard>

        <DashboardCard
          title="Nest Monitoring & Predators"
          icon={Video}
          iconColor="text-teal-600"
          iconBg="bg-teal-100"
        >
          <div className="mb-4 bg-gray-900 rounded-xl overflow-hidden aspect-video relative">
            <HlsPlayer
              src="http://localhost:8000/streams/camera1/stream.m3u8"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1 animate-pulse">
              <span className="inline-block h-2 w-2 bg-white rounded-full"></span>
              <span>LIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600">Nests Detected</span>
              <span className="font-bold text-gray-900">43</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
              <span className="text-sm text-gray-600">Predator Alerts</span>
              <span className="font-bold text-gray-900 text-red-600">2</span>
            </div>
          </div>
          <Button variant="success" className="mt-4 w-full">
            View Live Feeds
          </Button>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Shoreline Risk Assessment"
          icon={MapPin}
          iconColor="text-orange-600"
          iconBg="bg-orange-100"
        >
          <div className="mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl h-48 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="h-16 w-16 text-cyan-600/30" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">High Risk Zones</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">4</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-xs text-red-600 font-medium">High Risk</p>
              <p className="text-lg font-bold text-red-700">4</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-center">
              <p className="text-xs text-amber-600 font-medium">Medium</p>
              <p className="text-lg font-bold text-amber-700">7</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-xs text-green-600 font-medium">Low Risk</p>
              <p className="text-lg font-bold text-green-700">32</p>
            </div>
          </div>
          <Button variant="warning" className="mt-4 w-full text-white">
            View Risk Map
          </Button>
        </DashboardCard>

        <DashboardCard
          title="Hatchery Monitoring"
          icon={Droplets}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
        >
          <div className="space-y-3 mb-4">
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500">Baby Turtles Tracked</p>
                <div className="flex items-end justify-between mt-1">
                  <h4 className="text-xl font-bold text-gray-900">234</h4>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500">Abnormal Behavior Alerts</p>
                <div className="flex items-end justify-between mt-1">
                  <h4 className="text-xl font-bold text-gray-900">1</h4>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Low</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Species Distribution</span>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Loggerhead</span>
                <span className="font-bold text-gray-900">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
          <Button variant="purple" className="mt-4 w-full">
            View Hatchery Data
          </Button>
        </DashboardCard>
      </div>
    </div>
  );
}
