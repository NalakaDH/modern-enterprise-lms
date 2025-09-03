const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireUser, requireAdmin, requireInstructor } = require('../middleware/auth');
const { validateEnrollment, validateId, validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all enrollments (admin only)
router.get('/', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const course_id = req.query.course_id;
    const student_id = req.query.student_id;
    const status = req.query.status;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (course_id) {
      whereClause += ' AND e.course_id = ?';
      params.push(course_id);
    }

    if (student_id) {
      whereClause += ' AND e.student_id = ?';
      params.push(student_id);
    }

    if (status) {
      whereClause += ' AND e.status = ?';
      params.push(status);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM enrollments e ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get enrollments with student and course details
    const enrollments = await db.query(
      `SELECT e.id, e.student_id, e.course_id, e.enrollment_date, e.status, 
              e.final_grade, e.attendance_percentage,
              u.first_name as student_first_name, u.last_name as student_last_name, 
              u.email as student_email, u.student_id as student_number,
              c.course_code, c.title as course_title, c.credits,
              instructor.first_name as instructor_first_name, instructor.last_name as instructor_last_name
       FROM enrollments e
       INNER JOIN users u ON e.student_id = u.id
       INNER JOIN courses c ON e.course_id = c.id
       INNER JOIN users instructor ON c.instructor_id = instructor.id
       ${whereClause}
       ORDER BY e.enrollment_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
});

// Get student's enrollments
router.get('/student/:studentId', authenticateToken, requireUser, validateId, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if user can access this student's enrollments
    if (currentUserRole === 'student' && currentUserId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // For instructors, check if they teach any courses this student is enrolled in
    if (currentUserRole === 'instructor') {
      const hasAccess = await db.query(`
        SELECT 1 FROM enrollments e
        INNER JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ? AND c.instructor_id = ?
        LIMIT 1
      `, [studentId, currentUserId]);

      if (hasAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const enrollments = await db.query(
      `SELECT e.id, e.course_id, e.enrollment_date, e.status, e.final_grade, e.attendance_percentage,
              c.course_code, c.title as course_title, c.credits, c.department,
              c.start_date, c.end_date,
              instructor.first_name as instructor_first_name, instructor.last_name as instructor_last_name
       FROM enrollments e
       INNER JOIN courses c ON e.course_id = c.id
       INNER JOIN users instructor ON c.instructor_id = instructor.id
       WHERE e.student_id = ?
       ORDER BY e.enrollment_date DESC`,
      [studentId]
    );

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student enrollments'
    });
  }
});

// Get course enrollments (instructor or admin)
router.get('/course/:courseId', authenticateToken, requireInstructor, validateId, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if user can access this course's enrollments
    if (currentUserRole === 'instructor') {
      const courseAccess = await db.query(
        'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
        [courseId, currentUserId]
      );

      if (courseAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not the instructor of this course'
        });
      }
    }

    const enrollments = await db.query(
      `SELECT e.id, e.student_id, e.enrollment_date, e.status, e.final_grade, e.attendance_percentage,
              u.first_name as student_first_name, u.last_name as student_last_name, 
              u.email as student_email, u.student_id as student_number
       FROM enrollments e
       INNER JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.enrollment_date DESC`,
      [courseId]
    );

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course enrollments'
    });
  }
});

// Enroll student in course
router.post('/', authenticateToken, requireUser, validateEnrollment, async (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if user can enroll this student
    if (currentUserRole === 'student' && currentUserId !== student_id) {
      return res.status(403).json({
        success: false,
        message: 'Students can only enroll themselves'
      });
    }

    // Check if student exists and is active
    const students = await db.query(
      'SELECT id FROM users WHERE id = ? AND role = "student" AND is_active = true',
      [student_id]
    );
    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student'
      });
    }

    // Check if course exists and is active
    const courses = await db.query(
      'SELECT id, max_students, current_students, start_date, end_date FROM courses WHERE id = ? AND is_active = true',
      [course_id]
    );
    if (courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course'
      });
    }

    const course = courses[0];

    // Check if course is full
    if (course.current_students >= course.max_students) {
      return res.status(400).json({
        success: false,
        message: 'Course is full'
      });
    }

    // Check if course is still open for enrollment
    const now = new Date();
    if (now > new Date(course.end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Course enrollment has ended'
      });
    }

    // Check if student is already enrolled
    const existingEnrollments = await db.query(
      'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    );

    if (existingEnrollments.length > 0) {
      const enrollment = existingEnrollments[0];
      if (enrollment.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Student is already enrolled in this course'
        });
      } else if (enrollment.status === 'dropped') {
        // Reactivate enrollment
        await db.query(
          'UPDATE enrollments SET status = "active", enrollment_date = CURRENT_TIMESTAMP WHERE id = ?',
          [enrollment.id]
        );
      }
    } else {
      // Create new enrollment
      await db.query(
        'INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, "active")',
        [student_id, course_id]
      );
    }

    // Update course current_students count
    await db.query(
      'UPDATE courses SET current_students = current_students + 1 WHERE id = ?',
      [course_id]
    );

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully'
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll student'
    });
  }
});

// Drop student from course
router.delete('/:id', authenticateToken, requireUser, validateId, async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Get enrollment details
    const enrollments = await db.query(
      'SELECT id, student_id, course_id, status FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const enrollment = enrollments[0];

    // Check if user can drop this enrollment
    if (currentUserRole === 'student' && enrollment.student_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only drop their own enrollments'
      });
    }

    if (currentUserRole === 'instructor') {
      const courseAccess = await db.query(
        'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
        [enrollment.course_id, currentUserId]
      );

      if (courseAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not the instructor of this course'
        });
      }
    }

    if (enrollment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not active'
      });
    }

    // Update enrollment status
    await db.query(
      'UPDATE enrollments SET status = "dropped" WHERE id = ?',
      [enrollmentId]
    );

    // Update course current_students count
    await db.query(
      'UPDATE courses SET current_students = current_students - 1 WHERE id = ?',
      [enrollment.course_id]
    );

    res.json({
      success: true,
      message: 'Student dropped from course successfully'
    });
  } catch (error) {
    console.error('Drop student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to drop student'
    });
  }
});

// Update enrollment status (admin or instructor)
router.patch('/:id/status', authenticateToken, requireInstructor, validateId, async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const { status } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (!['active', 'dropped', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get enrollment details
    const enrollments = await db.query(
      'SELECT id, student_id, course_id, status FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const enrollment = enrollments[0];

    // Check if user can update this enrollment
    if (currentUserRole === 'instructor') {
      const courseAccess = await db.query(
        'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
        [enrollment.course_id, currentUserId]
      );

      if (courseAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not the instructor of this course'
        });
      }
    }

    const oldStatus = enrollment.status;

    // Update enrollment status
    await db.query(
      'UPDATE enrollments SET status = ? WHERE id = ?',
      [status, enrollmentId]
    );

    // Update course current_students count if needed
    if (oldStatus === 'active' && status !== 'active') {
      await db.query(
        'UPDATE courses SET current_students = current_students - 1 WHERE id = ?',
        [enrollment.course_id]
      );
    } else if (oldStatus !== 'active' && status === 'active') {
      await db.query(
        'UPDATE courses SET current_students = current_students + 1 WHERE id = ?',
        [enrollment.course_id]
      );
    }

    res.json({
      success: true,
      message: 'Enrollment status updated successfully'
    });
  } catch (error) {
    console.error('Update enrollment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment status'
    });
  }
});

// Update final grade (instructor or admin)
router.patch('/:id/grade', authenticateToken, requireInstructor, validateId, async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const { final_grade } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (final_grade < 0 || final_grade > 100) {
      return res.status(400).json({
        success: false,
        message: 'Final grade must be between 0 and 100'
      });
    }

    // Get enrollment details
    const enrollments = await db.query(
      'SELECT id, course_id FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const enrollment = enrollments[0];

    // Check if user can update this enrollment
    if (currentUserRole === 'instructor') {
      const courseAccess = await db.query(
        'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
        [enrollment.course_id, currentUserId]
      );

      if (courseAccess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - not the instructor of this course'
        });
      }
    }

    // Update final grade
    await db.query(
      'UPDATE enrollments SET final_grade = ? WHERE id = ?',
      [final_grade, enrollmentId]
    );

    res.json({
      success: true,
      message: 'Final grade updated successfully'
    });
  } catch (error) {
    console.error('Update final grade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update final grade'
    });
  }
});

module.exports = router;
