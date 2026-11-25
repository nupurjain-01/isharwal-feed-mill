import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeAlert, setActiveAlert] = useState(null);

  // Fetch initial notifications
  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getAll();
      if (res.data.success) {
        setNotifications(res.data.notifications);
        const unread = res.data.notifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.log('Failed to load notifications:', err.message);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [isAuthenticated]);

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Connect Socket
  useEffect(() => {
    if (!isAuthenticated) return;

    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[Socket.io] Connected to server:', newSocket.id);
      if (user?.employee_id) {
        newSocket.emit('join_employee_room', user.employee_id);
      }
    });

    // Targeted notification for employee
    newSocket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      triggerNotificationAlert(notif.title, notif.message);
    });

    // Global visitor arrival alert (for security / admin desks)
    newSocket.on('global_visitor_alert', (data) => {
      const { visitor } = data;
      const title = `🚨 New Visitor Arrival at Gate: ${visitor.visitorName}`;
      const message = `${visitor.visitorName} (${visitor.companyName || 'Individual'}) to meet ${visitor.purpose}`;
      
      setActiveAlert({
        title,
        message,
        visitorId: visitor.visitorId,
        time: new Date().toLocaleTimeString()
      });

      // Auto dismiss after 8 seconds
      setTimeout(() => setActiveAlert(null), 8000);

      // Play soft notification beep
      playAudioNotification();

      // Trigger browser push notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.employee_id]);

  const triggerNotificationAlert = (title, message) => {
    playAudioNotification();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };

  const playAudioNotification = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: loadNotifications
      }}
    >
      {children}

      {/* Floating Real-Time Visitor Alert Toast Banner */}
      {activeAlert && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full bg-slate-900 border-l-4 border-brand-500 text-white p-4 rounded-xl shadow-2xl animate-bounce-once flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
            <span className="text-xl">🔔</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{activeAlert.title}</h4>
              <span className="text-xs text-slate-400">{activeAlert.time}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">{activeAlert.message}</p>
            <div className="mt-2 text-xs font-mono bg-slate-800 px-2 py-0.5 rounded inline-block text-brand-300">
              Pass ID: {activeAlert.visitorId}
            </div>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ×
          </button>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
