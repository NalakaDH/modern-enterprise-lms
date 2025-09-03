import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
export const authAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create separate instance for other API calls
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authService = {
  login: (credentials) => authAPI.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  verifyToken: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

// User API calls
export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  toggleUserStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  getUserStats: () => api.get('/users/stats/overview'),
};

// Course API calls
export const courseService = {
  getCourses: (params) => api.get('/courses', { params }),
  getCourse: (id) => api.get(`/courses/${id}`),
  createCourse: (courseData) => api.post('/courses', courseData),
  updateCourse: (id, courseData) => api.put(`/courses/${id}`, courseData),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  getCourseStats: (id) => api.get(`/courses/${id}/stats`),
};

// Enrollment API calls
export const enrollmentService = {
  getEnrollments: (params) => api.get('/enrollments', { params }),
  getStudentEnrollments: (studentId) => api.get(`/enrollments/student/${studentId}`),
  getCourseEnrollments: (courseId) => api.get(`/enrollments/course/${courseId}`),
  enrollStudent: (enrollmentData) => api.post('/enrollments', enrollmentData),
  dropStudent: (enrollmentId) => api.delete(`/enrollments/${enrollmentId}`),
  updateEnrollmentStatus: (enrollmentId, status) => api.patch(`/enrollments/${enrollmentId}/status`, { status }),
  updateFinalGrade: (enrollmentId, grade) => api.patch(`/enrollments/${enrollmentId}/grade`, { final_grade: grade }),
};

// Result API calls
export const resultService = {
  getResults: (params) => api.get('/results', { params }),
  getStudentResults: (studentId) => api.get(`/results/student/${studentId}`),
  getAssessmentResults: (assessmentId) => api.get(`/results/assessment/${assessmentId}`),
  submitAssessment: (assessmentId) => api.post('/results/submit', { assessment_id: assessmentId }),
  gradeAssessment: (resultId, gradeData) => api.put(`/results/${resultId}/grade`, gradeData),
  getResult: (id) => api.get(`/results/${id}`),
};

// Admin API calls
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', { settings }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Instructor API calls
export const instructorService = {
  getDashboard: () => api.get('/instructor/dashboard'),
  getCourses: (params) => api.get('/instructor/courses', { params }),
  getCourseStudents: (courseId) => api.get(`/instructor/courses/${courseId}/students`),
  getPendingGrading: (params) => api.get('/instructor/pending-grading', { params }),
  getCourseMaterials: (courseId) => api.get(`/instructor/courses/${courseId}/materials`),
  uploadCourseMaterial: (courseId, materialData) => api.post(`/instructor/courses/${courseId}/materials`, materialData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getCourseAssignments: (courseId) => api.get(`/instructor/courses/${courseId}/assignments`),
  createAssignment: (courseId, assignmentData) => api.post(`/instructor/courses/${courseId}/assignments`, assignmentData),
  getCourseSubmissions: (courseId) => api.get(`/instructor/courses/${courseId}/submissions`),
  gradeSubmission: (submissionId, gradeData) => api.put(`/instructor/submissions/${submissionId}/grade`, gradeData),
};

// Student API calls
export const studentService = {
  getDashboard: () => api.get('/student/dashboard'),
  getCourses: (params) => api.get('/student/courses', { params }),
  getAvailableCourses: (params) => api.get('/student/available-courses', { params }),
  enrollInCourse: (courseId) => api.post(`/student/enroll/${courseId}`),
  getCourseMaterials: (courseId) => api.get(`/student/courses/${courseId}/materials`),
  getCourseAssessments: (courseId) => api.get(`/student/courses/${courseId}/assessments`),
  submitAssignment: (courseId, assignmentId, submissionData) => api.post(`/student/courses/${courseId}/assignments/${assignmentId}/submit`, submissionData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export default api;
