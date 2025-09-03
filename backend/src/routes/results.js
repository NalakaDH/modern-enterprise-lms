const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireUser, requireInstructor, canAccessStudent } = require('../middleware/auth');
const { validateResult, validateId, validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all results (admin only)
router.get('/', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const student_id = req.query.student_id;
    const assessment_id = req.query.assessment_id;
    const course_id = req.query.course_id;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (student_id) {
      whereClause += ' AND sr.student_id = ?';
      params.push(student_id);
    }

    if (assessment_id) {
      whereClause += ' AND sr.assessment_id = ?';
      params.push(assessment_id);
    }

    if (course_id) {
      whereClause += ' AND a.course_id = ?';
      params.push(course_id);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM student_results sr
       INNER JOIN assessments a ON sr.assessment_id = a.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get results with student, assessment, and course details
    const results = await db.query(
      `SELECT sr.id, sr.student_id, sr.assessment_id, sr.marks_obtained, sr.feedback, 
              sr.submission_date, sr.graded_date, sr.status,
              u.first_name as student_first_name, u.last_name as student_last_name, 
              u.email as student_email, u.student_id as student_number,
              a.title as assessment_title, a.assessment_type, a.total_marks, a.weight_percentage,
              c.course_code, c.title as course_title,
              grader.first_name as grader_first_name, grader.last_name as grader_last_name
       FROM student_results sr
       INNER JOIN users u ON sr.student_id = u.id
       INNER JOIN assessments a ON sr.assessment_id = a.id
       INNER JOIN courses c ON a.course_id = c.id
       LEFT JOIN users grader ON sr.graded_by = grader.id
       ${whereClause}
       ORDER BY sr.graded_date DESC, sr.submission_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
});

// Get student's results
router.get('/student/:studentId', authenticateToken, requireUser, validateId, canAccessStudent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const results = await db.query(
      `SELECT sr.id, sr.assessment_id, sr.marks_obtained, sr.feedback, 
              sr.submission_date, sr.graded_date, sr.status,
              a.title as assessment_title, a.assessment_type, a.total_marks, a.weight_percentage, a.due_date,
              c.course_code, c.title as course_title,
              grader.first_name as grader_first_name, grader.last_name as grader_last_name
       FROM student_results sr
       INNER JOIN assessments a ON sr.assessment_id = a.id
       INNER JOIN courses c ON a.course_id = c.id
       LEFT JOIN users grader ON sr.graded_by = grader.id
       WHERE sr.student_id = ?
       ORDER BY a.due_date DESC, sr.graded_date DESC`,
      [studentId]
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student results'
    });
  }
});

// Get assessment results (instructor or admin)
router.get('/assessment/:assessmentId', authenticateToken, requireInstructor, validateId, async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if user can access this assessment's results
    if (currentUserRole === 'instructor') {
      const assessmentAccess = await db.query(`
        SELECT a.id FROM assessments a
        INNER JOIN courses c ON a.course_id = c.id
        WHERE a.id = ? AND c.instructor_id = ?
      `, [assessmentId, currentUserId]);

      if (assessmentAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not the instructor of this course'
        });
      }
    }

    const results = await db.query(
      `SELECT sr.id, sr.student_id, sr.marks_obtained, sr.feedback, 
              sr.submission_date, sr.graded_date, sr.status,
              u.first_name as student_first_name, u.last_name as student_last_name, 
              u.email as student_email, u.student_id as student_number,
              a.title as assessment_title, a.assessment_type, a.total_marks, a.weight_percentage,
              grader.first_name as grader_first_name, grader.last_name as grader_last_name
       FROM student_results sr
       INNER JOIN users u ON sr.student_id = u.id
       INNER JOIN assessments a ON sr.assessment_id = a.id
       LEFT JOIN users grader ON sr.graded_by = grader.id
       WHERE sr.assessment_id = ?
       ORDER BY sr.graded_date DESC, sr.submission_date DESC`,
      [assessmentId]
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get assessment results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment results'
    });
  }
});

// Submit assessment result (student)
router.post('/submit', authenticateToken, requireUser, async (req, res) => {
  try {
    const { assessment_id } = req.body;
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assessments'
      });
    }

    // Check if assessment exists and is published
    const assessments = await db.query(
      'SELECT id, due_date FROM assessments WHERE id = ? AND is_published = true',
      [assessment_id]
    );

    if (assessments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found or not published'
      });
    }

    const assessment = assessments[0];

    // Check if student is enrolled in the course
    const enrollments = await db.query(`
      SELECT e.id FROM enrollments e
      INNER JOIN assessments a ON e.course_id = a.course_id
      WHERE e.student_id = ? AND a.id = ? AND e.status = 'active'
    `, [studentId, assessment_id]);

    if (enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Check if result already exists
    const existingResults = await db.query(
      'SELECT id, status FROM student_results WHERE student_id = ? AND assessment_id = ?',
      [studentId, assessment_id]
    );

    if (existingResults.length > 0 && existingResults[0].status !== 'not_submitted') {
      return res.status(400).json({
        success: false,
        message: 'Assessment already submitted'
      });
    }

    // Determine if submission is late
    const now = new Date();
    const dueDate = new Date(assessment.due_date);
    const isLate = now > dueDate;

    if (existingResults.length > 0) {
      // Update existing result
      await db.query(
        'UPDATE student_results SET submission_date = ?, status = ? WHERE id = ?',
        [now, isLate ? 'late' : 'submitted', existingResults[0].id]
      );
    } else {
      // Create new result
      await db.query(
        'INSERT INTO student_results (student_id, assessment_id, submission_date, status) VALUES (?, ?, ?, ?)',
        [studentId, assessment_id, now, isLate ? 'late' : 'submitted']
      );
    }

    res.status(201).json({
      success: true,
      message: isLate ? 'Assessment submitted (late)' : 'Assessment submitted successfully'
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment'
    });
  }
});

// Grade assessment (instructor or admin)
router.put('/:id/grade', authenticateToken, requireInstructor, validateId, validateResult, async (req, res) => {
  try {
    const resultId = parseInt(req.params.id);
    const { marks_obtained, feedback } = req.body;
    const graderId = req.user.id;
    const currentUserRole = req.user.role;

    // Get result details
    const results = await db.query(
      'SELECT id, assessment_id, student_id FROM student_results WHERE id = ?',
      [resultId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const result = results[0];

    // Check if user can grade this result
    if (currentUserRole === 'instructor') {
      const assessmentAccess = await db.query(`
        SELECT a.id FROM assessments a
        INNER JOIN courses c ON a.course_id = c.id
        WHERE a.id = ? AND c.instructor_id = ?
      `, [result.assessment_id, graderId]);

      if (assessmentAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not the instructor of this course'
        });
      }
    }

    // Get assessment details to validate marks
    const assessments = await db.query(
      'SELECT total_marks FROM assessments WHERE id = ?',
      [result.assessment_id]
    );

    if (assessments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    const assessment = assessments[0];

    if (marks_obtained > assessment.total_marks) {
      return res.status(400).json({
        success: false,
        message: 'Marks obtained cannot exceed total marks'
      });
    }

    // Update result
    await db.query(
      'UPDATE student_results SET marks_obtained = ?, feedback = ?, graded_date = ?, graded_by = ?, status = "graded" WHERE id = ?',
      [marks_obtained, feedback, new Date(), graderId, resultId]
    );

    res.json({
      success: true,
      message: 'Assessment graded successfully'
    });
  } catch (error) {
    console.error('Grade assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade assessment'
    });
  }
});

// Get result by ID
router.get('/:id', authenticateToken, requireUser, validateId, async (req, res) => {
  try {
    const resultId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const results = await db.query(
      `SELECT sr.id, sr.student_id, sr.assessment_id, sr.marks_obtained, sr.feedback, 
              sr.submission_date, sr.graded_date, sr.status,
              u.first_name as student_first_name, u.last_name as student_last_name, 
              u.email as student_email, u.student_id as student_number,
              a.title as assessment_title, a.assessment_type, a.total_marks, a.weight_percentage,
              c.course_code, c.title as course_title,
              grader.first_name as grader_first_name, grader.last_name as grader_last_name
       FROM student_results sr
       INNER JOIN users u ON sr.student_id = u.id
       INNER JOIN assessments a ON sr.assessment_id = a.id
       INNER JOIN courses c ON a.course_id = c.id
       LEFT JOIN users grader ON sr.graded_by = grader.id
       WHERE sr.id = ?`,
      [resultId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const result = results[0];

    // Check if user can access this result
    if (currentUserRole === 'student' && result.student_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch result'
    });
  }
});

module.exports = router;
