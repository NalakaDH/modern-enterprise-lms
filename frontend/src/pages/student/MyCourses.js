import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  BookOpen, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  ClipboardList, 
  Download,
  Eye,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  X
} from 'lucide-react';
import { studentService } from '../../services/api';

const MyCourses = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFormData, setSubmissionFormData] = useState({
    submission_text: '',
    submission_file: null
  });

  const queryClient = useQueryClient();

  // Fetch student's enrolled courses
  const { data: dashboardResponse, isLoading, error } = useQuery(
    'studentDashboard',
    studentService.getDashboard,
    {
      onError: (error) => {
        console.error('Student Dashboard API Error:', error);
        toast.error('Failed to load courses');
      },
    }
  );

  const enrolledCourses = dashboardResponse?.data?.data?.enrolledCourses || [];

  // Fetch course materials when a course is selected
  const { data: materialsResponse, isLoading: materialsLoading } = useQuery(
    ['courseMaterials', selectedCourse?.id],
    () => studentService.getCourseMaterials(selectedCourse.id),
    {
      enabled: !!selectedCourse,
      onError: (error) => {
        console.error('Course Materials API Error:', error);
      },
    }
  );

  // Fetch course assessments when a course is selected
  const { data: assessmentsResponse, isLoading: assessmentsLoading } = useQuery(
    ['courseAssessments', selectedCourse?.id],
    () => studentService.getCourseAssessments(selectedCourse.id),
    {
      enabled: !!selectedCourse,
      onError: (error) => {
        console.error('Course Assessments API Error:', error);
      },
    }
  );

  const materials = materialsResponse?.data?.data || [];
  const assessments = assessmentsResponse?.data?.data || [];

  const filteredCourses = enrolledCourses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubmissionStatus = (assessment) => {
    if (!assessment.result_status) {
      return { text: 'Not Submitted', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
    
    switch (assessment.result_status) {
      case 'submitted':
        return { text: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
      case 'graded':
        return { text: 'Graded', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'late':
        return { text: 'Late', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
      default:
        return { text: 'Not Submitted', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (material) => {
    // For now, just show a message. In a real app, you'd implement actual file download
    toast.success(`Downloading ${material.title}...`);
  };

  // Submit assignment mutation
  const submitAssignmentMutation = useMutation(
    ({ courseId, assignmentId, submissionData }) => 
      studentService.submitAssignment(courseId, assignmentId, submissionData),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['courseAssessments', selectedCourse?.id]);
        setShowSubmissionModal(false);
        setSubmissionFormData({
          submission_text: '',
          submission_file: null
        });
        setSelectedAssignment(null);
        toast.success('Assignment submitted successfully!');
      },
      onError: (error) => {
        console.error('Submit assignment error:', error);
        const message = error.response?.data?.message || 'Failed to submit assignment';
        toast.error(message);
      }
    }
  );

  // Handle submission form input changes
  const handleSubmissionFormChange = (e) => {
    const { name, value, type, files } = e.target;
    setSubmissionFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
  };

  // Handle submission form submission
  const handleSubmissionSubmit = (e) => {
    e.preventDefault();
    if (!submissionFormData.submission_text.trim() && !submissionFormData.submission_file) {
      toast.error('Please provide either text submission or upload a file');
      return;
    }

    const formData = new FormData();
    formData.append('submission_text', submissionFormData.submission_text);
    if (submissionFormData.submission_file) {
      formData.append('submission_file', submissionFormData.submission_file);
    }

    submitAssignmentMutation.mutate({
      courseId: selectedCourse.id,
      assignmentId: selectedAssignment.id,
      submissionData: formData
    });
  };

  // Handle submit assignment button click
  const handleSubmitAssignment = (assignment) => {
    console.log('handleSubmitAssignment called with:', assignment);
    setSelectedAssignment(assignment);
    setShowSubmissionModal(true);
    console.log('Modal state set to true');
    
    // Create modal using direct DOM manipulation
    setTimeout(() => {
      // Remove any existing modal
      const existingModal = document.getElementById('assignment-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // Create modal container
      const modal = document.createElement('div');
      modal.id = 'assignment-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(255, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background-color: yellow;
        border: 5px solid blue;
        padding: 20px;
        border-radius: 10px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      `;
      
      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">Submit Assignment</h3>
          <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
        </div>
        
        <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <h4 style="font-weight: 500; color: #111827; margin: 0 0 4px 0;">${assignment.title}</h4>
          <p style="font-size: 14px; color: #6b7280; margin: 0;">Due: ${new Date(assignment.due_date).toLocaleDateString()}</p>
        </div>
        
        <form id="submission-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Text Submission</label>
            <textarea id="submission-text" rows="6" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;" placeholder="Enter your assignment submission here..."></textarea>
          </div>
          
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Upload File (Optional)</label>
            <input type="file" id="submission-file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.zip" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, GIF, MP4, AVI, MOV, ZIP (Max 20MB)</p>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px;">
            <button type="button" id="cancel-btn" style="padding: 8px 16px; font-size: 14px; font-weight: 500; color: #374151; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;">Cancel</button>
            <button type="submit" id="submit-btn" style="padding: 8px 16px; font-size: 14px; font-weight: 500; color: white; background-color: #2563eb; border: none; border-radius: 6px; cursor: pointer;">Submit Assignment</button>
          </div>
        </form>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById('close-modal').onclick = () => {
        modal.remove();
        setShowSubmissionModal(false);
      };
      
      document.getElementById('cancel-btn').onclick = () => {
        modal.remove();
        setShowSubmissionModal(false);
      };
      
      document.getElementById('submission-form').onsubmit = (e) => {
        e.preventDefault();
        const text = document.getElementById('submission-text').value;
        const file = document.getElementById('submission-file').files[0];
        
        if (!text.trim() && !file) {
          alert('Please provide either text submission or upload a file');
          return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('submission_text', text);
        if (file) {
          formData.append('submission_file', file);
        }
        
        // Submit assignment
        submitAssignmentMutation.mutate({
          courseId: selectedCourse.id,
          assignmentId: assignment.id,
          submissionData: formData
        });
        
        modal.remove();
        setShowSubmissionModal(false);
      };
      
      console.log('Modal created and added to DOM');
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600">View and manage your enrolled courses</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Course Detail View
  if (selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedCourse(null)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Courses</span>
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h1>
          <p className="text-gray-600">{selectedCourse.course_code} • {selectedCourse.credits} credits</p>
        </div>

        {/* Course Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Instructor</p>
                <p className="text-lg font-bold text-blue-900">
                  {selectedCourse.instructor_first_name} {selectedCourse.instructor_last_name}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Start Date</p>
                <p className="text-lg font-bold text-green-900">
                  {new Date(selectedCourse.start_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">End Date</p>
                <p className="text-lg font-bold text-purple-900">
                  {new Date(selectedCourse.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">Enrolled</p>
                <p className="text-lg font-bold text-orange-900">
                  {new Date(selectedCourse.enrollment_date).toLocaleDateString()}
                </p>
              </div>
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
                { id: 'assignments', name: 'Assignments', icon: ClipboardList }
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Course Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Course Information</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><span className="font-medium">Department:</span> {selectedCourse.department}</p>
                        <p><span className="font-medium">Credits:</span> {selectedCourse.credits}</p>
                        <p><span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                            selectedCourse.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedCourse.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Progress Summary</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><span className="font-medium">Materials:</span> {materials.length} available</p>
                        <p><span className="font-medium">Assignments:</span> {assessments.length} total</p>
                        <p><span className="font-medium">Submitted:</span> {assessments.filter(a => a.result_status === 'submitted' || a.result_status === 'graded').length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Materials Tab */}
            {activeTab === 'materials' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Course Materials</h3>
                  <span className="text-sm text-gray-500">{materials.length} materials</span>
                </div>

                {materialsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Materials Available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your instructor hasn't uploaded any materials yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {materials.map((material) => (
                      <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <FileText className="h-5 w-5 text-blue-600" />
                              <h4 className="text-lg font-medium text-gray-900">{material.title}</h4>
                              {material.is_required && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  Required
                                </span>
                              )}
                            </div>
                            {material.description && (
                              <p className="text-sm text-gray-600 mb-3">{material.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Type: {material.material_type}</span>
                              <span>Size: {formatFileSize(material.file_size)}</span>
                              <span>Uploaded: {new Date(material.upload_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(material)}
                              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Assignments & Assessments</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{assessments.length} assessments</span>
                    <button 
                      onClick={() => {
                        console.log('Test button clicked');
                        setSelectedAssignment({ 
                          id: 999, 
                          title: 'Test Assignment', 
                          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
                        });
                        setShowSubmissionModal(true);
                      }}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Test Modal
                    </button>
                  </div>
                </div>

                {assessmentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Assignments Available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your instructor hasn't created any assignments yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {assessments.map((assessment) => {
                      const status = getSubmissionStatus(assessment);
                      const StatusIcon = status.icon;
                      const isOverdue = new Date(assessment.due_date) < new Date() && !assessment.result_status;
                      
                      // Debug logging
                      console.log('Assessment:', assessment.title, {
                        result_status: assessment.result_status,
                        due_date: assessment.due_date,
                        isOverdue: isOverdue,
                        showSubmitButton: !assessment.result_status && !isOverdue
                      });
                      
                      return (
                        <div key={assessment.id} className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
                          isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <ClipboardList className="h-5 w-5 text-green-600" />
                                <h4 className="text-lg font-medium text-gray-900">{assessment.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} flex items-center space-x-1`}>
                                  <StatusIcon className="h-3 w-3" />
                                  <span>{status.text}</span>
                                </span>
                              </div>
                              {assessment.description && (
                                <p className="text-sm text-gray-600 mb-3">{assessment.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-gray-500">Total Marks</p>
                              <p className="font-medium text-gray-900">{assessment.total_marks}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Weight</p>
                              <p className="font-medium text-gray-900">{assessment.weight_percentage}%</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Due Date</p>
                              <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                {new Date(assessment.due_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Your Score</p>
                              {assessment.marks_obtained !== null ? (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {assessment.marks_obtained}/{assessment.total_marks}
                                  </p>
                                  <p className="text-sm text-green-600 font-medium">
                                    {((assessment.marks_obtained / assessment.total_marks) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              ) : (
                                <p className="font-medium text-gray-500">Not Graded</p>
                              )}
                            </div>
                          </div>

                          {assessment.instructions && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-md">
                              <p className="text-sm text-gray-500 mb-1">Instructions:</p>
                              <p className="text-sm text-gray-700">{assessment.instructions}</p>
                            </div>
                          )}

                          {assessment.feedback && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <p className="text-sm font-medium text-green-800">Instructor Feedback:</p>
                              </div>
                              <p className="text-sm text-gray-700">{assessment.feedback}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-end space-x-3">
                            {!assessment.result_status && !isOverdue ? (
                              <button 
                                onClick={() => {
                                  console.log('Submit button clicked for:', assessment.title);
                                  handleSubmitAssignment(assessment);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                style={{
                                  backgroundColor: 'red',
                                  color: 'white',
                                  padding: '10px 20px',
                                  border: '2px solid yellow',
                                  borderRadius: '5px',
                                  fontSize: '16px',
                                  fontWeight: 'bold'
                                }}
                              >
                                🔥 SUBMIT ASSIGNMENT 🔥
                              </button>
                            ) : (
                              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                                {assessment.result_status ? 'View Submission' : 'Assignment Overdue'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Course List View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-600">View and manage your enrolled courses</p>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
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
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {filteredCourses.length} enrolled courses
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No courses found' : 'No enrolled courses'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'You haven\'t enrolled in any courses yet. Visit the Course Catalog to enroll.'
                }
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div 
              key={course.id} 
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCourse(course)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">{course.course_code}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    course.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {course.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    <span>Instructor: {course.instructor_first_name} {course.instructor_last_name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{course.credits} credits</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Enrolled: {new Date(course.enrollment_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Click to view details</span>
                  <div className="flex items-center text-blue-600">
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="text-sm">View Course</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


    </div>
  );
};

export default MyCourses;
