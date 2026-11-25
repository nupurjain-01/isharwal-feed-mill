import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Database,
  Building,
  Shield,
  Check,
  Info,
  KeyRound,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gateName, setGateName] = useState('Main Gate 1 (Factory Entrance)');
  const [companyName, setCompanyName] = useState('ISHARWAL FEED MILL');
  
  const [saved, setSaved] = useState(false);

  // Change Login Credentials State
  const [currEmail, setCurrEmail] = useState(user?.email || 'admin@isharwalfeedmill.com');
  const [currPassword, setCurrPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!currEmail || !currPassword) {
      return setCredError('Please enter your current email and current password to verify your account.');
    }

    if (!newEmail && !newPassword) {
      return setCredError('Please provide either a new email or a new password to update.');
    }

    if (newPassword && newPassword !== confirmPassword) {
      return setCredError('New password and confirmation password do not match.');
    }

    if (newPassword && newPassword.length < 4) {
      return setCredError('New password must be at least 4 characters long.');
    }

    setCredLoading(true);
    try {
      const res = await authService.changeCredentials({
        currentEmail: currEmail.trim(),
        currentPassword: currPassword,
        newEmail: newEmail.trim() || undefined,
        newPassword: newPassword.trim() || undefined
      });

      if (res.data.success) {
        setCredSuccess(res.data.message || 'Login credentials updated successfully in PostgreSQL database!');
        setCurrPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (newEmail.trim()) {
          setCurrEmail(newEmail.trim());
          setNewEmail('');
        }
      }
    } catch (err) {
      setCredError(err.response?.data?.message || 'Failed to update credentials. Please check your current password.');
    } finally {
      setCredLoading(false);
    }
  };

  const testBrowserNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🔔 ISHARWAL FEED MILL Gate System Alert', {
          body: 'Browser desktop notifications are working properly on your computer!',
          icon: '/logo.png'
        });
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('🔔 Permission Granted!', {
              body: 'You will now receive instant desktop alerts when visitors arrive.'
            });
          } else {
            alert('Notification permission was blocked in browser settings.');
          }
        });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-600" />
            <span>Application Settings & Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure security gate parameters, audio alerts, account credentials, and automated database backups.
          </p>
        </div>

        {saved && (
          <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </span>
        )}
      </div>

      {/* Section 1: Security & Account Credentials (Change Email / Password) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-600" />
            <span>Security & Login Credentials (Change Email / Password)</span>
          </h3>
          <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
            Account Management
          </span>
        </div>

        {credSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{credSuccess}</span>
          </div>
        )}

        {credError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{credError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Current Registered Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={currEmail}
                  onChange={(e) => setCurrEmail(e.target.value)}
                  placeholder="admin@isharwalfeedmill.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrPass ? 'text' : 'password'}
                  required
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  placeholder="Enter current password to verify"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrPass(!showCurrPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                New Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new.email@isharwalfeedmill.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Leave blank to keep current email</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                New Password (Optional)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New strong password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={credLoading}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {credLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Database...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Login Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 2: Gate & Corporate Identity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-600" />
            <span>Factory & Gate Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Registered Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Gate Location</label>
              <input
                type="text"
                value={gateName}
                onChange={(e) => setGateName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Real-time Notifications & Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-600" />
            <span>Arrival Notifications & Audio</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-800">Arrival Chime / Audio Alert</p>
                <p className="text-slate-500 text-[11px]">Play a pleasant sound through PC speakers when a visitor checks in.</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-800">Windows Desktop Browser Notifications</p>
                <p className="text-slate-500 text-[11px]">Show notification banners even if the app tab is minimized.</p>
              </div>
              <button
                type="button"
                onClick={testBrowserNotification}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Send Test Alert
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: PostgreSQL Database & Automated Backups */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Database Status & Automated Backup</span>
          </h3>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Database Engine: Active & Self-Contained</span>
            </div>
            <p>Database: <strong>ifm_gate_db</strong> (Supports Zero-Config Embedded & PostgreSQL)</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Info className="w-4 h-4 text-brand-600" />
              <span>Windows Automated Backup Setup (1-Click Instructions):</span>
            </div>
            <p className="text-slate-600">
              Run <strong>backup_ifm.bat</strong> to create a complete SQL backup in <strong>C:\IFM_Backups\</strong>.
            </p>
            <pre className="p-3 bg-slate-900 text-slate-200 font-mono rounded-xl text-[11px] overflow-x-auto">
              backup_ifm.bat
            </pre>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition-all cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
