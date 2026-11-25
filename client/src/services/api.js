import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ifm_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('ifm_auth_token');
      localStorage.removeItem('ifm_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Service Functions
export const authService = {
  login: (data) => api.post('/auth/login', data),
  changeCredentials: (data) => api.post('/auth/change-credentials', data),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  toggleUser: (id) => api.put(`/auth/users/${id}/toggle`),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const employeeService = {
  getAll: (params) => api.get('/employees', { params }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const visitorService = {
  create: (data) => api.post('/visitors', data),
  getAll: (params) => api.get('/visitors', { params }),
  getById: (id) => api.get(`/visitors/${id}`),
  checkOut: (id) => api.put(`/visitors/${id}/checkout`),
  delete: (id) => api.delete(`/visitors/${id}`),
};

export const expectedVisitorService = {
  create: (data) => api.post('/expected-visitors', data),
  getAll: (params) => api.get('/expected-visitors', { params }),
  convertToCheckIn: (id, data) => api.post(`/expected-visitors/${id}/checkin`, data),
  cancel: (id) => api.put(`/expected-visitors/${id}/cancel`),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export const reportService = {
  getData: (params) => api.get('/reports/data', { params }),
  downloadExcel: (params) => {
    const query = new URLSearchParams(params).toString();
    window.open(`/api/reports/export?${query}`, '_blank');
  },
  downloadTemplate: (type) => {
    window.open(`/api/reports/templates/${type}`, '_blank');
  },
  importDepartments: (formData) => api.post('/reports/import/departments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  importEmployees: (formData) => api.post('/reports/import/employees', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  importMaster: (formData) => api.post('/reports/import/master', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const notificationService = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const uploadService = {
  uploadPhoto: (formData) => api.post('/upload/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadWebcamPhoto: (imageBase64) => api.post('/upload/webcam-photo', { imageBase64 }),
};

export default api;
