import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Bell, User as UserIcon } from "lucide-react";
import { useTheme } from "./shared/ThemeContext";
import Navigation from "./shared/components/layout/Navigation";
import AlertsPanel from "./shared/components/layout/AlertsPanel";
import HomePage from "./modules/dashboard/HomePage";
import TurtleHealthPage from "./modules/turtles/TurtleHealthPage";
import NestMonitoringPage from "./modules/nests/NestMonitoringPage";
import ShorelineRiskPage from "./modules/shoreline/ShorelineRiskPage";
import HatcheryPage from "./modules/hatchery/HatcheryPage";
import ReportsPage from "./modules/reports/ReportsPage";
import ProfilePage from "./modules/users/ProfilePage";

const ProtectedRoute = ({ children }) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { getToken } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const syncProfileTheme = async () => {
      try {
        const token = await getToken();
        if (token) {
          const response = await axios.get("http://localhost:5002/api/profile/me/settings", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const profileTheme = response.data?.preferences?.theme;
          if (profileTheme && profileTheme !== theme) {
            setTheme(profileTheme);
          }
        }
      } catch (err) {
        console.error("Failed to sync profile theme:", err);
      }
    };
    syncProfileTheme();
  }, [getToken, setTheme, theme]);

  const renderPage = () => {
    switch (activeTab) {
      case "home": return <HomePage />;
      case "health": return <TurtleHealthPage />;
      case "nests": return <NestMonitoringPage />;
      case "shoreline": return <ShorelineRiskPage />;
      case "hatchery": return <HatcheryPage />;
      case "reports": return <ReportsPage />;
      case "profile": return <ProfilePage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-500 selection:bg-cyan-500/30">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        {renderPage()}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
        <button
          onClick={() => setActiveTab("profile")}
          className="bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 transition-all hover:scale-110 active:scale-95 group"
          title="Profile & Settings"
        >
          <UserIcon className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </button>

        <button
          onClick={() => setAlertsOpen(!alertsOpen)}
          className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-4 rounded-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 relative"
          title="Active Alerts"
        >
          <Bell className="h-6 w-6" />
          <span className="absolute -top-1.5 -right-1.5 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 text-[10px] font-black rounded-lg h-5 min-w-5 px-1 flex items-center justify-center border-2 border-red-500 shadow-md">
            5
          </span>
        </button>
      </div>

      <AlertsPanel isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/sign-in/*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
              <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
            </div>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
