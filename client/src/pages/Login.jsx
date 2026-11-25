import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@isharwalfeedmill.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-800/20 p-8 sm:p-10">
        {/* Official Brand Header with Isharwal Feed Mill Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[210px]">
              <img
                src="/logo.png"
                alt="Isharwal Feed Mill Logo"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ISHARWAL FEED MILL</h1>
          <p className="text-xs font-bold text-brand-600 tracking-widest uppercase mt-0.5">
            Gate Entry Management System
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Factory Security Desk & Visitor Access Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@isharwalfeedmill.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-800 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Database...</span>
              </>
            ) : (
              <>
                <span>Sign In to Gate System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
