const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    const users = await db.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = authorize('admin');

// Check if user is instructor or admin
const requireInstructor = authorize('instructor', 'admin');

// Check if user is student, instructor, or admin
const requireUser = authorize('student', 'instructor', 'admin');

// Check if user can access course (instructor of course or enrolled student)
const canAccessCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can access all courses
    if (userRole === 'admin') {
      return next();
    }

    // Check if user is instructor of the course
    if (userRole === 'instructor') {
      const courses = await db.query(
        'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
        [courseId, userId]
      );
      
      if (courses.length > 0) {
        return next();
      }
    }

    // Check if user is enrolled in the course
    const enrollments = await db.query(
      'SELECT id FROM enrollments WHERE course_id = ? AND student_id = ? AND status = "active"',
      [courseId, userId]
    );

    if (enrollments.length > 0) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied - not enrolled in this course'
    });
  } catch (error) {
    console.error('Course access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking course access'
    });
  }
};

// Check if user can access student data (instructor of course or admin)
const canAccessStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can access all student data
    if (userRole === 'admin') {
      return next();
    }

    // Check if user is instructor of any course the student is enrolled in
    if (userRole === 'instructor') {
      const courses = await db.query(`
        SELECT c.id FROM courses c
        INNER JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = ? AND c.instructor_id = ? AND e.status = 'active'
      `, [studentId, userId]);

      if (courses.length > 0) {
        return next();
      }
    }

    // Students can only access their own data
    if (userRole === 'student' && parseInt(studentId) === userId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied - insufficient permissions'
    });
  } catch (error) {
    console.error('Student access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking student access'
    });
  }
};

module.exports = {
  authenticateToken,
  authorize,
  requireAdmin,
  requireInstructor,
  requireUser,
  canAccessCourse,
  canAccessStudent
};
