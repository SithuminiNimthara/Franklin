import { User, Mail, Phone, MapPin, Calendar, Shield, Settings, Bell } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                <User className="h-16 w-16 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">Dr. Sarah Johnson</h2>
            <p className="text-gray-600 mt-1">Marine Conservation Lead</p>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>sarah.johnson@conservation.org</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Pacific Coast Research Station</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Joined March 2023</span>
              </div>
            </div>

            <Button className="mt-6 w-full">
              Edit Profile
            </Button>
          </div>

          <div className="mt-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-cyan-600" />
              <span>Account Status</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verification</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">VERIFIED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Access Level</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">ADMIN</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Two-Factor Auth</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">ENABLED</span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <DashboardCard
            title="Activity Summary"
            icon={User}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Turtles Assessed</p>
                <p className="text-3xl font-bold text-blue-700">127</p>
                <p className="text-xs text-gray-600 mt-1">This month</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Reports Generated</p>
                <p className="text-3xl font-bold text-green-700">24</p>
                <p className="text-xs text-gray-600 mt-1">This month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Alerts Resolved</p>
                <p className="text-3xl font-bold text-purple-700">18</p>
                <p className="text-xs text-gray-600 mt-1">This week</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Notification Settings"
            icon={Bell}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">SMS Alerts</p>
                  <p className="text-sm text-gray-600">Urgent notifications via text</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Browser notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Weekly Reports</p>
                  <p className="text-sm text-gray-600">Automated summary emails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500"></div>
                </label>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="System Preferences"
            icon={Settings}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option>Pacific Time (PT)</option>
                  <option>Eastern Time (ET)</option>
                  <option>Central Time (CT)</option>
                </select>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                  <option>Light Mode</option>
                  <option>Dark Mode</option>
                  <option>Auto</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <Button className="flex-1">
                Save Changes
              </Button>
              <Button variant="secondary" className="flex-1">
                Reset to Default
              </Button>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
