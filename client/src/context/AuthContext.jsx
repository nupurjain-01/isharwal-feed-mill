import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ifm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ifm_auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authService.getMe();
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('ifm_user', JSON.stringify(res.data.user));
          }
        } catch (error) {
          console.error('Session expired or invalid:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('ifm_auth_token', newToken);
      localStorage.setItem('ifm_user', JSON.stringify(newUser));
      return { success: true };
    }
    return { success: false, message: res.data.message };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ifm_auth_token');
    localStorage.removeItem('ifm_user');
  };

  const isAdmin = user?.role === 'admin';
  const isReceptionist = user?.role === 'receptionist';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin,
        isReceptionist,
        isEmployee,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
