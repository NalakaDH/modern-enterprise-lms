import React from 'react';
import { useQuery } from 'react-query';
import { instructorService } from '../../services/api';
import { BookOpen, Users, ClipboardList, Clock, TrendingUp, CheckSquare, AlertCircle, Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
  <div className="bg-white/80 backdrop-blur-sm overflow-hidden shadow-lg rounded-xl border border-gray-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
    <div className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-xl bg-gradient-to-r from-${color}-50 to-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
        <div className="ml-4 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-bold text-gray-900 mt-1">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const InstructorDashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery(
    'instructorDashboard',
    instructorService.getDashboard,
    {
      refetchInterval: 30000,
      onSuccess: (data) => {
        console.log('Instructor Dashboard API Response:', data);
      },
      onError: (error) => {
        console.error('Instructor Dashboard API Error:', error);
      }
    }
  );

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

  // Extract data from API response (similar to student dashboard fix)
  const apiData = dashboardData?.data?.data || dashboardData?.data || {};
  const { 
    courses, 
    totalStudents, 
    pendingGrading, 
    recentAnnouncements,
    recentSubmissions,
    upcomingDueDates,
    courseStats
  } = apiData;

  // Debug logging
  console.log('=== INSTRUCTOR DASHBOARD DEBUG ===');
  console.log('Full API Response:', dashboardData);
  console.log('Response Data:', dashboardData?.data);
  console.log('API Data (extracted):', apiData);
  console.log('Extracted dashboard data:', {
    courses,
    totalStudents,
    pendingGrading,
    recentAnnouncements,
    recentSubmissions,
    upcomingDueDates,
    courseStats
  });
  console.log('=== END DEBUG ===');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Instructor Dashboard
        </h1>
        <p className="text-gray-600 mt-2 text-lg">Manage your courses and track student progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Courses"
          value={courses?.length || 0}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Total Students"
          value={totalStudents || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Pending Grading"
          value={pendingGrading || 0}
          icon={ClipboardList}
          color="red"
        />
        <StatCard
          title="Recent Submissions"
          value={recentSubmissions?.length || 0}
          icon={CheckSquare}
          color="orange"
        />
      </div>

      {/* My Courses */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">My Courses</h3>
            <a
              href="/instructor/courses"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses && courses.length > 0 ? courses.slice(0, 6).map((course) => {
              const courseStat = courseStats?.find(stat => stat.id === course.id);
              return (
                <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{course.course_code}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      course.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{course.title}</p>
                  
                  {/* Course Statistics */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      {courseStat?.enrolled_students || 0} students
                    </div>
                    <div className="flex items-center text-gray-500">
                      <ClipboardList className="h-3 w-3 mr-1" />
                      {courseStat?.total_assignments || 0} assignments
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(course.start_date).toLocaleDateString()} - {new Date(course.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Courses</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any active courses assigned yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Submissions</h3>
            <a
              href="/instructor/courses"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </a>
          </div>
          <div className="flow-root">
            {recentSubmissions && recentSubmissions.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {recentSubmissions.slice(0, 5).map((submission) => (
                  <li key={submission.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          submission.status === 'late' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {submission.status === 'late' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {submission.assignment_title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {submission.course_code} - {submission.first_name} {submission.last_name}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(new Date(submission.submission_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {submission.total_marks} marks
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Recent Submissions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Student submissions will appear here once they submit assignments.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Due Dates */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Due Dates</h3>
            <a
              href="/instructor/courses"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </a>
          </div>
          <div className="flow-root">
            {upcomingDueDates && upcomingDueDates.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {upcomingDueDates.slice(0, 5).map((assignment) => (
                  <li key={assignment.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-orange-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {assignment.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {assignment.course_code} - {assignment.course_title}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {assignment.submission_count} submissions
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Upcoming Due Dates</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Assignment due dates will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href="/instructor/courses"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <BookOpen className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Manage Courses
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create and manage your course content
                </p>
              </div>
            </a>

            <a
              href="/instructor/gradebook"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <ClipboardList className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Gradebook
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Grade assignments and track progress
                </p>
              </div>
            </a>

            <a
              href="/instructor/announcements"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Announcements
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Send messages to your students
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
