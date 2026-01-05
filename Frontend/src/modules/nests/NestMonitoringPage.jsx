import React, { useState, useRef } from 'react';
import { Video, AlertTriangle, MapPin, Maximize2, Eye } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import BeachMap from '../../shared/components/maps/BeachMap';
import HlsPlayer from '../../shared/components/media/HlsPlayer';
import { Card, CardContent } from '../../shared/components/ui/Card';
import Button from '../../shared/components/ui/Button';
import SimulationUpload from './SimulationUpload';

export default function NestMonitoringPage() {
  const [simulationData, setSimulationData] = useState(null);
  const [simulationEntities, setSimulationEntities] = useState(null);
  const videoRef = useRef(null);

  const videoFeeds = [
    { id: 1, zone: 'Beach Zone A', status: 'active', alerts: 1, nests: 12 },
    { id: 1, zone: 'Beach Zone B', status: 'active', alerts: 0, nests: 15 },
    { id: 1, zone: 'Beach Zone C', status: 'active', alerts: 2, nests: 8 },
    { id: 1, zone: 'Beach Zone D', status: 'active', alerts: 0, nests: 7 },
  ];

  const handleSimulationComplete = (data) => {
    setSimulationData(data);
  };

  const handleClearSimulation = () => {
    setSimulationData(null);
    setSimulationEntities(null);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && simulationData && simulationData.data) {
      const time = videoRef.current.currentTime;
      // Find closest frame (assuming data is sorted by time)
      const frame = simulationData.data.reduce((prev, curr) => {
        return (curr.time <= time) ? curr : prev;
      }, simulationData.data[0]);

      if (frame && frame.entities) {
        const mapped = frame.entities.map((e, idx) => ({
          id: `sim-${idx}-${e.type}`,
          type: e.type,
          x: e.map_x,
          y: e.map_y,
          label: `${e.type.toUpperCase()} ${(e.score * 100).toFixed(0)}%`,
          status: 'safe' // Default status
        }));
        setSimulationEntities(mapped);
      } else {
        setSimulationEntities([]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nest Monitoring & Detection</h1>
          <p className="text-gray-600 mt-1">Real-time video surveillance and predator detection</p>
        </div>
        {!simulationData && (
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium text-sm">
              <span className="inline-block h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              All Cameras Online
            </div>
          </div>
        )}
      </div>

      {/* Simulation Upload Section */}
      <SimulationUpload
        onSimulationComplete={handleSimulationComplete}
        onClear={handleClearSimulation}
      />

      {/* Beach Map with Simulation Props */}
      <div className="mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-teal-100 to-cyan-100 p-3 rounded-xl">
                  <MapPin className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {simulationData ? "Simulation Map View" : "Interactive Beach Map"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {simulationData
                      ? "Visualizing detected entities from uploaded video"
                      : "Real-time tracking of nests, patrols, and threats"}
                  </p>
                </div>
              </div>
              <Button icon={Maximize2} className="px-4 py-2 text-sm">
                Fullscreen
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className={`transition-all duration-300 ${simulationData ? 'md:w-1/2' : 'w-full'}`}>
                <BeachMap simulationEntities={simulationEntities} />
              </div>

              {simulationData && (
                <div className="md:w-1/2 flex flex-col space-y-2 animate-fadeIn">
                  <div className="bg-black rounded-xl overflow-hidden shadow-lg border-2 border-teal-500 relative">
                    <video
                      ref={videoRef}
                      src={simulationData.video_url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                      onTimeUpdate={handleTimeUpdate}
                    />
                    <div className="absolute top-3 left-3 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1">
                      <Video className="h-3 w-3" />
                      <span>SIMULATION PLAYBACK</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-2">Simulation Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <p className="font-medium">Current Entities:</p>
                        <p className="text-lg font-bold text-teal-600">{simulationEntities ? simulationEntities.length : 0}</p>
                      </div>
                      <div>
                        <p className="font-medium">Detected Types:</p>
                        <div className="flex space-x-1 mt-1">
                          {Array.from(new Set(simulationEntities?.map(e => e.type) || [])).map(t => (
                            <span key={t} className="px-2 py-0.5 bg-gray-100 rounded-full">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Video Feeds (Hidden or pushed down during simulation?) -> Keeping them but maybe labelled differently */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Video className="h-6 w-6 text-teal-600" />
              <span>Live Camera Feeds</span>
            </h2>
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600 font-medium">{videoFeeds.length} Cameras Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoFeeds.map((feed) => (
              <Card
                key={feed.id}
                className="hover:border-teal-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100"
              >
                <div className="relative aspect-video group cursor-pointer overflow-hidden bg-black">
                  <HlsPlayer
                    src={`http://localhost:8000/streams/camera${feed.id}/stream.m3u8`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1 animate-pulse">
                    <span className="inline-block h-2 w-2 bg-white rounded-full"></span>
                    <span>LIVE</span>
                  </div>
                  {feed.alerts > 0 && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{feed.alerts} Alert</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-semibold text-sm">{feed.zone}</span>
                      </div>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                        {feed.nests} nests
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 text-center border border-teal-100 shadow-sm">
                      <p className="text-xs text-teal-600 font-medium">Nests</p>
                      <p className="text-lg font-bold text-teal-700">{feed.nests}</p>
                    </div>
                    <div
                      className={`${feed.alerts > 0
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100'
                        : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                        } rounded-xl p-3 text-center border shadow-sm`}
                    >
                      <p
                        className={`text-xs ${feed.alerts > 0 ? 'text-amber-600' : 'text-green-600'
                          } font-medium`}
                      >
                        Alerts
                      </p>
                      <p
                        className={`text-lg font-bold ${feed.alerts > 0 ? 'text-amber-700' : 'text-green-700'
                          }`}
                      >
                        {feed.alerts}
                      </p>
                    </div>
                  </div>
                  <Button icon={Maximize2} className="mt-3 w-full text-sm py-2.5 space-x-2">
                    View Full Screen
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <DashboardCard title="Detection History" icon={Video} iconColor="text-cyan-600" iconBg="bg-cyan-100">
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border-l-4 border-teal-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">New nest detected</p>
                      <p className="text-sm text-gray-600 mt-1">Beach Zone C - Camera 3</p>
                      <p className="text-xs text-gray-500 mt-1">15 minutes ago</p>
                    </div>
                    <span className="bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1 rounded-full">
                      CONFIRMED
                    </span>
                  </div>
                </div>
                {/* Other history items omitted for brevity but keeping styling consistent */}
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DashboardCard title="Active Alerts" icon={AlertTriangle} iconColor="text-amber-600" iconBg="bg-amber-100">
            <div className="space-y-3">
              {/* Static alerts for demo */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-900">Predator detected</p>
                <p className="text-xs text-gray-600">Near Nest #234</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Today's Summary" icon={Video} iconColor="text-teal-600" iconBg="bg-teal-100">
            {/* Summary stats */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total Nests Monitored</p>
              <p className="text-3xl font-bold text-teal-700">43</p>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
