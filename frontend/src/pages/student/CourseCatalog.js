import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Users, 
  Calendar, 
  BookOpen, 
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { studentService } from '../../services/api';

const CourseCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryClient = useQueryClient();

  // Fetch courses
  const { data: coursesResponse, isLoading, error } = useQuery(
    ['studentCourses', { search: searchTerm, department: selectedDepartment, page: currentPage }],
    () => studentService.getCourses({
      search: searchTerm || undefined,
      department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
      page: currentPage,
      limit: 12
    }),
    {
      onError: (error) => {
        console.error('Courses API Error:', error);
        toast.error('Failed to load courses');
      },
    }
  );

  const courses = coursesResponse?.data?.data || [];
  const pagination = coursesResponse?.data?.pagination || {};

  // Enroll in course mutation
  const enrollMutation = useMutation(
    (courseId) => studentService.enrollInCourse(courseId),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['studentCourses']);
        queryClient.invalidateQueries(['studentDashboard']);
        toast.success(`Successfully enrolled in ${response.data.courseTitle}!`);
      },
      onError: (error) => {
        console.error('Enrollment error:', error);
        const message = error.response?.data?.message || 'Failed to enroll in course';
        toast.error(message);
      }
    }
  );

  const handleEnroll = (courseId) => {
    enrollMutation.mutate(courseId);
  };

  const getAvailabilityStatus = (course) => {
    switch (course.availability_status) {
      case 'enrolled':
        return { text: 'Enrolled', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'full':
        return { text: 'Full', color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'ended':
        return { text: 'Ended', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
      default:
        return { text: 'Available', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
    }
  };

  const getEnrollButton = (course) => {
    const status = getAvailabilityStatus(course);
    const Icon = status.icon;

    if (course.availability_status === 'enrolled') {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-md cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Icon className="h-4 w-4" />
          <span>Enrolled</span>
        </button>
      );
    }

    if (course.availability_status === 'full') {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-md cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Icon className="h-4 w-4" />
          <span>Course Full</span>
        </button>
      );
    }

    if (course.availability_status === 'ended') {
      return (
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-md cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Icon className="h-4 w-4" />
          <span>Course Ended</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => handleEnroll(course.id)}
        disabled={enrollMutation.isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {enrollMutation.isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>Enroll Now</span>
          </>
        )}
      </button>
    );
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Catalog</h1>
          <p className="text-gray-600">Browse and enroll in available courses</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Course Catalog</h1>
        <p className="text-gray-600">Browse and enroll in available courses</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedDepartment}
                  onChange={handleDepartmentChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {pagination.total} courses found
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Courses Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedDepartment !== 'all' 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No courses are currently available for enrollment.'
                }
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const status = getAvailabilityStatus(course);
            const StatusIcon = status.icon;
            
            return (
              <div key={course.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">{course.course_code}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} flex items-center space-x-1`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{status.text}</span>
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span>Instructor: {course.instructor_first_name} {course.instructor_last_name}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{course.current_students}/{course.max_students} students</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{course.credits} credits</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Starts: {new Date(course.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {course.department && (
                    <div className="mb-4">
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {course.department}
                      </span>
                    </div>
                  )}

                  {getEnrollButton(course)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} courses
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                  disabled={currentPage === pagination.pages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCatalog;
