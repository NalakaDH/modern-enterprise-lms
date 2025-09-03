const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireInstructor } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/course-materials');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/avi',
    'video/quicktime'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, GIF, MP4, AVI, MOV files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get instructor dashboard
router.get('/dashboard', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Get instructor's courses
    const courses = await db.query(`
      SELECT c.id, c.course_code, c.title, c.current_students, c.max_students, 
             c.start_date, c.end_date, c.is_active
      FROM courses c
      WHERE c.instructor_id = ? AND c.is_active = true
      ORDER BY c.start_date DESC
    `, [instructorId]);

    // Get total students across all courses
    const totalStudents = await db.query(`
      SELECT COUNT(DISTINCT e.student_id) as total_students
      FROM enrollments e
      INNER JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = ? AND e.status = 'active'
    `, [instructorId]);

    // Get pending assessments to grade
    const pendingGrading = await db.query(`
      SELECT COUNT(*) as pending_count
      FROM student_results sr
      INNER JOIN assessments a ON sr.assessment_id = a.id
      INNER JOIN courses c ON a.course_id = c.id
      WHERE c.instructor_id = ? AND sr.status = 'submitted'
    `, [instructorId]);

    // Get recent announcements
    const recentAnnouncements = await db.query(`
      SELECT a.id, a.title, a.priority, a.published_at
      FROM announcements a
      WHERE a.author_id = ?
      ORDER BY a.published_at DESC
      LIMIT 5
    `, [instructorId]);

    // Get recent submissions that need grading
    const recentSubmissions = await db.query(`
      SELECT sr.id, sr.student_id, sr.assessment_id, sr.submission_date, sr.status,
             u.first_name, u.last_name, u.email,
             a.title as assignment_title, a.total_marks,
             c.course_code, c.title as course_title
      FROM student_results sr
      INNER JOIN users u ON sr.student_id = u.id
      INNER JOIN assessments a ON sr.assessment_id = a.id
      INNER JOIN courses c ON a.course_id = c.id
      WHERE c.instructor_id = ? AND sr.status IN ('submitted', 'late')
      ORDER BY sr.submission_date DESC
      LIMIT 10
    `, [instructorId]);

    // Get upcoming assignment due dates
    const upcomingDueDates = await db.query(`
      SELECT a.id, a.title, a.due_date, a.total_marks,
             c.course_code, c.title as course_title,
             COUNT(sr.id) as submission_count
      FROM assessments a
      INNER JOIN courses c ON a.course_id = c.id
      LEFT JOIN student_results sr ON a.id = sr.assessment_id
      WHERE c.instructor_id = ? AND a.is_published = true AND a.due_date > NOW()
      GROUP BY a.id
      ORDER BY a.due_date ASC
      LIMIT 5
    `, [instructorId]);

    // Get course statistics
    const courseStats = await db.query(`
      SELECT c.id, c.course_code, c.title,
             COUNT(DISTINCT e.student_id) as enrolled_students,
             COUNT(DISTINCT a.id) as total_assignments,
             COUNT(DISTINCT CASE WHEN sr.status = 'graded' THEN sr.id END) as graded_submissions
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN assessments a ON c.id = a.course_id AND a.is_published = true
      LEFT JOIN student_results sr ON a.id = sr.assessment_id
      WHERE c.instructor_id = ? AND c.is_active = true
      GROUP BY c.id
      ORDER BY c.start_date DESC
    `, [instructorId]);

    console.log('=== INSTRUCTOR DASHBOARD API DEBUG ===');
    console.log('Instructor ID:', instructorId);
    console.log('Courses:', courses);
    console.log('Total Students:', totalStudents[0]?.total_students);
    console.log('Pending Grading:', pendingGrading[0]?.pending_count);
    console.log('Recent Submissions:', recentSubmissions);
    console.log('Upcoming Due Dates:', upcomingDueDates);
    console.log('Course Stats:', courseStats);
    console.log('=== END API DEBUG ===');

    res.json({
      success: true,
      data: {
        courses,
        totalStudents: totalStudents[0]?.total_students || 0,
        pendingGrading: pendingGrading[0]?.pending_count || 0,
        recentAnnouncements,
        recentSubmissions,
        upcomingDueDates,
        courseStats
      }
    });
  } catch (error) {
    console.error('Get instructor dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get instructor's courses
router.get('/courses', authenticateToken, requireInstructor, validatePagination, async (req, res) => {
  try {
    const instructorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?',
      [instructorId]
    );
    const total = countResult[0].total;

    // Get courses
    const courses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.max_students, c.current_students, c.start_date, c.end_date, 
              c.is_active, c.created_at, c.updated_at
       FROM courses c
       WHERE c.instructor_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [instructorId, limit, offset]
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
    console.error('Get instructor courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Get course students
router.get('/courses/:courseId/students', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const instructorId = req.user.id;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Get enrolled students
    const students = await db.query(
      `SELECT e.id as enrollment_id, e.enrollment_date, e.status, e.final_grade, e.attendance_percentage,
              u.id as student_id, u.first_name, u.last_name, u.email, u.student_id as student_number
       FROM enrollments e
       INNER JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY u.last_name, u.first_name`,
      [courseId]
    );

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get course students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course students'
    });
  }
});

// Get pending assessments to grade
router.get('/pending-grading', authenticateToken, requireInstructor, validatePagination, async (req, res) => {
  try {
    const instructorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM student_results sr
      INNER JOIN assessments a ON sr.assessment_id = a.id
      INNER JOIN courses c ON a.course_id = c.id
      WHERE c.instructor_id = ? AND sr.status = 'submitted'
    `, [instructorId]);
    const total = countResult[0].total;

    // Get pending assessments
    const pendingAssessments = await db.query(
      `SELECT sr.id, sr.student_id, sr.assessment_id, sr.submission_date,
              u.first_name as student_first_name, u.last_name as student_last_name, 
              u.email as student_email, u.student_id as student_number,
              a.title as assessment_title, a.assessment_type, a.total_marks,
              c.course_code, c.title as course_title
       FROM student_results sr
       INNER JOIN users u ON sr.student_id = u.id
       INNER JOIN assessments a ON sr.assessment_id = a.id
       INNER JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = ? AND sr.status = 'submitted'
       ORDER BY sr.submission_date ASC
       LIMIT ? OFFSET ?`,
      [instructorId, limit, offset]
    );

    res.json({
      success: true,
      data: pendingAssessments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending grading error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending assessments'
    });
  }
});

// Upload course material
router.post('/courses/:courseId/materials', authenticateToken, requireInstructor, upload.single('file'), async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const instructorId = req.user.id;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, description, material_type, is_required } = req.body;

    if (!title || !material_type) {
      return res.status(400).json({
        success: false,
        message: 'Title and material type are required'
      });
    }

    // Insert material record with actual file information
    const result = await db.query(
      `INSERT INTO course_materials (course_id, title, description, file_path, file_type, file_size, material_type, is_required)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        title,
        description || null,
        req.file.path, // Actual file path
        req.file.mimetype, // Actual MIME type
        req.file.size, // Actual file size
        material_type,
        is_required === 'true' || is_required === true
      ]
    );

    // Get the created material
    const newMaterial = await db.query(
      'SELECT * FROM course_materials WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Course material uploaded successfully',
      data: newMaterial[0]
    });
  } catch (error) {
    console.error('Upload course material error:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload course material'
    });
  }
});

