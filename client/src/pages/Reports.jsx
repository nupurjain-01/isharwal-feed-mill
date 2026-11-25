import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  Filter,
  Building2,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Loader2
} from 'lucide-react';
import { reportService, departmentService } from '../services/api';
import Badge from '../components/Badge';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'excel-import'

  // Reports Filter State
  const [dateFilter, setDateFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [departments, setDepartments] = useState([]);

  // Reports Data
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Excel Import State
  const [importType, setImportType] = useState('master');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    departmentService.getAll().then(res => {
      if (res.data.success) setDepartments(res.data.departments);
    });
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = { date_filter: dateFilter };
      if (dateFilter === 'custom' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      if (departmentId) params.department_id = departmentId;
      if (status) params.status = status;

      const res = await reportService.getData(params);
      if (res.data.success) {
        setReports(res.data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [dateFilter, departmentId, status, activeTab]);

  const handleDownloadExcel = () => {
    const params = { date_filter: dateFilter };
    if (dateFilter === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    if (departmentId) params.department_id = departmentId;
    if (status) params.status = status;
    reportService.downloadExcel(params);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return setImportError('Please choose an Excel file to upload.');

    setImporting(true);
    setImportError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      let res;
      if (importType === 'master') {
        res = await reportService.importMaster(formData);
      } else if (importType === 'departments') {
        res = await reportService.importDepartments(formData);
      } else {
        res = await reportService.importEmployees(formData);
      }

      if (res.data.success) {
        setImportResult(res.data.result);
        setImportFile(null);
      }
    } catch (err) {
      setImportError(err.response?.data?.message || 'Import failed. Check Excel format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeTab === 'reports'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Visitor Analytics & Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('excel-import')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeTab === 'excel-import'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Bulk Excel Import (Masters)</span>
        </button>
      </div>

      {activeTab === 'reports' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Custom Report Generator</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print View</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom Date Range' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    dateFilter === f.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2">
              {dateFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="INSIDE">Currently Inside</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <div className="flex items-end">
                  <button
                    onClick={loadReports}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-sm"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Total Filtered Records: {reports.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Pass ID</th>
                    <th className="py-3 px-4">Visitor</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Department / Host</th>
                    <th className="py-3 px-4">In-Time</th>
                    <th className="py-3 px-4">Out-Time</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                        <span>Generating report...</span>
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No visitor records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-brand-700">{r.visitor_id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                        <td className="py-3 px-4 font-mono">{r.mobile}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{r.company_name || 'Individual'}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{r.department_name}</div>
                          <div className="text-[11px] text-slate-500">{r.host_employee_name}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {new Date(r.in_time).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.out_time ? new Date(r.out_time).toLocaleString() : '— Active Inside —'}
                        </td>
                        <td className="py-3 px-4">{r.purpose}</td>
                        <td className="py-3 px-4"><Badge status={r.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Excel Bulk Import Section */
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Bulk Data Import Center</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload existing Microsoft Excel spreadsheets to import hundreds of departments and employees in seconds.
            </p>
          </div>

          {/* Select Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => { setImportType('master'); setImportResult(null); }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                importType === 'master'
                  ? 'border-brand-500 bg-brand-50/70 shadow-sm ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                <span className="text-[10px] bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full uppercase">All-in-One</span>
              </div>
              <h4 className="font-bold text-sm text-slate-800">Master Sheet Import</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically creates Departments, Employees & HODs from a single Excel sheet.
              </p>
            </button>

            <button
              type="button"
              onClick={() => { setImportType('departments'); setImportResult(null); }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                importType === 'departments'
                  ? 'border-brand-500 bg-brand-50/70 shadow-sm ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-5 h-5 text-brand-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-800">Departments Only</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Columns: Department Name, Code, Description</p>
            </button>

            <button
              type="button"
              onClick={() => { setImportType('employees'); setImportResult(null); }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                importType === 'employees'
                  ? 'border-brand-500 bg-brand-50/70 shadow-sm ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-5 h-5 text-emerald-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-800">Employees Only</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Columns: Code, Name, Email, Phone, Dept Code, Designation</p>
            </button>
          </div>

          {/* Download Template Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-xs text-slate-800">Need the correct column format?</h5>
              <p className="text-[11px] text-slate-500">
                {importType === 'master'
                  ? 'Download the pre-formatted Master template with Department Name, HOD/Staff, Designation & Mobile.'
                  : `Download the pre-formatted Excel template for ${importType}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => reportService.downloadTemplate(importType)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download {importType === 'master' ? 'Master Excel' : importType} Template</span>
            </button>
          </div>

          {/* Error Message */}
          {importError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-600 file:text-white hover:file:bg-brand-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-2">Supports .xlsx and .xls formats up to 5MB</p>
            </div>

            <button
              type="submit"
              disabled={importing || !importFile}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating and Importing Rows...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Start Bulk Excel Import</span>
                </>
              )}
            </button>
          </form>

          {/* Import Result Summary */}
          {importResult && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import Batch Summary:</span>
              </div>
              
              {importResult.departmentsCreated !== undefined ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border">
                    <span className="text-[10px] text-slate-400 block">Total Rows</span>
                    <strong className="text-sm">{importResult.total}</strong>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-xl border border-blue-200 text-blue-800">
                    <span className="text-[10px] text-blue-600 block">Depts Created</span>
                    <strong className="text-sm">{importResult.departmentsCreated}</strong>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-emerald-800">
                    <span className="text-[10px] text-emerald-600 block">Staff / HOD Created</span>
                    <strong className="text-sm">{importResult.employeesCreated}</strong>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-800">
                    <span className="text-[10px] text-amber-600 block">Skipped / Duplicates</span>
                    <strong className="text-sm">{importResult.skipped}</strong>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border"><span className="text-[10px] text-slate-400 block">Total Rows</span><strong className="text-sm">{importResult.total}</strong></div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-emerald-800"><span className="text-[10px] text-emerald-600 block">Imported</span><strong className="text-sm">{importResult.imported}</strong></div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-800"><span className="text-[10px] text-amber-600 block">Skipped/Duplicate</span><strong className="text-sm">{importResult.skipped}</strong></div>
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <h6 className="font-bold text-amber-800 mb-1">Notices / Skipped Rows:</h6>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px] max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
