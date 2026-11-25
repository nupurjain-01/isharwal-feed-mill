import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, User, Mail, Lock, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { authService, employeeService } from '../services/api';
import Modal from '../components/Modal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'receptionist',
    employeeId: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, eRes] = await Promise.all([
        authService.getUsers(),
        employeeService.getAll()
      ]);
      if (uRes.data.success) setUsers(uRes.data.users);
      if (eRes.data.success) setEmployees(eRes.data.employees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id, name, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} login access for '${name}'?`)) return;

    try {
      await authService.toggleUser(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      return setError('Please fill all mandatory fields');
    }

    setSubmitting(true);
    try {
      const res = await authService.createUser(formData);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'receptionist', employeeId: '' });
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span>User Accounts & Permissions</span>
          </h2>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Login Email</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Linked Staff Account</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading system users...</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : u.role === 'receptionist'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.employee_name ? (
                        <div>
                          <div className="font-semibold text-slate-800">{u.employee_name}</div>
                          <div className="text-[10px] text-slate-400">{u.department_name}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None (Stand-alone)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== 1 && (
                        <button
                          onClick={() => handleToggle(u.id, u.name, u.is_active)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            u.is_active
                              ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New System Login"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Security Officer Sharma"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email (Username) <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              placeholder="e.g. guard2@isharwalfeedmill.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Access Role <span className="text-red-500">*</span></label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            >
              <option value="receptionist">Receptionist / Security Guard</option>
              <option value="admin">System Administrator</option>
              <option value="employee">Regular Employee Portal</option>
            </select>
          </div>

          {formData.role === 'employee' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Link to Employee Profile</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department_name})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
