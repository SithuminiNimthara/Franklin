import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, AlertTriangle, MapPin, ShieldAlert, BadgeCheck, Volume2, VolumeX, Eye } from 'lucide-react';
import { io } from 'socket.io-client';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import BeachMap from '../../shared/components/maps/BeachMap';
import HlsPlayer from '../../shared/components/media/HlsPlayer';
import { Card, CardContent } from '../../shared/components/ui/Card';
import Button from '../../shared/components/ui/Button';
import SimulationUpload from './SimulationUpload';
import { useUser } from '@clerk/clerk-react';

const MOCK_NESTS = [
  { nestNo: 'N001', x: 25, y: 40, locationName: 'Zone A', createdAt: '2026-01-26 10:00:00', status: 'safe' },
  { nestNo: 'N002', x: 45, y: 55, locationName: 'Zone B', createdAt: '2026-01-26 11:30:00', status: 'safe' },
  { nestNo: 'N003', x: 48, y: 38, locationName: 'Zone C', createdAt: '2026-01-26 14:45:00', status: 'safe' },
  { nestNo: 'N004', x: 80, y: 60, locationName: 'Zone D', createdAt: '2026-01-26 16:20:00', status: 'safe' },
  { nestNo: 'N005', x: 15, y: 70, locationName: 'Zone E', createdAt: '2026-01-26 18:05:00', status: 'safe' },
];

