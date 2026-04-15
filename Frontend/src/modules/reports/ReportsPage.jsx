import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Download, TrendingUp, Calendar, BarChart3, PieChart,
  RefreshCw, Loader2, AlertCircle, ChevronDown, Trash2, Plus, Filter, Clock
} from 'lucide-react';
import DashboardCard from '../../shared/components/ui/DashboardCard';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard';
import Button from '../../shared/components/ui/Button';
import { API_BASE_URL } from '../../shared/config';

const REPORT_TYPES = [
  { value: 'monthly-conservation-summary', label: 'Monthly Conservation Summary', icon: '📊' },
  { value: 'turtle-health-analytics', label: 'Turtle Health Analytics', icon: '🐢' },
  { value: 'nest-protection-report', label: 'Nest Protection Report', icon: '🪹' },
  { value: 'shoreline-risk-assessment', label: 'Shoreline Risk Assessment', icon: '🌊' },
  { value: 'hatchery-management', label: 'Hatchery Management Report', icon: '🥚' },
];

const TYPE_BADGE_COLORS = {
  'monthly-conservation-summary': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'turtle-health-analytics': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  'nest-protection-report': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  'shoreline-risk-assessment': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  'hatchery-management': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

const RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [trends, setTrends] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [range, setRange] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Report generation
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState('monthly-conservation-summary');
  const [genFrom, setGenFrom] = useState('');
  const [genTo, setGenTo] = useState('');
  const [showGenPanel, setShowGenPanel] = useState(false);

  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const buildQuery = useCallback(() => {
    if (range === 'custom' && customFrom && customTo) {
      return `?from=${customFrom}&to=${customTo}`;
    } else if (range && range !== 'custom') {
      return `?range=${range}`;
    }
    return '';
  }, [range, customFrom, customTo]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const query = buildQuery();

      const [summaryRes, performanceRes, trendsRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/analytics/summary${query}`),
        fetch(`${API_BASE_URL}/api/analytics/performance`),
        fetch(`${API_BASE_URL}/api/analytics/trends`),
        fetch(`${API_BASE_URL}/api/reports`),
      ]);

      if (!summaryRes.ok || !performanceRes.ok || !trendsRes.ok || !reportsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [summaryData, performanceData, trendsData, reportsData] = await Promise.all([
        summaryRes.json(),
        performanceRes.json(),
        trendsRes.json(),
        reportsRes.json(),
      ]);

      setSummary(summaryData);
      setPerformance(performanceData);
      setTrends(trendsData);
      setReports(reportsData.reports || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchDashboardData]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: genType, from: genFrom || undefined, to: genTo || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Generation failed');

      // Re-fetch reports list
      const reportsRes = await fetch(`${API_BASE_URL}/api/reports`);
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);
      setShowGenPanel(false);
    } catch (err) {
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!confirm('Delete this report permanently?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/reports/${id}`, { method: 'DELETE' });
      setReports(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert('Failed to delete report');
    }
  };

  const performanceStats = performance ? [
    { label: 'Turtle Health Rate', val: `${performance.turtleHealthRate}%`, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { label: 'Nest Success Rate', val: `${performance.nestSuccessRate}%`, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50 dark:bg-green-900/10' },
    { label: 'Hatchling Survival', val: `${performance.hatchingSurvivalRate}%`, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
    { label: 'Conflict Mitigation', val: `${performance.conflictMitigationRate}%`, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
  ] : [];

  const vitalityCards = summary ? [
    {
      label: 'Health Records',
      val: summary.totalHealthRecords?.toString() || '0',
      sub: `↑ ${summary.monthlyGrowthPercent >= 0 ? summary.monthlyGrowthPercent : 0}% Monthly`,
      color: 'from-teal-50 to-cyan-50 dark:from-teal-900/10 dark:to-cyan-900/10'
    },
    {
      label: 'Nest Events',
      val: summary.totalNestEvents?.toString() || '0',
      sub: `${summary.totalShorelineAlerts || 0} Shoreline Alerts`,
      color: 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10'
    },
    {
      label: 'Hatchery Videos',
      val: summary.totalHatcheryVideos?.toString() || '0',
      sub: `${summary.totalReports || 0} Total Records`,
      color: 'from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10'
    }
  ] : [];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-cyan-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
          </div>
          <Button variant="secondary" onClick={fetchDashboardData} className="px-6">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm italic">Generate and download conservation intelligence reports</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Time range filter */}
          <div className="relative">
            <select
              id="range-filter"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer hover:border-cyan-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              {RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                id="date-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                id="date-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          )}

          <Button variant="secondary" onClick={fetchDashboardData} className="p-2.5 h-auto rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {lastRefresh && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Error banner (non-blocking) */}
      {error && summary && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{error}</p>
          <button onClick={fetchDashboardData} className="ml-auto text-xs text-amber-600 hover:text-amber-800 font-bold underline">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatSummaryCard
          icon={FileText}
          value={summary?.totalReports?.toString() || '0'}
          label="Total Records"
          subtext={`↑ ${summary?.monthlyGrowthPercent >= 0 ? summary?.monthlyGrowthPercent : 0}% monthly growth`}
        />
        <StatSummaryCard
          icon={TrendingUp}
          value={`${summary?.monthlyGrowthPercent >= 0 ? '+' : ''}${summary?.monthlyGrowthPercent || 0}%`}
          label="Vitality Growth"
          subtext="vs previous month"
        />
        <StatSummaryCard
          icon={Calendar}
          value={new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          label="Analysis Period"
          subtext={range === 'custom' ? `${customFrom} — ${customTo}` : (RANGE_OPTIONS.find(o => o.value === range)?.label || 'All Time')}
        />
        <StatSummaryCard
          icon={Download}
          value={reports.length?.toString() || '0'}
          label="Generated Reports"
          subtext="Available for download"
        />
      </div>

      {/* Performance & Vitality */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Performance Indices */}
        <DashboardCard title="Performance Indices" icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-900/30">
          <div className="space-y-3">
            {performanceStats.length > 0 ? performanceStats.map((stat, i) => (
              <div key={i} className={`${stat.bg} rounded-xl p-3 border border-white/20 dark:border-slate-800`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-tighter">{stat.label}</span>
                  <span className="text-xs font-black text-gray-900 dark:text-white">{stat.val}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${stat.color} h-full rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: stat.val }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic text-center py-4">No performance data available</p>
            )}
          </div>
        </DashboardCard>

        {/* Vitality Trends */}
        <DashboardCard title="Vitality Trends" icon={TrendingUp} iconColor="text-teal-600" iconBg="bg-teal-100 dark:bg-teal-900/30">
          <div className="space-y-3">
            {vitalityCards.length > 0 ? vitalityCards.map((trend, i) => (
              <div key={i} className={`bg-gradient-to-br ${trend.color} rounded-xl p-4 border border-white/20 dark:border-slate-800 transition-all`}>
                <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{trend.label}</p>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-2xl font-black dark:text-white">{trend.val}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase italic">{trend.sub}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic text-center py-4">No trend data available</p>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Monthly Trends Chart Data (as table) */}
      {trends.length > 0 && (
        <DashboardCard title="Monthly Trends" icon={PieChart} iconColor="text-indigo-600" iconBg="bg-indigo-100 dark:bg-indigo-900/30">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">Month</th>
                  <th className="text-center py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">Healthy</th>
                  <th className="text-center py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[10px]">Unhealthy</th>
                  <th className="text-center py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px]">Safe Nests</th>
                  <th className="text-center py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px]">Risk Alerts</th>
                  <th className="text-center py-2.5 px-3 font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-[10px]">Hatchery Done</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((row, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-800/30' : ''} hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 transition-colors`}>
                    <td className="py-2 px-3 font-bold text-gray-800 dark:text-white">{row.month} {row.year}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-black">{row.healthyTurtles}</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full text-[10px] font-black">{row.unhealthyTurtles}</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-black">{row.safeNests}</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-black">{row.riskAlerts}</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-black">{row.hatcheryCompleted}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}

      {/* Analytical Archives (Reports List) */}
      <DashboardCard
        title="Analytical Archives"
        icon={FileText}
        iconColor="text-cyan-600"
        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
        right={
          <Button
            variant="primary"
            className="px-4 py-2 h-auto text-xs rounded-xl"
            onClick={() => setShowGenPanel(!showGenPanel)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate Report
          </Button>
        }
      >
        {/* Report Generator Panel */}
        {showGenPanel && (
          <div className="mb-5 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 border border-cyan-200 dark:border-cyan-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">New Report</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Report Type</label>
                <select
                  id="gen-report-type"
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  {REPORT_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value}>{rt.icon} {rt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">From Date</label>
                <input
                  id="gen-from-date"
                  type="date"
                  value={genFrom}
                  onChange={(e) => setGenFrom(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">To Date</label>
                <input
                  id="gen-to-date"
                  type="date"
                  value={genTo}
                  onChange={(e) => setGenTo(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                className="px-5 py-2.5 h-auto text-xs rounded-xl"
                onClick={handleGenerateReport}
                disabled={generating}
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                {generating ? 'Generating...' : 'Generate'}
              </Button>
              <Button
                variant="secondary"
                className="px-4 py-2.5 h-auto text-xs rounded-xl"
                onClick={() => setShowGenPanel(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">No reports generated yet. Click "Generate Report" to create one.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report._id}
                className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl p-3 hover:shadow-lg hover:border-cyan-200 dark:hover:border-cyan-900 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2.5 rounded-xl shadow-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {report.title || REPORT_TYPES.find(rt => rt.value === report.type)?.label || report.type}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center font-medium">
                          <Calendar className="h-3 w-3 mr-1 opacity-60" />
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </span>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${TYPE_BADGE_COLORS[report.type] || 'bg-gray-100 text-gray-600'}`}>
                          {report.type?.replace(/-/g, ' ')}
                        </span>
                        {report.filters?.from && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500">
                            {new Date(report.filters.from).toLocaleDateString()} — {new Date(report.filters.to).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] text-green-600 dark:text-green-500 font-black uppercase tracking-widest hidden sm:block">Ready</span>

                    {/* JSON Download */}
                    <button
                      onClick={() => window.open(`${API_BASE_URL}/api/reports/${report._id}/download?format=json`, '_blank')}
                      className="p-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all group/btn"
                      title="Download JSON"
                    >
                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">JSON</span>
                    </button>

                    {/* PDF Download */}
                    <button
                      onClick={() => window.open(`${API_BASE_URL}/api/reports/${report._id}/download?format=pdf`, '_blank')}
                      className="p-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-all group/btn"
                      title="Download PDF"
                    >
                      <span className="text-[9px] font-black text-red-600 dark:text-red-400">PDF</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteReport(report._id)}
                      className="p-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-all"
                      title="Delete report"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardCard>

      {/* Bottom Cards: Export / Filters / Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Export Matrix', icon: PieChart, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30',
            options: [
              { label: 'PDF Biological Summary', action: () => { setGenType('monthly-conservation-summary'); setShowGenPanel(true); } },
              { label: 'Health Analytics PDF', action: () => { setGenType('turtle-health-analytics'); setShowGenPanel(true); } },
              { label: 'Nest Report PDF', action: () => { setGenType('nest-protection-report'); setShowGenPanel(true); } },
            ]
          },
          {
            title: 'Temporal Filters', icon: Calendar, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30',
            options: [
              { label: 'Last 24 Hours', action: () => setRange('24h') },
              { label: 'Recent 30 Days', action: () => setRange('30d') },
              { label: 'All Time View', action: () => setRange('') },
            ]
          },
          {
            title: 'Intelligence Sets', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30',
            options: [
              { label: 'Shoreline Risk Report', action: () => { setGenType('shoreline-risk-assessment'); setShowGenPanel(true); } },
              { label: 'Hatchery Management', action: () => { setGenType('hatchery-management'); setShowGenPanel(true); } },
              { label: 'Full Conservation Summary', action: () => { setGenType('monthly-conservation-summary'); setShowGenPanel(true); } },
            ]
          }
        ].map((sec, si) => (
          <div key={si} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 border border-gray-100 dark:border-slate-800 transition-all">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`${sec.bg} p-2.5 rounded-xl`}><sec.icon className={`h-5 w-5 ${sec.color}`} /></div>
              <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">{sec.title}</h3>
            </div>
            <div className="space-y-2">
              {sec.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={opt.action}
                  className="w-full text-left px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all font-bold text-gray-600 dark:text-gray-400 text-[10px] uppercase tracking-wider hover:text-cyan-600 dark:hover:text-cyan-400"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
