const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireUser, requireInstructor, canAccessCourse } = require('../middleware/auth');
const { validateCourse, validateId, validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all courses
router.get('/', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const department = req.query.department;
    const instructor_id = req.query.instructor_id;
    const search = req.query.search;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereClause = 'WHERE c.is_active = true';
    let params = [];

    if (department) {
      whereClause += ' AND c.department = ?';
      params.push(department);
    }

    if (instructor_id) {
      whereClause += ' AND c.instructor_id = ?';
      params.push(instructor_id);
    }

    if (search) {
      whereClause += ' AND (c.title LIKE ? OR c.course_code LIKE ? OR c.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // For students, only show courses they can enroll in or are enrolled in
    if (userRole === 'student') {
      whereClause += ` AND (c.current_students < c.max_students OR EXISTS (
        SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = ? AND e.status = 'active'
      ))`;
      params.push(userId);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get courses with instructor details
    const courses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.prerequisites, c.max_students, c.current_students, 
              c.start_date, c.end_date, c.created_at, c.updated_at,
              u.first_name as instructor_first_name, u.last_name as instructor_last_name,
              u.email as instructor_email
       FROM courses c
       INNER JOIN users u ON c.instructor_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
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
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Get course by ID
router.get('/:id', authenticateToken, requireUser, validateId, canAccessCourse, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    const courses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.prerequisites, c.max_students, c.current_students, 
              c.start_date, c.end_date, c.created_at, c.updated_at,
              u.first_name as instructor_first_name, u.last_name as instructor_last_name,
              u.email as instructor_email, u.id as instructor_id
       FROM courses c
       INNER JOIN users u ON c.instructor_id = u.id
       WHERE c.id = ?`,
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const course = courses[0];

    // Get course materials
    const materials = await db.query(
      'SELECT id, title, description, file_path, file_type, file_size, material_type, is_required, upload_date FROM course_materials WHERE course_id = ? ORDER BY upload_date DESC',
      [courseId]
    );

    // Get assessments
    const assessments = await db.query(
      'SELECT id, title, description, assessment_type, total_marks, weight_percentage, due_date, is_published, created_at FROM assessments WHERE course_id = ? ORDER BY due_date ASC',
      [courseId]
    );

    res.json({
      success: true,
      data: {
        ...course,
        materials,
        assessments
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    });
  }
});

// Create new course (instructor or admin only)
router.post('/', authenticateToken, requireInstructor, validateCourse, async (req, res) => {
  try {
    const { course_code, title, description, credits, department, instructor_id, category, prerequisites, max_students, start_date, end_date } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if course code already exists
    const existingCourses = await db.query('SELECT id FROM courses WHERE course_code = ?', [course_code]);
    if (existingCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    // Check if instructor exists and is active
    const instructors = await db.query('SELECT id FROM users WHERE id = ? AND role = "instructor" AND is_active = true', [instructor_id]);
    if (instructors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructor'
      });
    }

    // Non-admin instructors can only create courses for themselves
    if (currentUserRole === 'instructor' && instructor_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Instructors can only create courses for themselves'
      });
    }

    // Insert new course - convert undefined to null for database
    const result = await db.query(
      `INSERT INTO courses (course_code, title, description, credits, department, instructor_id, category, prerequisites, max_students, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course_code, 
        title, 
        description || null, 
        credits, 
        department || null, 
        instructor_id, 
        category || null, 
        prerequisites || null, 
        max_students || null, 
        start_date || null, 
        end_date || null
      ]
    );

    // Get the created course
    const newCourses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.prerequisites, c.max_students, c.current_students, 
              c.start_date, c.end_date, c.created_at,
              u.first_name as instructor_first_name, u.last_name as instructor_last_name
       FROM courses c
       INNER JOIN users u ON c.instructor_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: newCourses[0]
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course'
    });
  }
});

// Update course (instructor of course or admin only)
router.put('/:id', authenticateToken, requireInstructor, validateId, canAccessCourse, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { title, description, credits, department, category, prerequisites, max_students, start_date, end_date } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if course exists
    const existingCourses = await db.query('SELECT id, instructor_id FROM courses WHERE id = ?', [courseId]);
    if (existingCourses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can update this course
    if (currentUserRole === 'instructor' && existingCourses[0].instructor_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Update course - convert undefined to null for database
    await db.query(
      `UPDATE courses SET title = ?, description = ?, credits = ?, department = ?, 
              category = ?, prerequisites = ?, max_students = ?, start_date = ?, end_date = ?, 
              updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        title, 
        description || null, 
        credits, 
        department || null, 
        category || null, 
        prerequisites || null, 
        max_students || null, 
        start_date || null, 
        end_date || null, 
        courseId
      ]
    );

    // Get updated course
    const updatedCourses = await db.query(
      `SELECT c.id, c.course_code, c.title, c.description, c.credits, c.department, 
              c.category, c.prerequisites, c.max_students, c.current_students, 
              c.start_date, c.end_date, c.updated_at,
              u.first_name as instructor_first_name, u.last_name as instructor_last_name
       FROM courses c
       INNER JOIN users u ON c.instructor_id = u.id
       WHERE c.id = ?`,
      [courseId]
    );

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourses[0]
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course'
    });
  }
});

// Delete course (instructor of course or admin only)
router.delete('/:id', authenticateToken, requireInstructor, validateId, canAccessCourse, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if course exists
    const existingCourses = await db.query('SELECT id, instructor_id, current_students FROM courses WHERE id = ?', [courseId]);
    if (existingCourses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can delete this course
    if (currentUserRole === 'instructor' && existingCourses[0].instructor_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not the instructor of this course'
      });
    }

    // Check if course has enrolled students
    if (existingCourses[0].current_students > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with enrolled students'
      });
    }

    // Delete course (cascade will handle related records)
    await db.query('DELETE FROM courses WHERE id = ?', [courseId]);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course'
    });
  }
});

// Get course statistics
router.get('/:id/stats', authenticateToken, requireUser, validateId, canAccessCourse, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    // Get enrollment statistics
    const enrollmentStats = await db.query(`
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_enrollments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_enrollments,
        SUM(CASE WHEN status = 'dropped' THEN 1 ELSE 0 END) as dropped_enrollments
      FROM enrollments 
      WHERE course_id = ?
    `, [courseId]);

    // Get assessment statistics
    const assessmentStats = await db.query(`
      SELECT 
        COUNT(*) as total_assessments,
        SUM(CASE WHEN is_published = true THEN 1 ELSE 0 END) as published_assessments
      FROM assessments 
      WHERE course_id = ?
    `, [courseId]);

    // Get material statistics
    const materialStats = await db.query(`
      SELECT 
        COUNT(*) as total_materials,
        material_type,
        COUNT(*) as count
      FROM course_materials 
      WHERE course_id = ?
      GROUP BY material_type
    `, [courseId]);

    res.json({
      success: true,
      data: {
        enrollments: enrollmentStats[0],
        assessments: assessmentStats[0],
        materials: materialStats
      }
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course statistics'
    });
  }
});

module.exports = router;