export default function NestMonitoringPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [simulationData, setSimulationData] = useState(null);
  const [simulationEntities, setSimulationEntities] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showDangerModal, setShowDangerModal] = useState(null);
  const [isSirenMuted, setIsSirenMuted] = useState(false);

  const userData = userLoaded && user ? {
    name: user.fullName || 'User',
    email: user.primaryEmailAddress?.emailAddress || 'pending@example.com'
  } : {
    name: 'Loading...',
    email: 'loading@example.com'
  };

  const isDev = window.location.hostname === 'localhost';
  const [threatSeconds, setThreatSeconds] = useState(isDev ? 6 : 120);
  const [gracePeriod] = useState(2.0);

  const videoRef = useRef(null);
  const sirenRef = useRef(null);
  const threatTrackerRef = useRef({});
  const [nests, setNests] = useState(MOCK_NESTS);
  const RADIUS_THRESHOLD = 15;

  useEffect(() => {
    const socket = io('http://localhost:5002');
    socket.on('danger_alert', (data) => console.log('Central Server Alert:', data));
    return () => socket.disconnect();
  }, []);

  const playSiren = useCallback(() => {
    if (sirenRef.current && !isSirenMuted) {
      sirenRef.current.currentTime = 0;
      sirenRef.current.play().catch(e => console.error("Siren failed to play", e));
    }
  }, [isSirenMuted]);

  const stopSiren = useCallback(() => {
    if (sirenRef.current) {
      sirenRef.current.pause();
      sirenRef.current.currentTime = 0;
    }
    setShowDangerModal(null);
  }, []);

  const fetchHistory = () => {
    fetch('http://localhost:5002/api/detections')
      .then(res => res.json())
      .then(res => { if (res.success) setDetectionHistory(res.data); })
      .catch(err => console.error("Failed to load history", err));
  };

  useEffect(() => {
    fetchHistory();
  }, [simulationData]);

  const triggerAlerts = async (nest, threatType, startTime, confidence) => {
    const timestamp = new Date();
    const alertData = {
      nestNo: nest.nestNo,
      location: nest.locationName,
      time: timestamp.toLocaleTimeString('en-LK'),
      threatType,
      details: `A ${threatType} has stayed near Nest ${nest.nestNo} for over ${threatSeconds} seconds.`,
      durationSec: threatSeconds,
      confidence
    };

    setActiveAlerts(prev => {
      if (prev.some(a => a.nestNo === alertData.nestNo && a.threatType === alertData.threatType)) return prev;
      return [alertData, ...prev];
    });
    setShowDangerModal(alertData);
    playSiren();

    try {
      await fetch('http://localhost:5002/api/alerts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: userData.email,
          nestNo: nest.nestNo,
          zone: nest.locationName,
          threatType,
          timestamp: timestamp.toISOString(),
          durationSec: threatSeconds,
          details: alertData.details,
          confidence
        })
      });
    } catch (e) {
      console.error("Failed to send email alert", e);
    }

    setNests(prev => prev.map(n => n.nestNo === nest.nestNo ? { ...n, status: 'danger' } : n));
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !simulationData || !simulationData.data) return;
    const currentTime = videoRef.current.currentTime;
    const frame = simulationData.data.reduce((prev, curr) => (curr.time <= currentTime ? curr : prev), simulationData.data[0]);

    if (frame && frame.entities) {
      const currentThreatTracker = { ...threatTrackerRef.current };
      const presentThreats = frame.entities.filter(e => e.type === 'predator' || e.type === 'human');

      presentThreats.forEach(threat => {
        let nearestNest = null;
        let minDist = Infinity;
        nests.forEach(nest => {
          const dist = Math.sqrt(Math.pow(nest.x - threat.map_x, 2) + Math.pow(nest.y - threat.map_y, 2));
          if (dist < RADIUS_THRESHOLD && dist < minDist) {
            minDist = dist;
            nearestNest = nest;
          }
        });

        if (nearestNest) {
          if (!currentThreatTracker[nearestNest.nestNo]) currentThreatTracker[nearestNest.nestNo] = {};
          if (!currentThreatTracker[nearestNest.nestNo][threat.type]) {
            currentThreatTracker[nearestNest.nestNo][threat.type] = {
              start: currentTime,
              last: currentTime,
              alerted: false,
              confidence: threat.score
            };
          } else {
            currentThreatTracker[nearestNest.nestNo][threat.type].last = currentTime;
            currentThreatTracker[nearestNest.nestNo][threat.type].confidence = threat.score;
            const duration = currentTime - currentThreatTracker[nearestNest.nestNo][threat.type].start;
            if (duration >= threatSeconds && !currentThreatTracker[nearestNest.nestNo][threat.type].alerted) {
              currentThreatTracker[nearestNest.nestNo][threat.type].alerted = true;
              triggerAlerts(nearestNest, threat.type, currentThreatTracker[nearestNest.nestNo][threat.type].start, threat.score);
            }
          }
        }
      });

      Object.keys(currentThreatTracker).forEach(nestNo => {
        Object.keys(currentThreatTracker[nestNo]).forEach(type => {
          if (currentTime - currentThreatTracker[nestNo][type].last > gracePeriod) {
            if (currentThreatTracker[nestNo][type].alerted) {
              const otherThreatsAlerted = Object.keys(currentThreatTracker[nestNo]).some(t => t !== type && currentThreatTracker[nestNo][t].alerted);
              if (!otherThreatsAlerted) {
                setNests(prev => prev.map(n => n.nestNo === nestNo ? { ...n, status: 'safe' } : n));
                if (showDangerModal && showDangerModal.nestNo === nestNo && showDangerModal.threatType === type) stopSiren();
              }
            }
            delete currentThreatTracker[nestNo][type];
          }
        });
      });

      threatTrackerRef.current = currentThreatTracker;
      const mappedCurrent = frame.entities.map((e, idx) => ({
        id: `sim-${idx}-${e.type}`,
        type: e.type,
        x: e.map_x,
        y: e.map_y,
        label: `${e.type.toUpperCase()} ${(e.score * 100).toFixed(0)}%`,
        status: 'safe'
      }));

      const entitiesForMap = [
        ...nests.map(n => ({
          id: n.nestNo,
          type: 'nest',
          x: n.x,
          y: n.y,
          label: `Nest #${n.nestNo} (${n.locationName})`,
          status: n.status
        })),
        ...mappedCurrent.filter(e => e.type !== 'nest')
      ];
      setSimulationEntities(entitiesForMap);
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={sirenRef} src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" loop />

      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border-4 border-red-500 overflow-hidden relative">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                <ShieldAlert className="h-10 w-10 text-red-600 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-red-600 mb-2 uppercase tracking-tight">🚨 Nest in Danger 🚨</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-6 text-sm italic">Immediate Attention Required</p>

              <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 w-full text-left space-y-3 border border-gray-100 dark:border-slate-700 mb-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 text-sm">
                  <span className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px]">Nest ID</span>
                  <span className="text-gray-900 dark:text-white font-black">#{showDangerModal.nestNo}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 text-sm">
                  <span className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px]">Threat Type</span>
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full font-bold text-[10px] uppercase">
                    {showDangerModal.threatType}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px]">Location</span>
                  <span className="text-gray-900 dark:text-white font-bold">{showDangerModal.location}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button className="flex-1 py-3 text-sm font-bold bg-red-600 hover:bg-red-700 text-white" onClick={() => window.location.href = `mailto:support@franklin.com?subject=Emergency Response Nest ${showDangerModal.nestNo}`}>
                  Dispatch Help
                </Button>
                <Button variant="secondary" className="flex-1 py-3 text-sm font-bold" onClick={stopSiren}>
                  Mute & Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Nest Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center text-sm">
            <BadgeCheck className="h-4 w-4 text-teal-500 mr-2" />
            Active Real-time Threat Analysis System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-2 uppercase italic">Alert Delay:</span>
            <select
              value={threatSeconds}
              onChange={(e) => setThreatSeconds(parseInt(e.target.value))}
              className="bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer"
            >
              <option value={6}>DEV (6s)</option>
              <option value={10}>QUICK (10s)</option>
              <option value={120}>PROD (120s)</option>
            </select>
          </div>

          <button
            onClick={() => setIsSirenMuted(!isSirenMuted)}
            className={`p-2.5 rounded-xl border transition-all ${isSirenMuted ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-500' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            {isSirenMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <div className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-4 py-2 rounded-xl font-bold text-xs border border-teal-100 dark:border-teal-900/40 flex items-center shadow-sm">
            <span className="inline-block h-2 w-2 bg-teal-500 rounded-full mr-2 animate-pulse"></span>
            SYSTEM SECURE
          </div>
        </div>
      </div>

      <SimulationUpload
        onSimulationComplete={(data) => { setSimulationData(data); threatTrackerRef.current = {}; setNests(MOCK_NESTS); }}
        onClear={() => { setSimulationData(null); setSimulationEntities(null); threatTrackerRef.current = {}; setNests(MOCK_NESTS); setActiveAlerts([]); stopSiren(); }}
      />

      <div className="grid grid-cols-1 gap-6">
        <Card className="overflow-hidden border-none shadow-xl rounded-2xl bg-white dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="flex flex-col xl:flex-row">
              <div className="flex-1 min-h-[500px] relative">
                <BeachMap simulationEntities={simulationEntities} />
                <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-xl rounded-xl p-3 border border-white/20 dark:border-slate-800 z-10 max-w-[180px]">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Active Monitor</p>
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-[10px]">
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{userData.name}</p>
                      <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{userData.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {simulationData && (
                <div className="xl:w-[380px] bg-gray-50 dark:bg-slate-800/20 p-4 space-y-4 border-l border-gray-100 dark:border-slate-800 flex flex-col">
                  <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative">
                    <video ref={videoRef} src={simulationData.video_url} controls autoPlay className="w-full h-full object-cover" onTimeUpdate={handleTimeUpdate} />
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex-1 space-y-4">
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase text-[10px] tracking-wider flex items-center">
                      <BadgeCheck className="h-3 w-3 mr-2 text-teal-500" />
                      Live Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-teal-50/50 dark:bg-teal-900/10 p-3 rounded-xl border border-teal-50 dark:border-teal-900/20">
                        <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase">Monitored</p>
                        <p className="text-xl font-bold dark:text-white">05</p>
                      </div>
                      <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-50 dark:border-amber-900/20">
                        <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">Alerts</p>
                        <p className="text-xl font-bold dark:text-white">{nests.filter(n => n.status === 'danger').length}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {nests.map(nest => (
                        <div key={nest.nestNo} className={`flex items-center justify-between p-2 rounded-xl border text-[10px] ${nest.status === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40' : 'bg-gray-50/50 dark:bg-slate-800/40 border-transparent dark:text-gray-300'}`}>
                          <div className="flex items-center space-x-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${nest.status === 'danger' ? 'bg-red-500 animate-pulse' : 'bg-teal-500'}`}></div>
                            <span className="font-bold">Nest #{nest.nestNo}</span>
                          </div>
                          <span>{nest.locationName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          <DashboardCard title="Detection History" icon={Video} iconColor="text-cyan-600" iconBg="bg-cyan-100 dark:bg-cyan-900/30">
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {detectionHistory.length > 0 ? detectionHistory.map((item) => (
                <div key={item._id} className={`rounded-xl p-3 border flex items-center justify-between ${item.type === 'predator' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : item.type === 'turtle' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'}`}>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className={`p-2 rounded-lg ${item.type === 'predator' ? 'bg-red-500' : item.type === 'turtle' ? 'bg-emerald-500' : 'bg-blue-500'} text-white`}><Eye className="h-4 w-4" /></div>
                    <div>
                      <p className="font-bold dark:text-white uppercase text-xs">{item.type} Seen</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.location?.zone} • Confidence: {(item.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-400 dark:text-gray-500">
                    <p className="font-bold">{new Date(item.timestamp).toLocaleTimeString()}</p>
                    <p>{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800">
                  <p className="text-gray-400 dark:text-gray-600 text-[10px] font-bold uppercase">Awaiting Data</p>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="xl:col-span-4">
          <DashboardCard title="Active Threats" icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-100 dark:bg-red-900/30">
            <div className="space-y-3">
              {activeAlerts.length > 0 ? activeAlerts.map((alert, idx) => (
                <div key={idx} className="bg-red-600 dark:bg-red-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                  <h3 className="text-lg font-black mb-1">NEST #{alert.nestNo}</h3>
                  <p className="text-xs font-bold opacity-90 uppercase mb-2">{alert.threatType} Threat</p>
                  <p className="text-[10px] opacity-75">{alert.location} • {alert.time}</p>
                </div>
              )) : (
                <div className="text-center py-10 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/20">
                  <BadgeCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px]">No Threats</p>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
