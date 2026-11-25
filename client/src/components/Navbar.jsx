import React, { useState, useEffect } from 'react';
import { Menu, Bell, Check, Clock, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar({ onToggleSidebar, title = 'Executive Gate Dashboard' }) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).toLowerCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 leading-tight tracking-tight">{title}</h2>
          <span className="text-[11px] text-slate-500 font-semibold">ISHARWAL FEED MILL – Main Gate</span>
        </div>
      </div>

      {/* Right: Date, Time & Security Gate Pills */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Date Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[#F1F5F9] text-slate-700 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#0C8DE9]" />
          <span>{formattedDate}</span>
        </div>

        {/* Time Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[#F1F5F9] text-slate-700 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
          <Clock className="w-3.5 h-3.5 text-[#0C8DE9]" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </header>
  );
}
