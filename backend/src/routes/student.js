const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Configure multer for assignment submission file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/assignment-submissions');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/quicktime',
    'application/zip', 'application/x-zip-compressed'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, GIF, MP4, AVI, MOV, ZIP files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Get student dashboard
router.get('/dashboard', authenticateToken, requireUser, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    // Get enrolled courses
    console.log('Fetching enrolled courses for student:', studentId);
    const enrolledCourses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.credits, c.department, 
              c.start_date, c.end_date, e.enrollment_date, e.status, e.final_grade,
              instructor.first_name as instructor_first_name, instructor.last_name as instructor_last_name
       FROM enrollments e
       INNER JOIN courses c ON e.course_id = c.id
       INNER JOIN users instructor ON c.instructor_id = instructor.id
       WHERE e.student_id = ? AND e.status IN ('active', 'enrolled', 'registered')
       ORDER BY c.start_date DESC`,
      [studentId]
    );
    console.log('Enrolled courses query result:', enrolledCourses);

    // Get upcoming assessments
    console.log('Fetching upcoming assessments for student:', studentId);
    const upcomingAssessments = await db.query(
      `SELECT a.id, a.title, a.assessment_type, a.due_date, a.total_marks,
              c.course_code, c.title as course_title,
              sr.status as submission_status, sr.marks_obtained
       FROM assessments a
       INNER JOIN courses c ON a.course_id = c.id
       INNER JOIN enrollments e ON c.id = e.course_id
       LEFT JOIN student_results sr ON a.id = sr.assessment_id AND sr.student_id = ?
       WHERE e.student_id = ? AND e.status IN ('active', 'enrolled', 'registered') AND a.is_published = true
       AND a.due_date > NOW()
       ORDER BY a.due_date ASC
       LIMIT 10`,
      [studentId, studentId]
    );
    console.log('Upcoming assessments query result:', upcomingAssessments);

    // Get recent results
    console.log('Fetching recent results for student:', studentId);
    const recentResults = await db.query(
      `SELECT sr.id, sr.marks_obtained, sr.feedback, sr.graded_date, sr.status,
              a.title as assessment_title, a.assessment_type, a.total_marks,
              c.course_code, c.title as course_title
       FROM student_results sr
       INNER JOIN assessments a ON sr.assessment_id = a.id
       INNER JOIN courses c ON a.course_id = c.id
       WHERE sr.student_id = ? AND sr.status = 'graded'
       ORDER BY sr.graded_date DESC
       LIMIT 5`,
      [studentId]
    );
    console.log('Recent results query result:', recentResults);

    // Get recent announcements
    const recentAnnouncements = await db.query(
      `SELECT a.id, a.title, a.content, a.priority, a.published_at,
              c.course_code, c.title as course_title
       FROM announcements a
       LEFT JOIN courses c ON a.course_id = c.id
       WHERE (a.course_id IS NULL OR a.course_id IN (
         SELECT course_id FROM enrollments WHERE student_id = ? AND status IN ('active', 'enrolled', 'registered')
       ))
       AND a.is_published = true
       ORDER BY a.published_at DESC
       LIMIT 5`,
      [studentId]
    );

    console.log('=== STUDENT DASHBOARD API DEBUG ===');
    console.log('Student ID:', studentId);
    console.log('Enrolled Courses:', enrolledCourses);
    console.log('Upcoming Assessments:', upcomingAssessments);
    console.log('Recent Results:', recentResults);
    console.log('Recent Announcements:', recentAnnouncements);
    console.log('=== END API DEBUG ===');

    res.json({
      success: true,
      data: {
        enrolledCourses,
        upcomingAssessments,
        recentResults,
        recentAnnouncements
      }
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get available courses for enrollment
router.get('/available-courses', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const studentId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const department = req.query.department;
    const search = req.query.search;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    let whereClause = `WHERE c.is_active = true 
                       AND c.current_students < c.max_students 
                       AND c.end_date > NOW()
                       AND c.id NOT IN (
                         SELECT course_id FROM enrollments 
                         WHERE student_id = ? AND status = 'active'
                       )`;
    let params = [studentId];

    if (department) {
      whereClause += ' AND c.department = ?';
      params.push(department);
    }

    if (search) {
      whereClause += ' AND (c.title LIKE ? OR c.course_code LIKE ? OR c.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get available courses
    const courses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.max_students, c.current_students, c.start_date, c.end_date,
              instructor.first_name as instructor_first_name, instructor.last_name as instructor_last_name
       FROM courses c
       INNER JOIN users instructor ON c.instructor_id = instructor.id
       ${whereClause}
       ORDER BY c.start_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available courses'
    });
  }
});

// Get student's course materials
router.get('/courses/:courseId/materials', authenticateToken, requireUser, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    // Check if student is enrolled in the course
    const enrollment = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = "active"',
      [studentId, courseId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Get course materials
    const materials = await db.query(
      'SELECT id, title, description, file_path, file_type, file_size, material_type, is_required, upload_date FROM course_materials WHERE course_id = ? ORDER BY upload_date DESC',
      [courseId]
    );

    console.log('Course Materials Query Result:', materials);
    console.log('Course ID:', courseId);

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    console.error('Get course materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course materials'
    });
  }
});

// Get student's assessments for a course
router.get('/courses/:courseId/assessments', authenticateToken, requireUser, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    // Check if student is enrolled in the course
    const enrollment = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = "active"',
      [studentId, courseId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Get assessments with student's results
    const assessments = await db.query(
      `SELECT a.id, a.title, a.description, a.assessment_type, a.total_marks, 
              a.weight_percentage, a.due_date, a.instructions, a.is_published,
              sr.marks_obtained, sr.feedback, sr.submission_date, sr.status as result_status
       FROM assessments a
       LEFT JOIN student_results sr ON a.id = sr.assessment_id AND sr.student_id = ?
       WHERE a.course_id = ? AND a.is_published = true
       ORDER BY a.due_date ASC`,
      [studentId, courseId]
    );

    // Also check if there are any assessments at all (published or not) for debugging
    const allAssessments = await db.query(
      'SELECT id, title, assessment_type, is_published FROM assessments WHERE course_id = ?',
      [courseId]
    );
    console.log('All assessments in course:', allAssessments);

    console.log('Course Assessments Query Result:', assessments);
    console.log('Course ID:', courseId, 'Student ID:', studentId);

    res.json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Get course assessments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course assessments'
    });
  }
});

// Enroll in a course
router.post('/enroll/:courseId', authenticateToken, requireUser, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    // Check if course exists and is available
    const course = await db.query(
      'SELECT id, title, max_students, current_students, is_active, end_date FROM courses WHERE id = ?',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const courseData = course[0];

    if (!courseData.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Course is not active'
      });
    }

    if (courseData.current_students >= courseData.max_students) {
      return res.status(400).json({
        success: false,
        message: 'Course is full'
      });
    }

    if (new Date(courseData.end_date) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Course has ended'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await db.query(
      'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (existingEnrollment.length > 0) {
      const enrollment = existingEnrollment[0];
      if (enrollment.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course'
        });
      } else if (enrollment.status === 'dropped') {
        return res.status(400).json({
          success: false,
          message: 'Cannot re-enroll in a course you have dropped'
        });
      }
    }

    // Create enrollment and update course count
    try {
      // Create enrollment
      const enrollmentResult = await db.query(
        'INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (?, ?, NOW(), "active")',
        [studentId, courseId]
      );

      // Update course current_students count
      await db.query(
        'UPDATE courses SET current_students = current_students + 1 WHERE id = ?',
        [courseId]
      );

      res.status(201).json({
        success: true,
        message: 'Successfully enrolled in course',
        data: {
          enrollmentId: enrollmentResult.insertId,
          courseId: courseId,
          courseTitle: courseData.title
        }
      });
    } catch (error) {
      // If enrollment was created but course update failed, we should handle this
      // For now, we'll let the error propagate and handle it in the outer catch
      throw error;
    }
  } catch (error) {
    console.error('Enroll in course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course'
    });
  }
});

// Get all courses (for catalog view)
router.get('/courses', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const studentId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const department = req.query.department;
    const search = req.query.search;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    let whereClause = 'WHERE c.is_active = true AND c.end_date > NOW()';
    let params = [];

    if (department && department !== 'all') {
      whereClause += ' AND c.department = ?';
      params.push(department);
    }

    if (search) {
      whereClause += ' AND (c.title LIKE ? OR c.course_code LIKE ? OR c.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get courses with enrollment status
    const courses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.max_students, c.current_students, c.start_date, c.end_date,
              instructor.first_name as instructor_first_name, instructor.last_name as instructor_last_name,
              e.status as enrollment_status,
              CASE 
                WHEN e.status = 'active' THEN 'enrolled'
                WHEN c.current_students >= c.max_students THEN 'full'
                WHEN c.end_date <= NOW() THEN 'ended'
                ELSE 'available'
              END as availability_status
       FROM courses c
       INNER JOIN users instructor ON c.instructor_id = instructor.id
       LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
       ${whereClause}
       ORDER BY c.start_date DESC
       LIMIT ? OFFSET ?`,
      [studentId, ...params, limit, offset]
    );

    res.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get courses catalog error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Submit assignment
