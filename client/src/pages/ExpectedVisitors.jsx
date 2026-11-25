import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  UserCheck,
  XCircle,
  Search,
  Building2,
  Calendar,
  Clock,
  Phone,
  Briefcase,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { expectedVisitorService, departmentService, employeeService } from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function ExpectedVisitors() {
  const [expectedVisitors, setExpectedVisitors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State for adding expected visitor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    company_name: '',
    department_id: '',
    host_employee_id: '',
    purpose: 'Scheduled Meeting',
    expected_date: new Date().toISOString().split('T')[0],
    expected_time: '10:00 AM'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1-Click Checkin Conversion Modal
  const [convertingVisitor, setConvertingVisitor] = useState(null);
  const [convertForm, setConvertForm] = useState({
    vehicle_number: '',
    number_of_visitors: 1,
    material_details: '',
    remarks: 'Pre-registered expected visitor arrived'
  });
  const [converting, setConverting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      if (res.data.success) {
        setDepartments(res.data.departments.filter(d => d.is_active));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadExpectedVisitors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await expectedVisitorService.getAll(params);
      if (res.data.success) {
        setExpectedVisitors(res.data.expectedVisitors);
      }
    } catch (err) {
      console.error('Failed to load expected visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    loadExpectedVisitors();
  }, [statusFilter]);

  // Load employees when department changes in registration modal
  useEffect(() => {
    if (!formData.department_id) {
      setFilteredEmployees([]);
      setFormData(prev => ({ ...prev, host_employee_id: '' }));
      return;
    }

    const fetchEmployees = async () => {
      try {
        const res = await employeeService.getAll({ department_id: formData.department_id });
        if (res.data.success) {
          setFilteredEmployees(res.data.employees);
          if (res.data.employees.length === 1) {
            setFormData(prev => ({ ...prev, host_employee_id: res.data.employees[0].id }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployees();
  }, [formData.department_id]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.mobile.trim() || !formData.department_id || !formData.host_employee_id) {
      return setError('Please fill all mandatory fields.');
    }

    setSubmitting(true);
    try {
      const res = await expectedVisitorService.create(formData);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          mobile: '',
          company_name: '',
          department_id: '',
          host_employee_id: '',
          purpose: 'Scheduled Meeting',
          expected_date: new Date().toISOString().split('T')[0],
          expected_time: '10:00 AM'
        });
        loadExpectedVisitors();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create expected visitor record');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Conversion Submit
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingVisitor) return;

    setConverting(true);
    try {
      const res = await expectedVisitorService.convertToCheckIn(convertingVisitor.id, convertForm);
      if (res.data.success) {
        alert(`Success! ${convertingVisitor.name} has been checked in with Pass ID: ${res.data.visitor.visitor_id}`);
        setConvertingVisitor(null);
        loadExpectedVisitors();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in conversion failed');
    } finally {
      setConverting(false);
    }
  };

  // Cancel Visit
  const handleCancel = async (id, name) => {
    if (!window.confirm(`Cancel scheduled visit for ${name}?`)) return;
    try {
      await expectedVisitorService.cancel(id);
      loadExpectedVisitors();
    } catch (err) {
      alert('Failed to cancel visit');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-brand-600" />
            <span>Expected Visitors Management</span>
          </h2>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expected Visitor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && loadExpectedVisitors()}
            placeholder="Search expected guest or company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-bold shrink-0">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Arrival Only</option>
            <option value="ARRIVED">Already Arrived / Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Expected Visitors Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Expected Date & Time</th>
                <th className="py-3 px-4">Visitor Details</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Meeting Staff (Host)</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading expected visitors...</span>
                  </td>
                </tr>
              ) : expectedVisitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expected visitor entries found.
                  </td>
                </tr>
              ) : (
                expectedVisitors.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Expected Date & Time */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-600" />
                        <span>{new Date(ev.expected_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{ev.expected_time}</span>
                      </div>
                    </td>

                    {/* Visitor Info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ev.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{ev.mobile}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {ev.company_name || 'Individual'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{ev.host_employee_name}</div>
                      <div className="text-[11px] text-slate-500">{ev.department_name} ({ev.host_phone})</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-brand-700">
                      {ev.purpose}
                    </td>

                    <td className="py-3 px-4">
                      <Badge status={ev.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {ev.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConvertingVisitor(ev)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check In Now</span>
                          </button>
                          <button
                            onClick={() => handleCancel(ev.id, ev.name)}
                            title="Cancel Visit"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {ev.status === 'ARRIVED' ? 'Pass Issued' : 'Cancelled'}
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

      {/* Pre-Register Expected Visitor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pre-Register Expected Visitor"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Visitor Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Guest name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g. ABC Packaging / Vendor"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Department & Host Employee Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Person to Meet <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={!formData.department_id}
                value={formData.host_employee_id}
                onChange={(e) => setFormData({ ...formData, host_employee_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium disabled:bg-slate-100"
              >
                <option value="">
                  {!formData.department_id ? 'Select Department first' : '-- Choose Employee --'}
                </option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expected Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expected Arrival Time <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.expected_time}
                onChange={(e) => setFormData({ ...formData, expected_time: e.target.value })}
                placeholder="e.g. 11:30 AM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Visit</label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g. Packaging Machine Demo / Audit"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Save Expected Visitor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Express 1-Click Check-In Conversion Modal */}
      <Modal
        isOpen={!!convertingVisitor}
        onClose={() => setConvertingVisitor(null)}
        title="Express Check-In Conversion"
        maxWidth="max-w-md"
      >
        {convertingVisitor && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pre-registered Details Found:</span>
              </div>
              <p><strong>Visitor:</strong> {convertingVisitor.name} ({convertingVisitor.mobile})</p>
              <p><strong>Meeting:</strong> {convertingVisitor.host_employee_name} ({convertingVisitor.department_name})</p>
              <p><strong>Purpose:</strong> {convertingVisitor.purpose}</p>
            </div>

            <p className="text-xs text-slate-500">
              Visitor has arrived at the gate. Complete optional gate details below to generate pass instantly:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Number</label>
              <input
                type="text"
                value={convertForm.vehicle_number}
                onChange={(e) => setConvertForm({ ...convertForm, vehicle_number: e.target.value })}
                placeholder="e.g. DL 01 AB 1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guests Count</label>
                <input
                  type="number"
                  min="1"
                  value={convertForm.number_of_visitors}
                  onChange={(e) => setConvertForm({ ...convertForm, number_of_visitors: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Carried</label>
                <input
                  type="text"
                  value={convertForm.material_details}
                  onChange={(e) => setConvertForm({ ...convertForm, material_details: e.target.value })}
                  placeholder="e.g. Laptop, Tool kit"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConvertingVisitor(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={converting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Issuing Pass...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Confirm & Issue Pass</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
