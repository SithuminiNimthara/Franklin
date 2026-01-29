import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Calendar, Shield, Settings, Bell, Loader2 } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';
import { useTheme } from '../../shared/ThemeContext';

export default function ProfilePage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSavedProfile, setLastSavedProfile] = useState(null);

  const [profile, setProfile] = useState({
    displayName: '',
    phone: '',
    station: '',
    role: 'Member',
    notifications: {
      email: true,
      sms: false,
      push: true,
      weeklyReports: true
    },
    preferences: {
      language: 'English',
      timeZone: 'Pacific Time (PT)',
      dateFormat: 'MM/DD/YYYY',
      theme: 'Light'
    }
  });

  const [summary, setSummary] = useState({
    turtlesTagged: 0,
    reportsGenerated: 0,
    alertsResolved: 0
  });

  useEffect(() => {
    if (userLoaded && user) fetchData();
  }, [userLoaded, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, sRes, sumRes] = await Promise.all([
        axios.get('http://localhost:5002/api/profile/me', { headers }),
        axios.get('http://localhost:5002/api/profile/me/settings', { headers }),
        axios.get('http://localhost:5002/api/profile/me/summary', { headers })
      ]);
      const data = {
        ...pRes.data,
        notifications: sRes.data.notifications,
        preferences: sRes.data.preferences
      };
      setProfile(data);
      setLastSavedProfile(JSON.parse(JSON.stringify(data)));
      setSummary(sumRes.data);
      if (data.preferences?.theme) setGlobalTheme(data.preferences.theme);
    } catch (e) {
      console.error('[Profile] Sync Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (directData = null) => {
    setSaving(true);
    const data = directData || profile;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      await axios.put('http://localhost:5002/api/profile/me', data, { headers });
      const settingsRes = await axios.put('http://localhost:5002/api/profile/me/settings', {
        notifications: data.notifications,
        preferences: data.preferences
      }, { headers });

      const updated = { ...data, notifications: settingsRes.data.notifications, preferences: settingsRes.data.preferences };
      setProfile(updated);
      setLastSavedProfile(JSON.parse(JSON.stringify(updated)));
      if (updated.preferences?.theme) setGlobalTheme(updated.preferences.theme);
      setIsEditing(false);
      if (!directData) alert('Profile updated successfully!');
    } catch (e) {
      alert(`Save failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (lastSavedProfile) {
      const restored = JSON.parse(JSON.stringify(lastSavedProfile));
      setProfile(restored);
      setIsEditing(false);
      if (restored.preferences?.theme) setGlobalTheme(restored.preferences.theme);
    }
  };

  const handleToggle = (key) => {
    setProfile(prev => {
      const updated = { ...prev, notifications: { ...prev.notifications, [key]: !prev.notifications[key] } };
      handleSave(updated);
      return updated;
    });
  };

  const handlePreferenceToggle = () => {
    setProfile(prev => {
      const nextTheme = prev.preferences.theme === 'Dark' ? 'Light' : 'Dark';
      const updated = { ...prev, preferences: { ...prev.preferences, theme: nextTheme } };
      setGlobalTheme(nextTheme);
      handleSave(updated);
      return updated;
    });
  };

  if (!userLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-cyan-600 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">Synchronizing Profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-slate-800 text-center transition-all">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl border-4 border-cyan-50 dark:border-slate-800 bg-gradient-to-br from-cyan-500 to-blue-500 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-16 w-16 text-cyan-500" />
                  )}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 bg-green-500 w-8 h-8 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3 mt-4 text-left">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Display Name</label>
                  <div className="relative mt-1">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.displayName || ''}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Phone Number</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Station</label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.station || ''}
                      onChange={(e) => setProfile({ ...profile, station: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {profile.displayName || user.fullName || 'User'}
                </h2>
                <div className="inline-block mt-2 px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {profile.role || 'Member'}
                </div>
              </>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="truncate">{user.primaryEmailAddress.emailAddress}</span>
              </div>
              {!isEditing && (
                <>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{profile.phone || 'No phone set'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{profile.station || 'Global HQ'}</span>
                  </div>
                </>
              )}
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                className="w-full py-2.5 text-sm font-bold rounded-xl"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
              {isEditing && (
                <Button
                  variant="secondary"
                  className="w-full py-2.5 text-sm font-bold rounded-xl"
                  onClick={handleDiscard}
                  disabled={saving}
                >
                  Discard
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity, Notifications, Preferences */}
        <div className="xl:col-span-2 space-y-6">
          <DashboardCard
            title="Operational Impact"
            icon={Shield}
            iconColor="text-blue-600"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 transition-all">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Turtles Tagged</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{summary.turtlesTagged}</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 transition-all">
                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Reports</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{summary.reportsGenerated}</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 transition-all">
                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{summary.alertsResolved}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Settings & Notifications"
            icon={Settings}
            iconColor="text-amber-600"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { id: 'email', label: 'Email Notifications', desc: 'Secure status updates via email', icon: Mail },
                { id: 'sms', label: 'SMS Alerts', desc: 'Critical alert vectors via cellular', icon: Phone },
                { id: 'push', label: 'Browser Notifications', desc: 'Dynamic interface notifications', icon: Bell },
                { id: 'weeklyReports', label: 'Weekly Summary', desc: 'Analytical breakdowns', icon: Calendar },
                { id: 'theme', label: 'Dark Mode', desc: 'Toggle stealth mode interface', icon: Shield, isPreference: true },
              ].map((item) => {
                const isChecked = item.isPreference
                  ? profile.preferences.theme === 'Dark'
                  : profile.notifications[item.id];

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isChecked
                        ? 'bg-white dark:bg-slate-800 border-cyan-500 shadow-sm'
                        : 'bg-gray-50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl ${isChecked ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-400'}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-xs">{item.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isChecked}
                        onChange={() => item.isPreference ? handlePreferenceToggle() : handleToggle(item.id)}
                      />
                      <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col md:flex-row gap-3">
              <Button
                className="flex-1 py-3 text-sm font-bold rounded-xl"
                onClick={() => handleSave()}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Persist Settings
              </Button>
              <button
                className="flex-1 py-3 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-all underline underline-offset-4"
                onClick={handleDiscard}
                disabled={saving}
              >
                Revert to Backup
              </button>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
