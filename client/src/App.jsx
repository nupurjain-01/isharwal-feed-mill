import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewVisitor from './pages/NewVisitor';
import VisitorRecords from './pages/VisitorRecords';
import ExpectedVisitors from './pages/ExpectedVisitors';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-semibold">
        Initializing UMAX Security Portal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Layout
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/': return 'Executive Gate Dashboard';
      case '/new-visitor': return 'New Visitor Registration';
      case '/visitors': return 'Visitor Entry & Exit Register';
      case '/expected-visitors': return 'Expected Visitors Pre-Register';
      case '/departments': return 'Department Directory';
      case '/employees': return 'Employee Directory';
      case '/reports': return 'Reports & Bulk Excel Center';
      case '/users': return 'System User Management';
      case '/settings': return 'Gate Configuration & Settings';
      default: return 'UMAX Packaging Gate System';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title={getPageTitle(location.pathname)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-visitor" element={<NewVisitor />} />
            <Route path="/visitors" element={<VisitorRecords />} />
            <Route path="/expected-visitors" element={<ExpectedVisitors />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
