import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Building2, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { employeeService, departmentService } from '../services/api';
import Modal from '../components/Modal';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    designation: 'Staff',
    department_id: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (deptFilter) params.department_id = deptFilter;

      const res = await employeeService.getAll(params);
      if (res.data.success) {
        setEmployees(res.data.employees);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [deptFilter]);

  const openAddModal = () => {
    setEditingEmp(null);
    setFormData({
      employee_code: '',
      name: '',
      email: '',
      phone: '',
      designation: 'Staff',
      department_id: departments[0]?.id || ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmp(emp);
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation || 'Staff',
      department_id: emp.department_id
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingEmp) {
        await employeeService.update(editingEmp.id, formData);
      } else {
        await employeeService.create(formData);
      }
      setIsModalOpen(false);
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete or deactivate employee '${name}'?`)) return;

    try {
      await employeeService.delete(id);
      loadEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <span>Employee Directory & Management</span>
          </h2>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search & Department Filter */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && loadEmployees()}
            placeholder="Search employee by name, code, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-bold shrink-0">Filter Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Emp Code</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading employees...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {emp.employee_code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {emp.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700">
                        {emp.department_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {emp.designation || 'Staff'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {emp.phone}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {emp.email}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmp ? 'Edit Employee Details' : 'Add New Employee'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })}
                placeholder="e.g. EMP-101"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Employee name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

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
            <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g. Senior Production Engineer"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Mobile number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="staff@isharwalfeedmill.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
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
              {submitting ? 'Saving...' : editingEmp ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
