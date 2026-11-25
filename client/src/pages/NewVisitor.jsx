import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Camera,
  QrCode,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  Car,
  Package,
  FileDown
} from 'lucide-react';
import { departmentService, employeeService, visitorService, uploadService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import WebcamCapture from '../components/WebcamCapture';
import { parseAadhaarQR, getDemoAadhaarProfiles } from '../services/aadhaarService';

export default function NewVisitor() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: 'aadhaar' or 'manual'
  const [entryMode, setEntryMode] = useState('aadhaar');
  const [consentGiven, setConsentGiven] = useState(true);
  const [qrRawInput, setQrRawInput] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('Manual Entry');
  const [maskedUid, setMaskedUid] = useState('');

  // Master Data States
  const [departments, setDepartments] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    company_name: '',
    address: '',
    department_id: '',
    host_employee_id: '',
    custom_host_name: '',
    purpose: 'Official Business Meeting',
    vehicle_number: '',
    number_of_visitors: 1,
    material_details: '',
    remarks: '',
    photo_url: '',
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successPass, setSuccessPass] = useState(null);

  // Load Departments on Mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await departmentService.getAll();
        if (res.data.success) {
          setDepartments(res.data.departments.filter(d => d.is_active));
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // CRUCIAL: Dynamic Cascading Dropdown (Department -> Employees)
  useEffect(() => {
    if (!formData.department_id) {
      setFilteredEmployees([]);
      setFormData(prev => ({ ...prev, host_employee_id: '', custom_host_name: '' }));
      return;
    }

    const fetchEmployeesForDept = async () => {
      setLoadingEmployees(true);
      try {
        const res = await employeeService.getAll({ department_id: formData.department_id });
        if (res.data.success) {
          setFilteredEmployees(res.data.employees);
          if (res.data.employees.length === 1) {
            setFormData(prev => ({ ...prev, host_employee_id: String(res.data.employees[0].id) }));
          } else {
            setFormData(prev => ({ ...prev, host_employee_id: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployeesForDept();
  }, [formData.department_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Process Aadhaar QR Code
  const handleAadhaarScan = async (rawString) => {
    if (!rawString || !rawString.trim()) {
      setError('Please paste or scan a valid Aadhaar QR code string.');
      return;
    }

    if (!consentGiven) {
      setError('Please obtain the visitor voluntary consent before scanning Aadhaar.');
      return;
    }

    const parsed = await parseAadhaarQR(rawString);
    if (parsed.success) {
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        address: parsed.address || prev.address,
        mobile: parsed.mobile || prev.mobile,
        photo_url: parsed.photo || prev.photo_url
      }));

      if (parsed.photo) setPhotoPreview(parsed.photo);
      setVerificationStatus('Aadhaar Verified');
      setMaskedUid(parsed.maskedUid);
      setError('');
    } else {
      setVerificationStatus('Verification Failed');
      setError(parsed.message || 'Unable to parse QR code. Continuing in manual mode.');
    }
  };

  // Demo profile quick fill for testing
  const handleApplyDemoProfile = (profile) => {
    setFormData(prev => ({
      ...prev,
      name: profile.name,
      mobile: profile.mobile,
      company_name: profile.company,
      address: profile.address,
      photo_url: profile.photo
    }));
    setPhotoPreview(profile.photo);
    setVerificationStatus('Aadhaar Verified');
    setMaskedUid(profile.maskedUid);
    setError('');
  };

  // Handle Photo Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      const uploadData = new FormData();
      uploadData.append('photo', file);
      const res = await uploadService.uploadPhoto(uploadData);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, photo_url: res.data.photo_url }));
      }
    } catch (err) {
      console.warn('Local preview used, server upload error:', err.message);
    }
  };

  // Webcam Capture Handler (Supports direct Base64 DataURL & Blob)
  const handleWebcamCapture = (imageSource) => {
    if (!imageSource) return;

    if (typeof imageSource === 'string') {
      setPhotoPreview(imageSource);
      setFormData(prev => ({ ...prev, photo_url: imageSource }));
      setIsCameraOpen(false);
      return;
    }

    if (imageSource instanceof Blob) {
      try {
        const previewUrl = URL.createObjectURL(imageSource);
        setPhotoPreview(previewUrl);
        setIsCameraOpen(false);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, photo_url: reader.result }));
        };
        reader.readAsDataURL(imageSource);
      } catch (err) {
        console.warn('Blob preview conversion error:', err);
      }
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) return setError('Visitor Full Name is required.');
    if (!formData.mobile.trim() || formData.mobile.length < 10) return setError('Valid 10-digit Mobile Number is required.');
    if (!formData.department_id) return setError('Please select Department to visit.');
    if (!formData.host_employee_id) return setError('Please select Person to meet.');
    if (formData.host_employee_id === 'OTHER' && !formData.custom_host_name?.trim()) {
      return setError('Please enter the name of the person you wish to meet.');
    }
    if (!formData.purpose.trim()) return setError('Purpose of visit is required.');

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        host_employee_id: formData.host_employee_id === 'OTHER' ? 'OTHER' : formData.host_employee_id,
        custom_host_name: formData.host_employee_id === 'OTHER' ? formData.custom_host_name.trim() : '',
        verification_mode: entryMode,
        verification_status: verificationStatus,
        masked_uid: maskedUid,
        consent_recorded: consentGiven,
        guard_name: user?.name || 'Main Gate Security Officer'
      };

      const res = await visitorService.create(payload);
      if (res.data.success) {
        setSuccessPass(res.data.visitor);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register visitor. Please check your network.');
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Print Handler
  const handleDirectPrint = () => {
    if (window.electronAPI && window.electronAPI.printPage) {
      window.electronAPI.printPage();
    } else {
      window.print();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      company_name: '',
      address: '',
      department_id: '',
      host_employee_id: '',
      custom_host_name: '',
      purpose: 'Official Business Meeting',
      vehicle_number: '',
      number_of_visitors: 1,
      material_details: '',
      remarks: '',
      photo_url: '',
    });
    setPhotoPreview(null);
    setVerificationStatus('Manual Entry');
    setMaskedUid('');
    setError('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner with Isharwal Feed Mill Logo */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shadow-sm shrink-0">
            <img src="/logo.png" alt="ISHARWAL FEED MILL" className="h-16 w-auto object-contain" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
              Gate Pass Issuance
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              New Visitor Registration
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Security Officer</p>
            <p className="text-xs font-bold text-slate-800">{user?.name || 'Security Desk 1'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Date & Time</p>
            <p className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-xl border border-brand-100">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} | {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Entry Mode Switcher (Aadhaar Scan vs Manual Entry) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Verification Mode:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => { setEntryMode('aadhaar'); setVerificationStatus('Manual Entry'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  entryMode === 'aadhaar'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Aadhaar QR Scan / Verify</span>
              </button>

              <button
                type="button"
                onClick={() => { setEntryMode('manual'); setVerificationStatus('Manual Entry'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  entryMode === 'manual'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Enter Details Manually</span>
              </button>
            </div>
          </div>

          {/* Verification Badge - Blue Manual Entry Mode Button Removed as Requested */}
          <div className="flex items-center gap-2">
            {verificationStatus === 'Aadhaar Verified' && (
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>UIDAI Verified ({maskedUid})</span>
              </span>
            )}
            {verificationStatus === 'Verification Failed' && (
              <span className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span>Scan Incomplete (Manual Fallback)</span>
              </span>
            )}
          </div>
        </div>

        {/* Aadhaar Scanner Toolbar (Visible only when Aadhaar mode is active) */}
        {entryMode === 'aadhaar' && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {/* Voluntary Consent Notice */}
            <label className="flex items-start gap-2.5 bg-brand-50/60 border border-brand-100 p-3 rounded-2xl cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-xs text-brand-900 leading-relaxed font-medium">
                <strong>Visitor Voluntary Consent:</strong> The visitor consents to offline Aadhaar QR verification for gate entry. Full 12-digit Aadhaar numbers and biometric data are <strong>NOT</strong> stored in compliance with UIDAI regulations.
              </span>
            </label>

            {/* Scanner Input & Demo Profiles */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={qrRawInput}
                  onChange={(e) => setQrRawInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAadhaarScan(qrRawInput);
                    }
                  }}
                  placeholder="Scan with 2D Barcode Gun / Paste Secure QR text and press Enter..."
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => handleAadhaarScan(qrRawInput)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Verify QR
                </button>
              </div>

              {/* Quick Test Profiles for Security Desk Testing */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Demo QR:</span>
                {getDemoAadhaarProfiles().map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyDemoProfile(p)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 cursor-pointer"
                  >
                    {idx === 0 ? 'Vendor Demo' : 'Auditor Demo'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2.5 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Visitor Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Section 1: Visitor Information */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            <span>1. Visitor Personal & Company Details</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Photo Capture Column */}
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center">
              {photoPreview ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow border-2 border-brand-500 mb-3">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3">
                  <Camera className="w-8 h-8" />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Webcam</span>
                </button>
                <label className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer transition-colors">
                  <span>Browse</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <span className="text-[10px] text-slate-400 mt-2">Webcam photo or Aadhaar image</span>
            </div>

            {/* Fields: Name, Mobile, Company, Address */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visitor Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    name="mobile"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="e.g. ABC Corrugated Boxes / Vendor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="visitor@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Visitor Address / City
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Plot 45, GIDC Industrial Estate, Sanand"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Whom to Meet (Dynamic Dependent Dropdown + OTHER Option) */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span>2. Whom to Meet (Department & Host Selection)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department to Visit <span className="text-red-500">*</span>
              </label>
              <select
                required
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Person to Meet (HOD / Employee) <span className="text-red-500">*</span>
              </label>
              <select
                required
                name="host_employee_id"
                value={formData.host_employee_id}
                onChange={handleChange}
                disabled={!formData.department_id || loadingEmployees}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {loadingEmployees
                    ? 'Loading personnel...'
                    : formData.department_id
                    ? '-- Choose Person to Meet --'
                    : '-- Select Department First --'}
                </option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.designation} {emp.phone ? `(${emp.phone})` : ''}
                  </option>
                ))}
                {formData.department_id && (
                  <option value="OTHER" className="font-bold text-brand-700 bg-brand-50">
                    + Other / Enter Custom Name
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Conditional Input for "Other" Host Name */}
          {formData.host_employee_id === 'OTHER' && (
            <div className="mt-4 p-4 bg-brand-50/60 border border-brand-200 rounded-2xl animate-fade-in">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Specify Person to Meet (Custom Host Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="custom_host_name"
                value={formData.custom_host_name}
                onChange={handleChange}
                placeholder="Enter full name of the person / consultant / officer to meet"
                className="w-full px-3.5 py-2.5 bg-white border border-brand-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                This custom name will be recorded on the official gate pass and in the visitor register.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose of Visit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="e.g. Raw Material Inspection / Machine Repair / Interview"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Number (Optional)
              </label>
              <input
                type="text"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                placeholder="e.g. GJ01 AB 1234"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Gate Pass in PostgreSQL...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Visitor & Issue Gate Pass</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <Modal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title="Capture Visitor Live Photo"
        maxWidth="max-w-lg"
      >
        <WebcamCapture
          onCapture={handleWebcamCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      </Modal>

      {/* Generated Gate Pass Modal (Printable Slip & PDF) */}
      <Modal
        isOpen={!!successPass}
        onClose={() => setSuccessPass(null)}
        title="Visitor Pass Generated Successfully"
        maxWidth="max-w-md"
      >
        {successPass && (
          <div className="space-y-4">
            {/* The Printable Gate Pass Card */}
            <div id="printable-pass" className="p-5 bg-white border-2 border-slate-800 rounded-2xl text-center space-y-3 shadow-md">
              {/* Official ISHARWAL FEED MILL Logo at the Top */}
              <div className="flex justify-center mb-1">
                <img src="/logo.png" alt="ISHARWAL FEED MILL" className="h-14 w-auto object-contain" />
              </div>

              <div className="border-b-2 border-slate-800 pb-2">
                <h4 className="font-black text-base text-slate-900 tracking-tight">ISHARWAL FEED MILL</h4>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-extrabold">Factory Visitor Gate Pass</p>
              </div>

              {/* Date & Time */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Entry Date & Time</p>
                <p className="font-mono font-bold text-sm text-slate-800 mt-0.5">
                  {new Date(successPass.in_time).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>

              {/* Visitor Photo & Details Grid */}
              <div className="flex items-start gap-3 text-left pt-1">
                {successPass.photo_url ? (
                  <img
                    src={successPass.photo_url}
                    alt="Visitor"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                )}

                <div className="text-xs space-y-1 min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{successPass.name}</p>
                  <p className="font-mono text-slate-600 text-[11px]">{successPass.mobile}</p>
                  <p className="text-slate-600 text-[11px] truncate">{successPass.company_name || 'Individual'}</p>
                </div>
              </div>

              {/* Visit Details Table */}
              <div className="text-left text-xs space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Department:</span> <span className="font-bold text-slate-800">{successPass.department_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Whom to Meet:</span> <span className="font-bold text-brand-700">{successPass.host_employee_name || formData.custom_host_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Purpose:</span> <span className="text-slate-700 truncate max-w-[200px]">{successPass.purpose}</span></div>
                {successPass.vehicle_number && (
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Vehicle No:</span> <span className="font-mono uppercase font-bold text-slate-800">{successPass.vehicle_number}</span></div>
                )}
                {successPass.material_details && (
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Belongings:</span> <span className="text-slate-700 truncate max-w-[200px]">{successPass.material_details}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Security Officer:</span> <span className="text-slate-800 font-semibold">{successPass.guard_name || user?.name || 'Main Gate'}</span></div>
              </div>

              {/* Signatures & Stamp */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-[9px] text-slate-500">
                <div className="border-t border-dashed border-slate-400 pt-1">
                  Visitor Signature
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  Host Signature
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  Security Stamp
                </div>
              </div>

              <div className="text-[9px] text-slate-400 pt-1 font-semibold">
                * Please return this pass at security gate upon departure.
              </div>
            </div>

            {/* Print and Done Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDirectPrint}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4 text-brand-400" />
                <span>Print Gate Pass</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessPass(null);
                  resetForm();
                  navigate('/visitors');
                }}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
