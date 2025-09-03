import React from 'react';
import { useQuery } from 'react-query';
import { studentService } from '../../services/api';
import { BookOpen, Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react';
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

const StudentDashboard = () => {
  const { data: dashboardData, isLoading, error } = useQuery(
    'studentDashboard',
    studentService.getDashboard,
    {
      refetchInterval: 30000,
      onSuccess: (data) => {
        console.log('Dashboard API Response:', data);
      },
      onError: (error) => {
        console.error('Dashboard API Error:', error);
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

  // The API response structure is: { success: true, data: { enrolledCourses, ... } }
  // But axios wraps it in another data property, so we need: response.data.data
  const apiData = dashboardData?.data?.data || dashboardData?.data || {};
  const { enrolledCourses, upcomingAssessments, recentResults, recentAnnouncements } = apiData;
  
  // Debug logging
  console.log('=== STUDENT DASHBOARD DEBUG ===');
  console.log('Full API Response:', dashboardData);
  console.log('Response Data:', dashboardData?.data);
  console.log('API Data (extracted):', apiData);
  console.log('Extracted dashboard data:', {
    enrolledCourses,
    upcomingAssessments,
    recentResults,
    recentAnnouncements
  });
  console.log('Array lengths:', {
    enrolledCoursesLength: enrolledCourses?.length,
    upcomingAssessmentsLength: upcomingAssessments?.length,
    recentResultsLength: recentResults?.length,
    recentAnnouncementsLength: recentAnnouncements?.length
  });
  console.log('=== END DEBUG ===');

  // Calculate average grade
  const calculateAverageGrade = () => {
    if (!recentResults || recentResults.length === 0) {
      return 'N/A';
    }
    
    const totalMarks = recentResults.reduce((sum, result) => {
      const percentage = (result.marks_obtained / result.total_marks) * 100;
      return sum + percentage;
    }, 0);
    
    const average = totalMarks / recentResults.length;
    return `${average.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Student Dashboard
        </h1>
        <p className="text-gray-600 mt-2 text-lg">Your learning progress and upcoming activities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Courses"
          value={enrolledCourses?.length || 0}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Upcoming Assessments"
          value={upcomingAssessments?.length || 0}
          icon={Calendar}
          color="red"
        />
        <StatCard
          title="Completed Assessments"
          value={recentResults?.length || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Average Grade"
          value={calculateAverageGrade()}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Enrolled Courses */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">My Courses</h3>
            <a
              href="/student/courses"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses && enrolledCourses.length > 0 ? enrolledCourses.slice(0, 6).map((course) => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{course.course_code}</h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {course.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{course.title}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Instructor: {course.instructor_first_name} {course.instructor_last_name}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{course.credits} credits</span>
                  <span>{course.department}</span>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Enrolled Courses</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't enrolled in any courses yet. Visit the Course Catalog to enroll.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Assessments */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Assessments</h3>
            <a
              href="/student/assessments"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </a>
          </div>
          <div className="flow-root">
            {upcomingAssessments && upcomingAssessments.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {upcomingAssessments.slice(0, 5).map((assessment) => (
                <li key={assessment.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {assessment.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {assessment.course_code} - {assessment.course_title}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(assessment.due_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Upcoming Assessments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any upcoming assessments at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Results */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Results</h3>
          <div className="flow-root">
            {recentResults && recentResults.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {recentResults.slice(0, 5).map((result) => (
                <li key={result.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.assessment_title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {result.course_code} - {result.course_title}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm">
                      <span className="font-medium text-gray-900">
                        {result.marks_obtained}/{result.total_marks}
                      </span>
                      <p className="text-gray-500">
                        {format(new Date(result.graded_date), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Results Yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your assessment results will appear here once they are graded.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Announcements</h3>
          <div className="flow-root">
            {recentAnnouncements && recentAnnouncements.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {recentAnnouncements.slice(0, 3).map((announcement) => (
                <li key={announcement.id} className="py-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        announcement.priority === 'high' ? 'bg-red-100' :
                        announcement.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-xs font-medium ${
                          announcement.priority === 'high' ? 'text-red-600' :
                          announcement.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          {announcement.priority?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {announcement.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {announcement.course_code ? `${announcement.course_code} - ` : ''}
                        {announcement.course_title || 'System Announcement'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {format(new Date(announcement.published_at), 'MMM dd')}
                    </div>
                  </div>
                </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
                  <span className="text-2xl">📢</span>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Announcements</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No recent announcements at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
