import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  CalendarClock,
  Building2,
  Users,
  FileSpreadsheet,
  Shield,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new-visitor', label: 'New Visitor Entry', icon: UserPlus },
    { to: '/visitors', label: 'Visitor Records', icon: ClipboardList },
    { to: '/expected-visitors', label: 'Expected Visitors', icon: CalendarClock },
    { to: '/departments', label: 'Departments', icon: Building2 },
    { to: '/employees', label: 'Employees', icon: Users },
    { to: '/reports', label: 'Reports & Analytics', icon: FileSpreadsheet },
    ...(isAdmin ? [{ to: '/users', label: 'User Management', icon: Shield }] : []),
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-gradient-to-b from-[#021836] via-[#01142B] to-[#000D1C] text-slate-200 flex flex-col transition-transform duration-300 ease-in-out border-r border-blue-950/50 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Official Isharwal Feed Mill Logo Header Card */}
        <div className="p-4">
          <div className="bg-white p-3.5 rounded-2xl shadow-md flex items-center justify-center mb-3 transition-transform hover:scale-[1.01]">
            <img
              src="/logo.png"
              alt="Isharwal Feed Mill Logo"
              className="h-16 w-auto max-w-[210px] object-contain"
            />
          </div>
          <div className="text-center px-1">
            <h1 className="font-black text-white text-[12px] tracking-wider uppercase">
              ISHARWAL FEED MILL
            </h1>
            <p className="text-[10px] text-[#0C8DE9] font-black tracking-widest uppercase mt-0.5">
              GATE ENTRY SYSTEM
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1.5 custom-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#0C8DE9] text-white shadow-lg shadow-[#0C8DE9]/35 font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Security Gate 1 Status & Logout Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0C8DE9]/20 border border-[#0C8DE9]/30 flex items-center justify-center text-[#0C8DE9] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Security Gate 1</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ONLINE</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
