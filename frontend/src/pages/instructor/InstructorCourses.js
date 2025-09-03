import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { BookOpen, Search, Users, Calendar, Clock, GraduationCap, FileText, ClipboardList, Brain, Plus, Upload, Edit, Trash2, X, CheckSquare, Star } from 'lucide-react';
import { instructorService } from '../../services/api';

const InstructorCourses = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    material_type: 'document',
    is_required: false,
    file: null
  });
  const [assignmentFormData, setAssignmentFormData] = useState({
    title: '',
    description: '',
    total_marks: '',
    weight_percentage: '',
    due_date: '',
    instructions: ''
  });
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingFormData, setGradingFormData] = useState({
    marks_obtained: '',
    feedback: ''
  });

  const queryClient = useQueryClient();

  // Fetch instructor's courses
  const { data: coursesResponse, isLoading, error } = useQuery(
    ['instructorCourses', { search: searchTerm }],
    () => instructorService.getCourses({ search: searchTerm }),
    {
      onError: (error) => {
        console.error('Instructor Courses API Error:', error);
      },
    }
  );
  
  // Extract courses data from response
  const courses = coursesResponse?.data?.data || [];

  // Fetch course materials when a course is selected
  const { data: materialsResponse, isLoading: materialsLoading } = useQuery(
    ['courseMaterials', selectedCourse?.id],
    () => instructorService.getCourseMaterials(selectedCourse.id),
    {
      enabled: !!selectedCourse,
      onError: (error) => {
        console.error('Course Materials API Error:', error);
      },
    }
  );
  
  const materials = materialsResponse?.data?.data || [];

  // Fetch course assignments when a course is selected
  const { data: assignmentsResponse, isLoading: assignmentsLoading } = useQuery(
    ['courseAssignments', selectedCourse?.id],
    () => instructorService.getCourseAssignments(selectedCourse.id),
    {
      enabled: !!selectedCourse,
      onError: (error) => {
        console.error('Course Assignments API Error:', error);
      },
    }
  );
  
  const assignments = assignmentsResponse?.data?.data || [];

  // Fetch course submissions when a course is selected
  const { data: submissionsResponse, isLoading: submissionsLoading } = useQuery(
    ['courseSubmissions', selectedCourse?.id],
    () => instructorService.getCourseSubmissions(selectedCourse.id),
    {
      enabled: !!selectedCourse,
      onError: (error) => {
        console.error('Course Submissions API Error:', error);
      },
    }
  );
  
  const submissions = submissionsResponse?.data?.data || [];

  // Upload material mutation
  const uploadMaterialMutation = useMutation(
    (materialData) => instructorService.uploadCourseMaterial(selectedCourse.id, materialData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['courseMaterials', selectedCourse?.id]);
        setShowUploadModal(false);
        setUploadFormData({
          title: '',
          description: '',
          material_type: 'document',
          is_required: false,
          file: null
        });
        toast.success('Course material uploaded successfully!');
      },
      onError: (error) => {
        console.error('Upload material error:', error);
        toast.error('Failed to upload material. Please try again.');
      }
    }
  );

  // Create assignment mutation
  const createAssignmentMutation = useMutation(
    (assignmentData) => instructorService.createAssignment(selectedCourse.id, assignmentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['courseAssignments', selectedCourse?.id]);
        setShowAssignmentModal(false);
        setAssignmentFormData({
          title: '',
          description: '',
          total_marks: '',
          weight_percentage: '',
          due_date: '',
          instructions: ''
        });
        toast.success('Assignment created successfully!');
      },
      onError: (error) => {
        console.error('Create assignment error:', error);
        toast.error('Failed to create assignment. Please try again.');
      }
    }
  );

  // Grade submission mutation
  const gradeSubmissionMutation = useMutation(
    ({ submissionId, gradeData }) => instructorService.gradeSubmission(submissionId, gradeData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['courseSubmissions', selectedCourse?.id]);
        setShowGradingModal(false);
        setGradingFormData({ marks_obtained: '', feedback: '' });
        setSelectedSubmission(null);
        toast.success('Submission graded successfully!');
      },
      onError: (error) => {
        console.error('Grade submission error:', error);
        toast.error('Failed to grade submission. Please try again.');
      }
    }
  );

  // Handle form input changes
  const handleUploadFormChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setUploadFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
  };

  // Handle form submission
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFormData.title.trim()) {
      toast.error('Please enter a title for the material');
      return;
    }
    if (!uploadFormData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('title', uploadFormData.title);
    formData.append('description', uploadFormData.description || '');
    formData.append('material_type', uploadFormData.material_type);
    formData.append('is_required', uploadFormData.is_required);
    formData.append('file', uploadFormData.file);

    uploadMaterialMutation.mutate(formData);
  };

  // Handle assignment form input changes
  const handleAssignmentFormChange = (e) => {
    const { name, value } = e.target;
    setAssignmentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle assignment form submission
  const handleAssignmentSubmit = (e) => {
    e.preventDefault();
    if (!assignmentFormData.title.trim()) {
      toast.error('Please enter a title for the assignment');
      return;
    }
    if (!assignmentFormData.total_marks || assignmentFormData.total_marks <= 0) {
      toast.error('Please enter a valid total marks value');
      return;
    }
    if (!assignmentFormData.weight_percentage || assignmentFormData.weight_percentage <= 0) {
      toast.error('Please enter a valid weight percentage');
      return;
    }
    if (!assignmentFormData.due_date) {
      toast.error('Please select a due date');
      return;
    }

    createAssignmentMutation.mutate(assignmentFormData);
  };

  // Handle grading form input changes
  const handleGradingFormChange = (e) => {
    const { name, value } = e.target;
    setGradingFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle grading form submission
  const handleGradingSubmit = (e) => {
    e.preventDefault();
    if (!gradingFormData.marks_obtained || gradingFormData.marks_obtained < 0) {
      toast.error('Please enter a valid marks value');
      return;
    }
    if (gradingFormData.marks_obtained > selectedSubmission.total_marks) {
      toast.error(`Marks cannot exceed total marks (${selectedSubmission.total_marks})`);
      return;
    }

    gradeSubmissionMutation.mutate({
      submissionId: selectedSubmission.id,
      gradeData: gradingFormData
    });
  };

  // Handle grade submission button click
  const handleGradeSubmission = (submission) => {
    setSelectedSubmission(submission);
    setGradingFormData({
      marks_obtained: submission.marks_obtained || '',
      feedback: submission.feedback || ''
    });
    setShowGradingModal(true);
  };

  // Handle publish/unpublish assignment
  const handlePublishToggle = (assignmentId, isPublished) => {
    // For now, just show a message. In a real app, you'd call the API
    toast.success(`Assignment ${isPublished ? 'published' : 'unpublished'} successfully!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Courses</h1>
        <p className="text-gray-600 mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  // If no course is selected, show course list
  if (!selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
            <p className="text-gray-600">Select a course to manage its content</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10 w-64"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {courses.length} course{courses.length !== 1 ? 's' : ''} assigned
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Courses Assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any courses assigned yet. Contact your administrator to get courses assigned.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <div 
                    key={course.id} 
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {course.course_code}
                        </h3>
                        <h4 className="text-md font-medium text-gray-700 mb-2">
                          {course.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {course.description || 'No description available'}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          <span>Students</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {course.current_students || 0} / {course.max_students || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          <span>Credits</span>
                        </div>
                        <span className="font-medium text-gray-900">{course.credits || 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Duration</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {course.start_date && course.end_date 
                            ? `${new Date(course.start_date).toLocaleDateString()} - ${new Date(course.end_date).toLocaleDateString()}`
                            : 'TBD'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Department</span>
                        <span className="text-sm font-medium text-gray-900">{course.department || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Manage Course Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Course content management interface
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSelectedCourse(null)}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Courses
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.course_code}</h1>
            <p className="text-gray-600">{selectedCourse.title}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: BookOpen },
              { id: 'materials', name: 'Materials', icon: FileText },
              { id: 'assignments', name: 'Assignments', icon: ClipboardList },
              { id: 'submissions', name: 'Submissions', icon: CheckSquare },
              { id: 'quizzes', name: 'Quizzes', icon: Brain }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Course Materials</p>
                      <p className="text-2xl font-bold text-blue-900">{materials.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ClipboardList className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Assignments</p>
                      <p className="text-2xl font-bold text-green-900">{assignments.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Brain className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Quizzes</p>
                      <p className="text-2xl font-bold text-purple-900">0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium">{selectedCourse.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Credits</p>
                    <p className="font-medium">{selectedCourse.credits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="font-medium">{selectedCourse.current_students || 0} / {selectedCourse.max_students || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedCourse.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCourse.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Course Materials</h3>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Material</span>
                </button>
              </div>
              
              {materialsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Materials Uploaded</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload course materials like PDFs, videos, and documents for your students.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {materials.map((material) => (
                    <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{material.title}</h4>
                              <p className="text-sm text-gray-500 capitalize">{material.material_type}</p>
                            </div>
                          </div>
                          {material.description && (
                            <p className="mt-2 text-sm text-gray-600">{material.description}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Uploaded: {new Date(material.upload_date).toLocaleDateString()}</span>
                            <span>Size: {(material.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            {material.is_required && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">Required</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-gray-400 hover:text-gray-600">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assignments</h3>
                <button 
                  onClick={() => setShowAssignmentModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Assignment</span>
                </button>
              </div>
              
              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Assignments Created</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create assignments for your students to complete and submit.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <ClipboardList className="h-5 w-5 text-green-600" />
                            <h4 className="text-lg font-medium text-gray-900">{assignment.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assignment.is_published 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {assignment.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          {assignment.description && (
                            <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handlePublishToggle(assignment.id, !assignment.is_published)}
                            className={`px-2 py-1 text-xs rounded ${
                              assignment.is_published 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {assignment.is_published ? 'Published' : 'Draft'}
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Total Marks</p>
                          <p className="font-medium text-gray-900">{assignment.total_marks}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Weight</p>
                          <p className="font-medium text-gray-900">{assignment.weight_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Due Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submissions</p>
                          <p className="font-medium text-gray-900">{assignment.submission_count || 0}</p>
                        </div>
                      </div>

                      {assignment.instructions && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-500 mb-1">Instructions:</p>
                          <p className="text-sm text-gray-700">{assignment.instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Student Submissions</h3>
                <div className="text-sm text-gray-500">
                  {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {submissionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Submissions Yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Student submissions will appear here once they submit their assignments.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                            <h4 className="text-lg font-medium text-gray-900">{submission.assignment_title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              submission.status === 'graded' 
                                ? 'bg-green-100 text-green-800'
                                : submission.status === 'late'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {submission.status === 'graded' ? 'Graded' : 
                               submission.status === 'late' ? 'Late' : 'Submitted'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-gray-500">Student</p>
                              <p className="font-medium text-gray-900">{submission.first_name} {submission.last_name}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Marks</p>
                              <p className="font-medium text-gray-900">{submission.total_marks}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Due Date</p>
                              <p className="font-medium text-gray-900">{new Date(submission.due_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Submitted</p>
                              <p className="font-medium text-gray-900">{new Date(submission.submission_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {submission.marks_obtained !== null && (
                            <div className="mb-4 p-3 bg-green-50 rounded-md">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-500">Grade</p>
                                  <p className="text-lg font-bold text-green-600">
                                    {submission.marks_obtained}/{submission.total_marks}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">Percentage</p>
                                  <p className="text-lg font-bold text-green-600">
                                    {((submission.marks_obtained / submission.total_marks) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              {submission.feedback && (
                                <div className="mt-3">
                                  <p className="text-sm text-gray-500 mb-1">Feedback:</p>
                                  <p className="text-sm text-gray-700">{submission.feedback}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-3">
                        {submission.status === 'graded' ? (
                          <button 
                            onClick={() => handleGradeSubmission(submission)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Update Grade</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleGradeSubmission(submission)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                          >
                            <Star className="h-4 w-4" />
                            <span>Grade Submission</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Quizzes</h3>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Quiz</span>
                </button>
              </div>
              
              <div className="text-center py-12">
                <Brain className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Quizzes Created</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create quizzes to test your students' knowledge and understanding.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Course Material</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={uploadFormData.title}
                    onChange={handleUploadFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter material title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={uploadFormData.description}
                    onChange={handleUploadFormChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter material description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material Type *
                  </label>
                  <select
                    name="material_type"
                    value={uploadFormData.material_type}
                    onChange={handleUploadFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="document">Document</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select File *
                  </label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleUploadFormChange}
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, GIF, MP4, AVI, MOV
                  </p>
                  {uploadFormData.file && (
                    <p className="mt-1 text-sm text-green-600">
                      Selected: {uploadFormData.file.name} ({(uploadFormData.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_required"
                    checked={uploadFormData.is_required}
                    onChange={handleUploadFormChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Mark as required material
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadMaterialMutation.isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    {uploadMaterialMutation.isLoading ? 'Uploading...' : 'Upload Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Assignment</h3>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={assignmentFormData.title}
                    onChange={handleAssignmentFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter assignment title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={assignmentFormData.description}
                    onChange={handleAssignmentFormChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter assignment description (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Marks *
                    </label>
                    <input
                      type="number"
                      name="total_marks"
                      value={assignmentFormData.total_marks}
                      onChange={handleAssignmentFormChange}
                      required
                      min="1"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight % *
                    </label>
                    <input
                      type="number"
                      name="weight_percentage"
                      value={assignmentFormData.weight_percentage}
                      onChange={handleAssignmentFormChange}
                      required
                      min="1"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="due_date"
                    value={assignmentFormData.due_date}
                    onChange={handleAssignmentFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    name="instructions"
                    value={assignmentFormData.instructions}
                    onChange={handleAssignmentFormChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter assignment instructions for students (optional)"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignmentModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAssignmentMutation.isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    {createAssignmentMutation.isLoading ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {showGradingModal && selectedSubmission && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Grade Submission</h3>
                <button
                  onClick={() => setShowGradingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">{selectedSubmission.assignment_title}</h4>
                <p className="text-sm text-gray-600">
                  Student: {selectedSubmission.first_name} {selectedSubmission.last_name}
                </p>
                <p className="text-sm text-gray-600">
                  Total Marks: {selectedSubmission.total_marks}
                </p>
              </div>
              
              <form onSubmit={handleGradingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks Obtained *
                  </label>
                  <input
                    type="number"
                    name="marks_obtained"
                    value={gradingFormData.marks_obtained}
                    onChange={handleGradingFormChange}
                    min="0"
                    max={selectedSubmission.total_marks}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter marks (0-${selectedSubmission.total_marks})`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <textarea
                    name="feedback"
                    value={gradingFormData.feedback}
                    onChange={handleGradingFormChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide feedback for the student..."
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGradingModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={gradeSubmissionMutation.isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    {gradeSubmissionMutation.isLoading ? 'Grading...' : 'Submit Grade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorCourses;
