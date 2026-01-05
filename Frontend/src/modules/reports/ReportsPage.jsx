import { FileText, Download, TrendingUp, Calendar, BarChart3, PieChart } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';

export default function ReportsPage() {
  const reports = [
    { id: 1, title: 'Monthly Conservation Summary', date: '2025-10-01', type: 'Summary', status: 'Available' },
    { id: 2, title: 'Turtle Health Analytics', date: '2025-10-10', type: 'Health', status: 'Available' },
    { id: 3, title: 'Nest Success Rate Report', date: '2025-10-05', type: 'Nesting', status: 'Available' },
    { id: 4, title: 'Environmental Risk Assessment', date: '2025-10-08', type: 'Risk', status: 'Available' },
    { id: 5, title: 'Hatchery Performance Report', date: '2025-10-12', type: 'Hatchery', status: 'Generating' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Generate and download conservation reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatSummaryCard
          icon={FileText}
          value="24"
          label="Total Reports"
          colorTheme="blue"
        />
        <StatSummaryCard
          icon={TrendingUp}
          value="18%"
          label="Success Rate Increase"
          colorTheme="green"
        />
        <StatSummaryCard
          icon={Calendar}
          value="Oct 2025"
          label="Current Period"
          colorTheme="purple"
        />
        <StatSummaryCard
          icon={Download}
          value="156"
          label="Downloads This Month"
          colorTheme="amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Quick Stats Overview"
          icon={BarChart3}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Turtle Health Rate</span>
                <span className="text-sm font-bold text-blue-700">87.3%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full" style={{ width: '87.3%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Nest Success Rate</span>
                <span className="text-sm font-bold text-green-700">92.1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full" style={{ width: '92.1%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Hatchling Survival</span>
                <span className="text-sm font-bold text-purple-700">98.5%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Predator Prevention</span>
                <span className="text-sm font-bold text-amber-700">95.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full" style={{ width: '95.8%' }}></div>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Monthly Trends"
          icon={TrendingUp}
          iconColor="text-teal-600"
          iconBg="bg-teal-100"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total Turtles Monitored</p>
              <p className="text-3xl font-bold text-gray-900">127</p>
              <p className="text-xs text-green-600 font-medium mt-1">↑ 12% from last month</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Nests Protected</p>
              <p className="text-3xl font-bold text-gray-900">43</p>
              <p className="text-xs text-green-600 font-medium mt-1">↑ 8 new this month</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Hatchlings Released</p>
              <p className="text-3xl font-bold text-gray-900">189</p>
              <p className="text-xs text-green-600 font-medium mt-1">↑ 23% success rate</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard
        title="Available Reports"
        icon={FileText}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100"
      >
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl p-4 hover:shadow-lg hover:border-cyan-200 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-3 rounded-xl">
                    <FileText className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{report.title}</h4>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="text-xs text-gray-600 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {report.date}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {report.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {report.status === 'Available' ? (
                    <>
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                        AVAILABLE
                      </span>
                      <Button className="p-2 h-auto" icon={Download} />
                    </>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold animate-pulse">
                      GENERATING
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex space-x-3">
          <Button icon={FileText} className="flex-1">
            Generate New Report
          </Button>
          <Button icon={Download} variant="success" className="flex-1">
            Download All Reports
          </Button>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
              <PieChart className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Export Options</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              PDF Format
            </button>
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Excel Spreadsheet
            </button>
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              CSV Data
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Time Periods</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Last 7 Days
            </button>
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Last 30 Days
            </button>
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Custom Range
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Report Types</h3>
          </div>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Health Analytics
            </button>
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Nest Statistics
            </button>
            <button className="w-full text-left px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all font-medium text-gray-700 text-sm">
              Risk Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
