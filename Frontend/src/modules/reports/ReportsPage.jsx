import { FileText, Download, TrendingUp, Calendar, BarChart3, PieChart } from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';
import HatcheryReportItem from './hatchery/HatcheryReportItem';

export default function ReportsPage() {
  const reports = [
    { id: 1, title: 'Monthly Conservation Summary', date: '2026-01-01', type: 'Summary', status: 'Available' },
    { id: 2, title: 'Turtle Health Analytics', date: '2026-01-10', type: 'Health', status: 'Available' },
    { id: 3, title: 'Nest Success Rate Report', date: '2026-01-05', type: 'Nesting', status: 'Available' },
    { id: 4, title: 'Environmental Risk Assessment', date: '2026-01-08', type: 'Risk', status: 'Available' },
    { id: 5, title: 'Hatchery Performance Report', date: '2026-01-12', type: 'Hatchery', status: 'Available' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">Reports & Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm italic">Generate and download conservation intelligence reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatSummaryCard icon={FileText} value="24" label="Total Reports" colorTheme="blue" />
        <StatSummaryCard icon={TrendingUp} value="18%" label="Vitality Growth" colorTheme="green" />
        <StatSummaryCard icon={Calendar} value="Jan 2026" label="Analysis Period" colorTheme="purple" />
        <StatSummaryCard icon={Download} value="156" label="Downloads" colorTheme="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DashboardCard title="Performance Indices" icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-900/30">
          <div className="space-y-3">
            {[
              { label: 'Turtle Health Rate', val: '87.3%', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
              { label: 'Nest Success Rate', val: '92.1%', color: 'from-green-500 to-emerald-500', bg: 'bg-green-50 dark:bg-green-900/10' },
              { label: 'Hatchling Survival', val: '98.5%', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
              { label: 'Conflict Mitigation', val: '95.8%', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/10' }
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} rounded-xl p-3 border border-white/20 dark:border-slate-800`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-tighter">{stat.label}</span>
                  <span className="text-xs font-black text-gray-900 dark:text-white">{stat.val}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`bg-gradient-to-r ${stat.color} h-full rounded-full`} style={{ width: stat.val }}></div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Vitality Trends" icon={TrendingUp} iconColor="text-teal-600" iconBg="bg-teal-100 dark:bg-teal-900/30">
          <div className="space-y-3">
            {[
              { label: 'Monitored Population', val: '127', sub: '↑ 12% Monthly', color: 'from-teal-50 to-cyan-50 dark:from-teal-900/10 dark:to-cyan-900/10' },
              { label: 'Protected Habitat', val: '43', sub: '↑ 8 Zones Proteced', color: 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' },
              { label: 'Successful Hatchings', val: '189', sub: '↑ 23% Improvement', color: 'from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10' }
            ].map((trend, i) => (
              <div key={i} className={`bg-gradient-to-br ${trend.color} rounded-xl p-4 border border-white/20 dark:border-slate-800 transition-all`}>
                <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{trend.label}</p>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-2xl font-black dark:text-white">{trend.val}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase italic">{trend.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Analytical Archives" icon={FileText} iconColor="text-cyan-600" iconBg="bg-cyan-100 dark:bg-cyan-900/30">
        <div className="space-y-3">
          {reports.map((report) =>
            report.type === 'Hatchery' ? (
              <HatcheryReportItem key={report.id} report={report} />
            ) : (
              <div key={report.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl p-3 hover:shadow-lg transition-all flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="bg-cyan-50 dark:bg-cyan-900/30 p-2.5 rounded-xl group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{report.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center"><Calendar className="h-3 w-3 mr-1" />{report.date}</span>
                      <span className="text-[8px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-black uppercase">{report.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${report.status === 'Available' ? 'text-green-600' : 'text-amber-500 animate-pulse'}`}>{report.status}</span>
                  <Button variant="secondary" className="p-2 h-auto rounded-lg"><Download className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )
          )}
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Export Matrix', icon: PieChart, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', options: ['PDF Biological Summary', 'Excel Observation Data', 'CSV Raw Telemetry'] },
          { title: 'Temporal Filters', icon: Calendar, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', options: ['Last 24 Hours', 'Recent 30 Days', 'Analytical Range'] },
          { title: 'Intelligence Sets', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', options: ['Vitality Metrics', 'Conflict Logs', 'Habitat Erosion'] }
        ].map((sec, si) => (
          <div key={si} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 border border-gray-100 dark:border-slate-800 transition-all">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`${sec.bg} p-2.5 rounded-xl`}><sec.icon className={`h-5 w-5 ${sec.color}`} /></div>
              <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">{sec.title}</h3>
            </div>
            <div className="space-y-2">
              {sec.options.map((opt, oi) => (
                <button key={oi} className="w-full text-left px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all font-bold text-gray-600 dark:text-gray-400 text-[10px] uppercase tracking-wider">{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
