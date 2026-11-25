import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  LogOut,
  CalendarClock,
  Building2,
  UserPlus,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { dashboardService, visitorService } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      if (res.data.success) {
        setStats(res.data.stats);
        setDeptStats(res.data.departmentStats || []);
        setHourly(res.data.hourlyActivity || []);
        setRecentVisitors(res.data.recentVisitors || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // Auto refresh dashboard every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickCheckout = async (id, name) => {
    try {
      const res = await visitorService.checkOut(id);
      if (res.data.success) {
        setActionMessage(`Visitor ${name} marked as Checked Out!`);
        setTimeout(() => setActionMessage(''), 4000);
        loadDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Pure Solid Corporate Blue Across Entire Card */}
      <div className="bg-[#0258A1] rounded-[26px] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 min-h-[140px] border border-blue-400/20">
        <div className="max-w-xl">
          <div className="inline-flex items-center px-3.5 py-1 bg-[#0C8DE9] text-white text-[11px] font-black rounded-full uppercase tracking-wider mb-2.5 shadow-sm">
            <span>Main Gate Register</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
            ISHARWAL FEED MILL
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/new-visitor"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0C8DE9] hover:bg-[#097bce] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ New Gate Entry</span>
          </Link>
          <Link
            to="/expected-visitors"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0C8DE9] hover:bg-[#097bce] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Expected List</span>
          </Link>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionMessage}</span>
        </div>
      )}

      {/* 5 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Visitors Today"
          value={loading ? '...' : stats?.visitorsToday || 0}
          icon={Users}
          color="blue"
          subtitle="Total entries logged today"
        />
        <StatCard
          title="Currently Inside"
          value={loading ? '...' : stats?.currentlyInside || 0}
          icon={UserCheck}
          color="emerald"
          subtitle="Active on factory premises"
        />
        <StatCard
          title="Checked Out Today"
          value={loading ? '...' : stats?.checkedOutToday || 0}
          icon={LogOut}
          color="purple"
          subtitle="Completed visits today"
        />
        <StatCard
          title="Expected Visitors"
          value={loading ? '...' : stats?.expectedToday || 0}
          icon={CalendarClock}
          color="amber"
          subtitle={`${stats?.expectedPending || 0} pending arrival`}
        />
        <StatCard
          title="Total All Time"
          value={loading ? '...' : stats?.totalAllTime || 0}
          icon={Building2}
          color="violet"
          subtitle="Lifetime visitor passes"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department-wise Visitor Traffic Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Department-wise Visitor Distribution</h3>
              <p className="text-xs text-slate-500">Breakdown of factory visits across departments</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-xl border border-slate-200/60 cursor-pointer flex items-center gap-1">
              Last 30 Days ▾
            </span>
          </div>

          <div className="h-64 w-full">
            {deptStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department visitor data recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Today's Hourly Movement Chart */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hourly Gate Traffic</h3>
              <p className="text-xs text-slate-500">Check-in rush hours today</p>
            </div>
            <Clock className="w-4 h-4 text-[#0C8DE9]" />
          </div>

          <div className="h-64 w-full">
            {hourly.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No check-ins logged today yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0c8de9" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0c8de9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#0c8de9" fillOpacity={1} fill="url(#hourColor)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Visitor Movements Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Recent Visitor Movements</h3>
            <p className="text-xs text-slate-500">Live check-in and check-out logs at security gate</p>
          </div>
          <Link
            to="/visitors"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
          >
            <span>View Complete Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Pass ID</th>
                <th className="py-3 px-4">Visitor</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Department / Host</th>
                <th className="py-3 px-4">In-Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVisitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No visitor records found. Click "New Gate Entry" to create the first pass!
                  </td>
                </tr>
              ) : (
                recentVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {v.visitor_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{v.name}</div>
                      <div className="text-[11px] text-slate-400">{v.mobile}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {v.company_name || 'Individual'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{v.department_name}</div>
                      <div className="text-[11px] text-slate-500">To meet: {v.host_employee_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {new Date(v.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(v.in_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={v.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status === 'INSIDE' ? (
                        <button
                          onClick={() => handleQuickCheckout(v.id, v.name)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-red-600 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                        >
                          Check Out
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Out at {new Date(v.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