// Get course materials
router.get('/courses/:courseId/materials', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const instructorId = req.user.id;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Get course materials
    const materials = await db.query(
      'SELECT id, title, description, file_path, file_type, file_size, material_type, is_required, upload_date FROM course_materials WHERE course_id = ? ORDER BY upload_date DESC',
      [courseId]
    );

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

// Create assignment
router.post('/courses/:courseId/assignments', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const instructorId = req.user.id;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    const { title, description, total_marks, weight_percentage, due_date, instructions } = req.body;

    if (!title || !total_marks || !weight_percentage || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Title, total marks, weight percentage, and due date are required'
      });
    }

    // Insert assignment record
    const result = await db.query(
      `INSERT INTO assessments (course_id, title, description, assessment_type, total_marks, weight_percentage, due_date, instructions, is_published)
       VALUES (?, ?, ?, 'assignment', ?, ?, ?, ?, true)`,
      [
        courseId,
        title,
        description || null,
        parseFloat(total_marks),
        parseFloat(weight_percentage),
        new Date(due_date),
        instructions || null
      ]
    );

    // Get the created assignment
    const newAssignment = await db.query(
      'SELECT * FROM assessments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: newAssignment[0]
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    });
  }
});

// Get course assignments
router.get('/courses/:courseId/assignments', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const instructorId = req.user.id;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Get assignments
    const assignments = await db.query(
      `SELECT a.id, a.title, a.description, a.total_marks, a.weight_percentage, 
              a.due_date, a.instructions, a.is_published, a.created_at,
              COUNT(sr.id) as submission_count
       FROM assessments a
       LEFT JOIN student_results sr ON a.id = sr.assessment_id AND sr.status = 'submitted'
       WHERE a.course_id = ? AND a.assessment_type = 'assignment'
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [courseId]
    );

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// Publish/Unpublish assignment
router.patch('/courses/:courseId/assignments/:assignmentId/publish', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const assignmentId = parseInt(req.params.assignmentId);
    const instructorId = req.user.id;
    const { is_published } = req.body;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Update assignment publish status
    await db.query(
      'UPDATE assessments SET is_published = ? WHERE id = ? AND course_id = ?',
      [is_published, assignmentId, courseId]
    );

    res.json({
      success: true,
      message: `Assignment ${is_published ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    console.error('Publish assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment status'
    });
  }
});

// Get course submissions
router.get('/courses/:courseId/submissions', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const instructorId = req.user.id;

    // Verify instructor owns this course
    const courseAccess = await db.query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, instructorId]
    );

    if (courseAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Get submissions with student and assignment details
    const submissions = await db.query(
      `SELECT sr.id, sr.student_id, sr.assessment_id, sr.status, sr.submission_date, 
              sr.marks_obtained, sr.feedback, sr.graded_date,
              u.first_name, u.last_name, u.email,
              a.title as assignment_title, a.total_marks, a.due_date
       FROM student_results sr
       JOIN users u ON sr.student_id = u.id
       JOIN assessments a ON sr.assessment_id = a.id
       WHERE a.course_id = ? AND sr.status IN ('submitted', 'late', 'graded')
       ORDER BY sr.submission_date DESC`,
      [courseId]
    );

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
});

// Grade submission
router.put('/submissions/:submissionId/grade', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId);
    const instructorId = req.user.id;
    const { marks_obtained, feedback } = req.body;

    // Verify instructor has access to this submission
    const submissionAccess = await db.query(
      `SELECT sr.id, sr.assessment_id, c.instructor_id
       FROM student_results sr
       JOIN assessments a ON sr.assessment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE sr.id = ? AND c.instructor_id = ?`,
      [submissionId, instructorId]
    );

    if (submissionAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not authorized to grade this submission'
      });
    }

    // Update submission with grade
    await db.query(
      `UPDATE student_results 
       SET marks_obtained = ?, feedback = ?, graded_date = NOW(), status = 'graded'
       WHERE id = ?`,
      [marks_obtained, feedback, submissionId]
    );

    res.json({
      success: true,
      message: 'Submission graded successfully'
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission'
    });
  }
});

module.exports = router;
