// import React, { useState, useEffect, useRef } from 'react';
// import { AlertTriangle, MapPin, Clock, X, Volume2 } from 'lucide-react';

// const SIREN_URL = 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'; // Professional alert sound

// export default function GlobalAlertSystem() {
//     const [activeAlert, setActiveAlert] = useState(null);
//     const [isConnected, setIsConnected] = useState(false);
//     const audioRef = useRef(null);
//     const lastProcessedId = useRef(null);

//     useEffect(() => {
//         const checkAlerts = async () => {
//             try {
//                 const response = await fetch('http://localhost:5002/api/detections');
//                 const result = await response.json();

//                 if (result.success) {
//                     setIsConnected(true);
//                     // Look for any 'danger' status in the last 50 detections
//                     const dangerAlert = result.data.find(d => d.nestStatus === 'danger');

//                     if (dangerAlert && dangerAlert._id !== lastProcessedId.current) {
//                         setActiveAlert(dangerAlert);
//                         lastProcessedId.current = dangerAlert._id;

//                         if (audioRef.current) {
//                             audioRef.current.play().catch(e => console.log('Audio play failed:', e));
//                         }
//                     }
//                 }
//             } catch (error) {
//                 setIsConnected(false);
//                 console.error('Failed to poll alerts:', error);
//             }
//         };

//         const interval = setInterval(checkAlerts, 3000); // Poll every 3 seconds
//         return () => clearInterval(interval);
//     }, []);

//     const triggerTestAlert = () => {
//         const testAlert = {
//             _id: 'test-' + Date.now(),
//             nestNo: 'N999',
//             location: { zone: 'TEST ZONE', coordinates: { x: 50, y: 50 } },
//             timestamp: new Date().toISOString(),
//             details: 'TEST ALERT: Predator mimic detected for simulation purposes.'
//         };
//         setActiveAlert(testAlert);
//         if (audioRef.current) {
//             audioRef.current.play().catch(e => console.log('Audio play failed:', e));
//         }
//     };

//     const closeAlert = () => {
//         setActiveAlert(null);
//         if (audioRef.current) {
//             audioRef.current.pause();
//             audioRef.current.currentTime = 0;
//         }
//     };

//     if (!activeAlert) return null;

//     return (
//         <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-4">
//             <audio ref={audioRef} src={SIREN_URL} loop />

//             <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] border-4 border-red-500 overflow-hidden pointer-events-auto animate-bounce-subtle">
//                 <div className="bg-red-500 p-6 flex items-center justify-between">
//                     <div className="flex items-center space-x-3 text-white">
//                         <div className="bg-white/20 p-2 rounded-full animate-pulse">
//                             <AlertTriangle className="h-8 w-8 text-white" />
//                         </div>
//                         <div>
//                             <h2 className="text-2xl font-black uppercase tracking-tighter">Emergency Alert</h2>
//                             <p className="text-red-100 text-sm font-bold">Immediate Action Required</p>
//                         </div>
//                     </div>
//                     <button
//                         onClick={closeAlert}
//                         className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
//                     >
//                         <X className="h-6 w-6" />
//                     </button>
//                 </div>

//                 <div className="p-8 space-y-6">
//                     <div className="flex items-center justify-center">
//                         <div className="text-center">
//                             <span className="text-gray-500 text-xs font-bold uppercase tracking-widest block mb-1">Affected Nest</span>
//                             <div className="text-5xl font-black text-gray-900">#{activeAlert.nestNo || 'N/A'}</div>
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-4">
//                         <div className="bg-gray-50 p-4 rounded-2xl flex items-center space-x-3 border border-gray-100">
//                             <MapPin className="h-5 w-5 text-red-500" />
//                             <div>
//                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</p>
//                                 <p className="text-sm font-bold text-gray-800">{activeAlert.location.zone}</p>
//                             </div>
//                         </div>
//                         <div className="bg-gray-50 p-4 rounded-2xl flex items-center space-x-3 border border-gray-100">
//                             <Clock className="h-5 w-5 text-red-500" />
//                             <div>
//                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time Detected</p>
//                                 <p className="text-sm font-bold text-gray-800">{new Date(activeAlert.timestamp).toLocaleTimeString()}</p>
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
//                         <p className="text-sm text-red-700 leading-relaxed font-medium text-center">
//                             <strong>THREAT IDENTIFIED:</strong> {activeAlert.details}
//                         </p>
//                     </div>

//                     <div className="flex space-x-3">
//                         <button
//                             onClick={closeAlert}
//                             className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 transition-all flex items-center justify-center space-x-2"
//                         >
//                             <span>Acknowledge Alert</span>
//                         </button>
//                     </div>
//                 </div>

//                 <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex items-center justify-center space-x-2">
//                     <Volume2 className="h-4 w-4 text-gray-400 animate-pulse" />
//                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Siren Sound Loop Active</p>
//                 </div>
//             </div>

//             <style jsx>{`
//         @keyframes bounce-subtle {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-10px); }
//         }
//         .animate-bounce-subtle {
//           animation: bounce-subtle 3s ease-in-out infinite;
//         }
//       `}</style>
//         </div>
//     );
// }
