import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, AlertTriangle, MapPin, Maximize2, Eye, Download, X, Volume2, VolumeX, ShieldAlert, BadgeCheck } from 'lucide-react';
import { io } from 'socket.io-client';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import BeachMap from '../../shared/components/maps/BeachMap';
import HlsPlayer from '../../shared/components/media/HlsPlayer';
import { Card, CardContent } from '../../shared/components/ui/Card';
import Button from '../../shared/components/ui/Button';
import SimulationUpload from './SimulationUpload';

const MOCK_NESTS = [
  { nestNo: 'N001', x: 25, y: 40, locationName: 'Zone A', createdAt: '2026-01-26 10:00:00', status: 'safe' },
  { nestNo: 'N002', x: 45, y: 55, locationName: 'Zone B', createdAt: '2026-01-26 11:30:00', status: 'safe' },
  { nestNo: 'N003', x: 48, y: 38, locationName: 'Zone C', createdAt: '2026-01-26 14:45:00', status: 'safe' },
  { nestNo: 'N004', x: 80, y: 60, locationName: 'Zone D', createdAt: '2026-01-26 16:20:00', status: 'safe' },
  { nestNo: 'N005', x: 15, y: 70, locationName: 'Zone E', createdAt: '2026-01-26 18:05:00', status: 'safe' },
];

const MOCK_USER = {
  name: 'Dr. Sarah Johnson',
  email: 'migaradenuwan99999999@gmail.com'
};

