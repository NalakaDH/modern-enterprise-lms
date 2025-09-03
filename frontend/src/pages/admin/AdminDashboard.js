import React from 'react';
import { useQuery } from 'react-query';
import { adminService } from '../../services/api';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  TrendingUp, 
  UserPlus, 
  BookOpenIcon,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Settings,
  UserCheck,
  Calendar
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', change, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {change && (
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-gray-500 ml-2">from last month</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { data: dashboardResponse, isLoading, error } = useQuery(
    'adminDashboard',
    adminService.getDashboard,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      onError: (error) => {
        console.error('Dashboard API Error:', error);
      }
    }
  );
  
  // Extract dashboard data from response
  const dashboardData = dashboardResponse?.data?.data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Dashboard</h1>
        <p className="text-gray-600 mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  const { users, courses, enrollments, recentUsers, recentCourses } = dashboardData || {};

  // Debug logging
  console.log('Dashboard Response:', dashboardResponse);
  console.log('Dashboard Data:', dashboardData);
  console.log('Users:', users);
  console.log('Courses:', courses);

  // Calculate totals - users is an array of {role, total, active}
  const totalUsers = users?.reduce((sum, user) => sum + (user.total || 0), 0) || 0;
  const activeUsers = users?.reduce((sum, user) => sum + (user.active || 0), 0) || 0;
  const totalEnrollments = enrollments?.reduce((sum, enrollment) => sum + (enrollment.count || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Welcome back! Here's what's happening with your system today.</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Key Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Overview</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={totalUsers}
              subtitle="All registered users"
              icon={Users}
              color="blue"
              change={12}
            />
            <StatCard
              title="Active Users"
              value={activeUsers}
              subtitle="Currently online"
              icon={UserCheck}
              color="green"
              change={8}
            />
            <StatCard
              title="Total Courses"
              value={courses?.total_courses || 0}
              subtitle="Available courses"
              icon={BookOpen}
              color="purple"
              change={5}
            />
            <StatCard
              title="Total Enrollments"
              value={totalEnrollments}
              subtitle="Student enrollments"
              icon={GraduationCap}
              color="indigo"
              change={15}
            />
          </div>
        </div>

        {/* User Breakdown */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">User Breakdown</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {users?.map((user) => (
                  <div key={user.role} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{user.role}s</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{user.total}</p>
                    <p className="text-sm text-gray-500 mt-1">{user.active} active</p>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(user.active / user.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activities</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">New Users</h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    Last 7 days
                  </div>
                </div>
                <div className="space-y-4">
                  {recentUsers?.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Courses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">New Courses</h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Last 7 days
                  </div>
                </div>
                <div className="space-y-4">
                  {recentCourses?.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                          <BookOpenIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {course.course_code} - {course.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Instructor: {course.first_name} {course.last_name}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {new Date(course.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <a
              href="/admin/users"
              className="group relative bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Manage Users
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Create, update, and manage user accounts
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <span className="text-gray-400 group-hover:text-blue-600">→</span>
                  </div>
                </div>
              </div>
            </a>

            <a
              href="/admin/courses"
              className="group relative bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    Manage Courses
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Create and manage course offerings
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                    <span className="text-gray-400 group-hover:text-green-600">→</span>
                  </div>
                </div>
              </div>
            </a>

            <a
              href="/admin/settings"
              className="group relative bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    System Settings
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure system-wide parameters
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <span className="text-gray-400 group-hover:text-purple-600">→</span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
