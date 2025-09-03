const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('role')
    .isIn(['student', 'instructor', 'admin'])
    .withMessage('Role must be student, instructor, or admin'),
  body('student_id')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('Student ID must be between 5 and 20 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// Course validation rules
const validateCourse = [
  body('course_code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Course code must be between 3 and 20 characters'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('credits')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Credits must be between 1 and 6'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  body('instructor_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid instructor ID is required'),
  body('max_students')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Max students must be between 1 and 200'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required'),
  handleValidationErrors
];

// Assessment validation rules
const validateAssessment = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('assessment_type')
    .isIn(['assignment', 'quiz', 'exam', 'project'])
    .withMessage('Assessment type must be assignment, quiz, exam, or project'),
  body('total_marks')
    .isFloat({ min: 1, max: 1000 })
    .withMessage('Total marks must be between 1 and 1000'),
  body('weight_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Weight percentage must be between 0 and 100'),
  body('due_date')
    .isISO8601()
    .withMessage('Valid due date is required'),
  handleValidationErrors
];

// Result validation rules
const validateResult = [
  body('marks_obtained')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Marks obtained must be a positive number'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must be less than 1000 characters'),
  handleValidationErrors
];

// Enrollment validation rules
const validateEnrollment = [
  body('student_id')
    .isInt({ min: 1 })
    .withMessage('Valid student ID is required'),
  body('course_id')
    .isInt({ min: 1 })
    .withMessage('Valid course ID is required'),
  handleValidationErrors
];

// Message validation rules
const validateMessage = [
  body('recipient_id')
    .isInt({ min: 1 })
    .withMessage('Valid recipient ID is required'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Subject must be between 5 and 255 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  handleValidationErrors
];

// Announcement validation rules
const validateAnnouncement = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateCourse,
  validateAssessment,
  validateResult,
  validateEnrollment,
  validateMessage,
  validateAnnouncement,
  validateId,
  validatePagination,
  validateLogin,
  validatePasswordChange
};