export default function NestMonitoringPage() {
  const [simulationData, setSimulationData] = useState(null);
  const [simulationEntities, setSimulationEntities] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showDangerModal, setShowDangerModal] = useState(null);
  const [isSirenMuted, setIsSirenMuted] = useState(false);

  // Threat Stay Time State (Dev default 6s, Prod 120s)
  const isDev = window.location.hostname === 'localhost';
  const [threatSeconds, setThreatSeconds] = useState(isDev ? 6 : 120);
  const [gracePeriod] = useState(2.0); // 2 seconds grace period to reset

  const videoRef = useRef(null);
  const sirenRef = useRef(null);
  const threatTrackerRef = useRef({}); // { nestNo: { predator: { start: t, last: t, alerted: bool }, human: ... } }
  const [nests, setNests] = useState(MOCK_NESTS);

  // Thresholds
  const RADIUS_THRESHOLD = 15; // Map coordinate distance units (approx 80px equivalent on 100x100 scale)

  // Socket.io for real-time alerts (optional if we handle local tracking)
  useEffect(() => {
    const socket = io('http://localhost:5002');
    socket.on('danger_alert', (data) => {
      console.log('Central Server Alert:', data);
      // We could sync here if backend triggers alerts too
    });
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
      .then(res => {
        if (res.success) {
          setDetectionHistory(res.data);
        }
      })
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

    // 1. Web UI Alert
    setActiveAlerts(prev => {
      if (prev.some(a => a.nestNo === alertData.nestNo && a.threatType === alertData.threatType)) return prev;
      return [alertData, ...prev];
    });
    setShowDangerModal(alertData);
    playSiren();

    // 2. Email Alert (Backend Call)
    try {
      await fetch('http://localhost:5002/api/alerts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: MOCK_USER.email,
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

    // Update nest status to danger
    setNests(prev => prev.map(n => n.nestNo === nest.nestNo ? { ...n, status: 'danger' } : n));
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !simulationData || !simulationData.data) return;

    const currentTime = videoRef.current.currentTime;
    const frame = simulationData.data.reduce((prev, curr) => (curr.time <= currentTime ? curr : prev), simulationData.data[0]);

    if (frame && frame.entities) {
      const currentThreatTracker = { ...threatTrackerRef.current };
      const presentThreats = frame.entities.filter(e => e.type === 'predator' || e.type === 'human');

      // Update/Increment timers for present threats
      presentThreats.forEach(threat => {
        // Find nearest nest
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

      // Cleanup threats that left
      Object.keys(currentThreatTracker).forEach(nestNo => {
        Object.keys(currentThreatTracker[nestNo]).forEach(type => {
          // Reset if threat not seen near this nest for > gracePeriod seconds
          if (currentTime - currentThreatTracker[nestNo][type].last > gracePeriod) {
            // If they were in danger, set back to safe if NO OTHER threat is present for this nest
            if (currentThreatTracker[nestNo][type].alerted) {
              const otherThreatsAlerted = Object.keys(currentThreatTracker[nestNo]).some(t => t !== type && currentThreatTracker[nestNo][t].alerted);
              if (!otherThreatsAlerted) {
                setNests(prev => prev.map(n => n.nestNo === nestNo ? { ...n, status: 'safe' } : n));
                // If this was the active modal, dismiss? Or let user dismiss.
                // User said: "If threat ends, change status back to SAFE and stop siren."
                if (showDangerModal && showDangerModal.nestNo === nestNo && showDangerModal.threatType === type) {
                  stopSiren();
                }
              }
            }
            delete currentThreatTracker[nestNo][type];
          }
        });
      });

      threatTrackerRef.current = currentThreatTracker;

      // Update Map view
      const mappedCurrent = frame.entities.map((e, idx) => ({
        id: `sim-${idx}-${e.type}`,
        type: e.type,
        x: e.map_x,
        y: e.map_y,
        label: `${e.type.toUpperCase()} ${(e.score * 100).toFixed(0)}%`,
        status: 'safe'
      }));

      // Only show mock nests as nests, plus other non-nest detections
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

  const handleSimulationComplete = (data) => {
    setSimulationData(data);
    // Restart trackers
    threatTrackerRef.current = {};
    setNests(MOCK_NESTS);
  };

  const handleClearSimulation = () => {
    setSimulationData(null);
    setSimulationEntities(null);
    threatTrackerRef.current = {};
    setNests(MOCK_NESTS);
    setActiveAlerts([]);
    stopSiren();
  };

  return (
    <div className="space-y-6">
      {/* Audio Siren */}
      <audio
        ref={sirenRef}
        src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
        loop
      />

      {/* Danger Alert Modal */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-[0_0_50px_rgba(239,68,68,0.5)] border-4 border-red-500 animate-pulse-border overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-shimmer"></div>

            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-5 rounded-full mb-6 relative">
                <ShieldAlert className="h-14 w-14 text-red-600 animate-bounce" />
                <div className="absolute -top-1 -right-1 bg-red-600 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
              </div>

              <h2 className="text-4xl font-black text-red-600 mb-2 uppercase tracking-tighter leading-none">
                🚨 NEST IN DANGER 🚨
              </h2>
              <p className="text-gray-500 font-medium mb-8">IMMEDIATE ATTENTION REQUIRED</p>

              <div className="bg-gray-50 rounded-3xl p-6 w-full text-left space-y-4 border border-gray-200 mb-8 shadow-inner">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Nest Identifier</span>
                  <span className="text-gray-900 font-black text-xl">#{showDangerModal.nestNo}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Threat Category</span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold text-sm uppercase tracking-tighter">
                    {showDangerModal.threatType} detected
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Zone / Location</span>
                  <span className="text-gray-900 font-bold">{showDangerModal.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Stay Duration</span>
                  <span className="text-amber-600 font-black">{threatSeconds}+ Seconds</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Button
                  className="flex-1 py-5 text-lg font-black bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center justify-center space-x-2"
                  onClick={() => window.location.href = `mailto:support@franklin.com?subject=Emergency Response Nest ${showDangerModal.nestNo}`}
                >
                  <ShieldAlert className="h-5 w-5" />
                  <span>DISPATCH HELP</span>
                </Button>
                <Button
                  className="flex-1 py-5 text-lg font-black bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all active:scale-95 flex items-center justify-center space-x-2"
                  onClick={stopSiren}
                >
                  {isSirenMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  <span>MUTE & CLOSE</span>
                </Button>
              </div>

              <p className="mt-6 text-[10px] text-gray-400 font-medium italic">
                Email notification automatically sent to conservation leads at {showDangerModal.time}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Nest Monitoring</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <BadgeCheck className="h-4 w-4 text-teal-500 mr-2" />
            Active Real-time Threat Analysis System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            <span className="text-[10px] font-black text-gray-400 px-3 uppercase tracking-widest">Alert Delay:</span>
            <select
              value={threatSeconds}
              onChange={(e) => setThreatSeconds(parseInt(e.target.value))}
              className="bg-gray-50 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg border-none focus:ring-0 cursor-pointer"
            >
              <option value={6}>DEV (6s)</option>
              <option value={10}>QUICK (10s)</option>
              <option value={120}>PROD (120s)</option>
            </select>
          </div>

          <button
            onClick={() => setIsSirenMuted(!isSirenMuted)}
            className={`p-3 rounded-xl border transition-all ${isSirenMuted ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
          >
            {isSirenMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl font-bold text-sm border border-teal-100 flex items-center shadow-sm">
            <span className="inline-block h-2 w-2 bg-teal-500 rounded-full mr-3 animate-pulse"></span>
            SYSTEM SECURE
          </div>
        </div>
      </div>

      {/* Simulation Upload Section */}
      <SimulationUpload
        onSimulationComplete={handleSimulationComplete}
        onClear={handleClearSimulation}
      />

      {/* Main Map Content */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white">
          <CardContent className="p-0">
            <div className="flex flex-col xl:flex-row">
              {/* Map Column */}
              <div className="flex-1 min-h-[600px] relative">
                <BeachMap simulationEntities={simulationEntities} />

                {/* Overlay Profile Info */}
                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur shadow-2xl rounded-2xl p-4 border border-white/50 z-10 max-w-[200px]">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Logged in as</p>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      SJ
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-900 leading-tight">{MOCK_USER.name}</p>
                      <p className="text-[9px] text-gray-500 truncate">{MOCK_USER.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video & Stats Column */}
              {simulationData && (
                <div className="xl:w-[450px] bg-gray-50 p-6 space-y-4 border-l border-gray-100 flex flex-col h-auto">
                  <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-video relative group">
                    <video
                      ref={videoRef}
                      src={simulationData.video_url}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                      onTimeUpdate={handleTimeUpdate}
                    />
                    <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">LIVE ANALYTICS</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex-1 space-y-6">
                    <div>
                      <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-4 flex items-center">
                        <BadgeCheck className="h-4 w-4 mr-2 text-teal-500" />
                        Incident Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-50">
                          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-tighter">Monitored Nests</p>
                          <p className="text-3xl font-black text-teal-700 font-serif">05</p>
                        </div>
                        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-50">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Danger Status</p>
                          <p className="text-3xl font-black text-amber-700 font-serif">
                            {nests.filter(n => n.status === 'danger').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Mock Nests</p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {nests.map(nest => (
                          <div key={nest.nestNo} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${nest.status === 'danger' ? 'bg-red-50 border-red-200' : 'bg-gray-50/50 border-transparent'}`}>
                            <div className="flex items-center space-x-3">
                              <div className={`h-2 w-2 rounded-full ${nest.status === 'danger' ? 'bg-red-500 animate-pulse' : 'bg-teal-500'}`}></div>
                              <span className="text-xs font-bold text-gray-700">Nest #{nest.nestNo}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">{nest.locationName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History & Alerts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Detection History */}
        <div className="xl:col-span-8">
          <DashboardCard title="Detection History Logs" icon={Video} iconColor="text-cyan-600" iconBg="bg-cyan-100">
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {detectionHistory.length > 0 ? (
                detectionHistory.map((item) => (
                  <div
                    key={item._id}
                    className={`rounded-2xl p-4 border transition-all hover:shadow-lg flex items-center justify-between ${item.type === 'predator' ? 'bg-red-50 border-red-100 shadow-red-50' :
                      item.type === 'turtle' ? 'bg-emerald-50 border-emerald-100 shadow-emerald-50' :
                        item.type === 'human' ? 'bg-blue-50 border-blue-100 shadow-blue-50' :
                          'bg-gray-50 border-gray-100'
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${item.type === 'predator' ? 'bg-red-500' :
                        item.type === 'turtle' ? 'bg-emerald-500' :
                          'bg-blue-500'
                        }`}>
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 uppercase text-sm tracking-tight">{item.type} Identified</p>
                        <p className="text-xs text-gray-500 font-medium">{item.location?.zone} • Confidence: {(item.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(item.timestamp).toLocaleTimeString()}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <Video className="h-12 w-12 mx-auto mb-4 text-gray-200" />
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Awaiting Analysis Data</p>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Active Threats */}
        <div className="xl:col-span-4">
          <DashboardCard title="Active Danger Zones" icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-100">
            <div className="space-y-4">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert, idx) => (
                  <div key={idx} className="bg-red-600 rounded-[2rem] p-6 text-white shadow-2xl shadow-red-200 relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 bg-white/10 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-4">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Critical Alert</span>
                        <span className="text-[10px] font-bold opacity-80">{alert.time}</span>
                      </div>

                      <h3 className="text-2xl font-black mb-1">NEST #{alert.nestNo}</h3>
                      <p className="text-sm font-bold opacity-90 uppercase mb-4">{alert.threatType} NEAR SITE</p>

                      <div className="flex items-center space-x-2 text-xs font-bold pt-4 border-t border-white/20">
                        <MapPin className="h-3 w-3" />
                        <span>{alert.location}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-emerald-50 rounded-[2rem] border-2 border-dashed border-emerald-100">
                  <div className="bg-emerald-500 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200">
                    <BadgeCheck className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-emerald-700 font-black uppercase text-xs tracking-widest">No Threats Detected</p>
                  <p className="text-emerald-600/60 text-[10px] font-bold mt-2 px-6">System scanning all zones for predator activity...</p>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
}
