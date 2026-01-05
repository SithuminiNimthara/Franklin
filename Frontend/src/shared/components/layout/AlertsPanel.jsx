import { AlertTriangle, Clock, MapPin, X } from 'lucide-react';

const alerts = [
  {
    id: '1',
    type: 'predator',
    message: 'Predator detected near nest #234',
    time: '5 min ago',
    location: 'Beach Zone A',
    status: 'pending',
  },
  {
    id: '2',
    type: 'nest',
    message: 'New nest confirmed',
    time: '15 min ago',
    location: 'Beach Zone C',
    status: 'verified',
  },
  {
    id: '3',
    type: 'disease',
    message: 'FP disease case detected',
    time: '1 hour ago',
    location: 'Rehabilitation Center',
    status: 'verified',
  },
  {
    id: '4',
    type: 'flood',
    message: 'Shoreline flood warning',
    time: '2 hours ago',
    location: 'Beach Zone B',
    status: 'pending',
  },
];

export default function AlertsPanel({ isOpen, onClose }) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
    >
      <div className="h-full flex flex-col">
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Alerts & Notifications</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle
                    className={`h-5 w-5 ${alert.status === 'pending'
                        ? 'text-amber-500'
                        : alert.status === 'verified'
                          ? 'text-blue-500'
                          : 'text-green-500'
                      }`}
                  />
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${alert.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : alert.status === 'verified'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                  >
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {alert.time}
                </span>
              </div>

              <p className="text-sm font-medium text-gray-800 mb-2">{alert.message}</p>

              <div className="flex items-center text-xs text-gray-600">
                <MapPin className="h-3 w-3 mr-1" />
                {alert.location}
              </div>

              <div className="mt-3 flex space-x-2">
                <button className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium py-2 rounded-lg transition-colors">
                  View Details
                </button>
                <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium py-2 rounded-lg transition-colors">
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
