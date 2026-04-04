import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  SignIn,
  SignUp,
  useAuth,
} from "@clerk/clerk-react";
import axios from "axios";
import { Bell, User as UserIcon } from "lucide-react";
import { useTheme } from "./shared/ThemeContext";
import { API_BASE_URL } from "./shared/config";
import Navigation from "./shared/components/layout/Navigation";
import HomePage from "./modules/dashboard/HomePage";
import TurtleHealthPage from "./modules/turtles/TurtleHealthPage";
import NestMonitoringPage from "./modules/nests/NestMonitoringPage";
import ShorelineRiskPage from "./modules/shoreline/pages/ShorelineRiskPage";
import HatcheryPage from "./modules/hatchery/HatcheryPage";
import ReportsPage from "./modules/reports/ReportsPage";
import ProfilePage from "./modules/users/ProfilePage";
import NotificationsPage from "./modules/notifications/NotificationsPage";

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

const DashboardLayout = ({ initialTab = "home" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [targetRecordId, setTargetRecordId] = useState(
    new URLSearchParams(window.location.search).get("recordId") || null,
  );

  const handleTabChange = (tab, recordId = null) => {
    setActiveTab(tab);
    setTargetRecordId(recordId || null);
  };
  const { getToken } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const syncProfileTheme = async () => {
      try {
        const token = await getToken();
        if (token) {
          const response = await axios.get(
            `${API_BASE_URL}/api/profile/me/settings`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
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
      case "home":
        return <HomePage onTabChange={handleTabChange} />;
      case "health":
        return <TurtleHealthPage initialRecordId={targetRecordId} />;
      case "nests":
        return <NestMonitoringPage />;
      case "shoreline":
        return <ShorelineRiskPage />;
      case "hatchery":
        return <HatcheryPage />;
      case "reports":
        return <ReportsPage />;
      case "profile":
        return <ProfilePage />;
      case "notifications":
        return <NotificationsPage onTabChange={handleTabChange} />;
      default:
        return <HomePage onTabChange={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-500 selection:bg-cyan-500/30">
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        {renderPage()}
      </main>
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
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/dashboard"
              />
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/dashboard"
              />
            </div>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout initialTab="home" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout initialTab="notifications" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
