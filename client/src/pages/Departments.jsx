import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Users, AlertCircle, Loader2 } from 'lucide-react';
import { departmentService } from '../services/api';
import Modal from '../components/Modal';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentService.getAll();
      if (res.data.success) {
        setDepartments(res.data.departments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', description: '' });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, code: dept.code, description: dept.description || '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingDept) {
        await departmentService.update(editingDept.id, formData);
      } else {
        await departmentService.create(formData);
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name, empCount) => {
    if (empCount > 0) {
      return alert(`Cannot delete department '${name}' because ${empCount} employee(s) belong to it. Reassign employees first.`);
    }
    if (!window.confirm(`Are you sure you want to delete department '${name}'?`)) return;

    try {
      await departmentService.delete(id);
      loadDepartments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600" />
            <span>Department Management</span>
          </h2>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Active Staff</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Loading departments...</span>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No departments found. Click "Add Department" to create one.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {d.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {d.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {d.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{d.employee_count} Staff</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {d.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id, d.name, d.employee_count)}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create New Department'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Quality Assurance"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Department Code (Short) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. QA"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview of department functions..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
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
              {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
