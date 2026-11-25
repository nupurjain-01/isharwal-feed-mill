import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Calendar,
  LogOut,
  Eye,
  Trash2,
  Printer,
  Building2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { visitorService, departmentService, reportService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function VisitorRecords() {
  const { isAdmin } = useAuth();

  const [visitors, setVisitors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Visitor for Details / Pass Modal
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      if (res.data.success) {
        setDepartments(res.data.departments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadVisitors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.department_id = deptFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await visitorService.getAll(params);
      if (res.data.success) {
        setVisitors(res.data.visitors);
      }
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    loadVisitors();
  }, [statusFilter, deptFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadVisitors();
  };

  // 1-Click Check Out
  const handleCheckOut = async (id, name) => {
    if (!window.confirm(`Mark ${name} as Checked Out?`)) return;

    try {
      const res = await visitorService.checkOut(id);
      if (res.data.success) {
        loadVisitors();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    }
  };

  // Admin Delete Visitor
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete pass for ${name}? This action cannot be undone.`)) return;

    try {
      const res = await visitorService.delete(id);
      if (res.data.success) {
        loadVisitors();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (deptFilter) params.department_id = deptFilter;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    reportService.downloadExcel(params);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-600" />
            <span>Visitor Entry & Exit Register</span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadVisitors}
            title="Refresh List"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Visitor Name, Mobile, Company, Vehicle, or Pass ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="INSIDE">Currently Inside Only</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Visitor Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Visitor Pass</th>
                <th className="py-3 px-4">Visitor Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Department / Host</th>
                <th className="py-3 px-4">In-Time</th>
                <th className="py-3 px-4">Out-Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading visitor logs...</span>
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No visitor records found matching your filters.
                  </td>
                </tr>
              ) : (
                visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Visitor ID */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                        {v.visitor_id}
                      </span>
                    </td>

                    {/* Visitor Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {v.photo_url ? (
                          <img
                            src={v.photo_url}
                            alt={v.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {v.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{v.name}</div>
                          {v.number_of_visitors > 1 && (
                            <span className="text-[10px] text-slate-400 font-medium">+{v.number_of_visitors - 1} guests</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono">{v.mobile}</td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {v.company_name || 'Individual'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{v.department_name}</div>
                      <div className="text-[11px] text-slate-500">{v.host_employee_name}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {new Date(v.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(v.in_time).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {v.out_time ? (
                        <>
                          <div className="font-medium text-slate-800">
                            {new Date(v.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(v.out_time).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-bold">— Active Inside —</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge status={v.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Slip Details */}
                        <button
                          onClick={() => setSelectedVisitor(v)}
                          title="View Pass Slip"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Check Out Button */}
                        {v.status === 'INSIDE' && (
                          <button
                            onClick={() => handleCheckOut(v.id, v.name)}
                            title="Mark Out"
                            className="px-2.5 py-1 bg-slate-900 hover:bg-red-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors flex items-center gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Out</span>
                          </button>
                        )}

                        {/* Admin Delete */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(v.id, v.name)}
                            title="Delete Record"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Detail / Gate Pass Modal */}
      <Modal
        isOpen={!!selectedVisitor}
        onClose={() => setSelectedVisitor(null)}
        title="Visitor Gate Pass Details"
        maxWidth="max-w-md"
      >
        {selectedVisitor && (
          <div className="space-y-4">
            <div id="printable-pass" className="p-6 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-3">
              <div className="flex justify-center mb-1">
                <img src="/logo.png" alt="ISHARWAL FEED MILL" className="h-12 w-auto object-contain" />
              </div>
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-black text-lg text-slate-900">ISHARWAL FEED MILL</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Security Gate Pass Slip</p>
              </div>

              {selectedVisitor.photo_url && (
                <img
                  src={selectedVisitor.photo_url}
                  alt={selectedVisitor.name}
                  className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-brand-500 shadow"
                />
              )}

              <div className="bg-slate-50 py-2 px-4 rounded-xl border border-slate-200 inline-block text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Entry Date & Time</p>
                <p className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {new Date(selectedVisitor.in_time).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>

              <div className="text-left text-xs space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between"><span className="text-slate-500">Visitor:</span> <span className="font-bold text-slate-800">{selectedVisitor.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Mobile:</span> <span className="font-mono text-slate-800">{selectedVisitor.mobile}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Company:</span> <span className="text-slate-800">{selectedVisitor.company_name || 'Individual'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Department:</span> <span className="text-slate-800">{selectedVisitor.department_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Person to Meet:</span> <span className="font-semibold text-slate-800">{selectedVisitor.host_employee_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Purpose:</span> <span className="font-semibold text-brand-600">{selectedVisitor.purpose}</span></div>
                {selectedVisitor.vehicle_number && (
                  <div className="flex justify-between"><span className="text-slate-500">Vehicle No:</span> <span className="font-mono uppercase text-slate-800">{selectedVisitor.vehicle_number}</span></div>
                )}
                {selectedVisitor.material_details && (
                  <div className="flex justify-between"><span className="text-slate-500">Materials:</span> <span className="text-slate-800">{selectedVisitor.material_details}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">In-Time:</span> <span className="font-mono text-slate-800">{new Date(selectedVisitor.in_time).toLocaleString()}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Out-Time:</span>
                  <span className="font-mono text-slate-800">
                    {selectedVisitor.out_time ? new Date(selectedVisitor.out_time).toLocaleString() : 'Currently Inside'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass Slip</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