router.post('/courses/:courseId/assignments/:assignmentId/submit', authenticateToken, requireUser, upload.single('submission_file'), async (req, res) => {
  try {
    console.log('Assignment submission request received:', {
      courseId: req.params.courseId,
      assignmentId: req.params.assignmentId,
      studentId: req.user.id,
      body: req.body,
      file: req.file
    });
    
    const courseId = parseInt(req.params.courseId);
    const assignmentId = parseInt(req.params.assignmentId);
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - student role required'
      });
    }

    // Check if student is enrolled in the course
    const enrollment = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = "active"',
      [studentId, courseId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Check if assignment exists and is published
    const assignment = await db.query(
      'SELECT id, title, due_date FROM assessments WHERE id = ? AND course_id = ? AND is_published = true',
      [assignmentId, courseId]
    );

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or not published'
      });
    }

    // Check if already submitted
    const existingSubmission = await db.query(
      'SELECT id, status FROM student_results WHERE student_id = ? AND assessment_id = ?',
      [studentId, assignmentId]
    );

    if (existingSubmission.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignment already submitted'
      });
    }

    // Check if assignment is overdue
    const isOverdue = new Date(assignment[0].due_date) < new Date();
    const submissionStatus = isOverdue ? 'late' : 'submitted';

    const { submission_text } = req.body;
    const submissionFile = req.file;

    if (!submission_text && !submissionFile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either text submission or upload a file'
      });
    }

    // Insert submission record (using existing table structure)
    console.log('Inserting submission with data:', {
      studentId,
      assignmentId,
      submission_text: submission_text || null,
      filePath: submissionFile ? submissionFile.path : null,
      fileName: submissionFile ? submissionFile.originalname : null,
      fileType: submissionFile ? submissionFile.mimetype : null,
      fileSize: submissionFile ? submissionFile.size : null,
      status: submissionStatus
    });
    
    // For now, just store the basic submission info
    // TODO: Add file submission columns to student_results table
    const result = await db.query(
      `INSERT INTO student_results (student_id, assessment_id, submission_date, status)
       VALUES (?, ?, NOW(), ?)`,
      [studentId, assignmentId, submissionStatus]
    );
    
    console.log('Submission inserted successfully:', result);
    
    // Store file info in a separate table or log it for now
    if (submissionFile) {
      console.log('File uploaded:', {
        originalName: submissionFile.originalname,
        path: submissionFile.path,
        size: submissionFile.size,
        mimetype: submissionFile.mimetype
      });
    }
    
    if (submission_text) {
      console.log('Text submission:', submission_text);
    }

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: {
        submissionId: result.insertId,
        status: submissionStatus,
        isOverdue: isOverdue
      }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    if (req.file && req.file.path) {
      try { 
        fs.unlinkSync(req.file.path); 
      } catch (unlinkError) { 
        console.error('Error deleting uploaded file:', unlinkError); 
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment'
    });
  }
});

module.exports = router;
