import { useState } from 'react';
import { Bell, User } from 'lucide-react';
import Navigation from './shared/components/layout/Navigation';
import AlertsPanel from './shared/components/layout/AlertsPanel';
import HomePage from './modules/dashboard/HomePage';
import TurtleHealthPage from './modules/turtles/TurtleHealthPage';
import NestMonitoringPage from './modules/nests/NestMonitoringPage';
import ShorelineRiskPage from './modules/shoreline/ShorelineRiskPage';
import HatcheryPage from './modules/hatchery/HatcheryPage';
import ReportsPage from './modules/reports/ReportsPage';
import ProfilePage from './modules/users/ProfilePage';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [alertsOpen, setAlertsOpen] = useState(false);

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'health':
        return <TurtleHealthPage />;
      case 'nests':
        return <NestMonitoringPage />;
      case 'shoreline':
        return <ShorelineRiskPage />;
      case 'hatchery':
        return <HatcheryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>

      <button
        onClick={() => {
          setActiveTab('profile');
        }}
        className="fixed bottom-24 right-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white p-4 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 z-40 hidden lg:flex items-center space-x-2"
      >
        <User className="h-6 w-6" />
      </button>

      <button
        onClick={() => setAlertsOpen(!alertsOpen)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-4 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 z-40"
      >
        <Bell className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
          5
        </span>
      </button>

      <AlertsPanel isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />

      {alertsOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setAlertsOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default App;
