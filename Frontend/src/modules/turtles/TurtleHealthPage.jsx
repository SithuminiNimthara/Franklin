import { Upload, Activity, AlertCircle, CheckCircle, Image } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import Button from '../../shared/components/ui/Button';

export default function TurtleHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Turtle Health Diagnostics</h1>
        <p className="text-gray-600 mt-1">AI-powered disease detection and health monitoring</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardCard
            title="Upload Image for Diagnosis"
            icon={Upload}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          >
            <div className="border-4 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-gray-50 to-blue-50/30 group">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity"></div>
                <Image className="h-20 w-20 text-gray-400 group-hover:text-blue-500 transition-colors relative" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drop image here or click to upload
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports JPG, PNG, HEIC formats (Max 10MB)
              </p>
              <Button className="px-8 py-3 shadow-lg hover:shadow-2xl">
                Select Image
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-md font-semibold text-gray-800">Recent Diagnoses</h3>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2.5 rounded-xl shadow-md">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Turtle #T-127 - Healthy</p>
                      <p className="text-sm text-gray-600">Scanned 10 minutes ago</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    HEALTHY
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  <p className="font-medium">Assessment: No signs of disease detected</p>
                  <p className="text-xs text-gray-600 mt-1">Confidence: 98.5%</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-red-500 to-rose-500 p-2.5 rounded-xl shadow-md">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Turtle #T-089 - FP Detected</p>
                      <p className="text-sm text-gray-600">Scanned 1 hour ago</p>
                    </div>
                  </div>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                    FP POSITIVE
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  <p className="font-medium">Assessment: Fibropapillomatosis tumors detected</p>
                  <p className="text-xs text-gray-600 mt-1">Confidence: 94.2%</p>
                  <Button variant="danger" className="mt-3 px-4 py-2 text-sm">
                    View Treatment Plan
                  </Button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl shadow-md">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Turtle #T-065 - Barnacle Infestation</p>
                      <p className="text-sm text-gray-600">Scanned 3 hours ago</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                    BARNACLES
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  <p className="font-medium">Assessment: Heavy barnacle coverage detected</p>
                  <p className="text-xs text-gray-600 mt-1">Confidence: 96.8%</p>
                  <Button variant="warning" className="mt-3 px-4 py-2 text-sm">
                    Schedule Cleaning
                  </Button>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard
            title="Health Statistics"
            icon={Activity}
            iconColor="text-teal-600"
            iconBg="bg-teal-100"
          >
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Total Scans (24h)</p>
                <p className="text-3xl font-bold text-gray-900">23</p>
                <p className="text-xs text-green-600 font-medium mt-1">↑ 8 from yesterday</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Healthy Turtles</p>
                <p className="text-3xl font-bold text-green-700">13</p>
                <p className="text-xs text-gray-600 mt-1">56.5% of scans</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">FP Cases</p>
                <p className="text-3xl font-bold text-red-700">3</p>
                <p className="text-xs text-gray-600 mt-1">13% of scans</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">Barnacle Cases</p>
                <p className="text-3xl font-bold text-amber-700">7</p>
                <p className="text-xs text-gray-600 mt-1">30.4% of scans</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Treatment Guidelines"
            icon={AlertCircle}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          >
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">Fibropapillomatosis (FP)</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Isolate affected turtle</li>
                  <li>Schedule surgical removal</li>
                  <li>Monitor for recurrence</li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">Barnacle Infestation</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Gentle manual removal</li>
                  <li>Clean affected areas</li>
                  <li>Apply healing ointment</li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">Preventive Care</p>
                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                  <li>Regular health checkups</li>
                  <li>Water quality monitoring</li>
                  <li>Nutrition optimization</li>
                </ul>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
