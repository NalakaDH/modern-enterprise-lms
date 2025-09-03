const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Fetching dashboard data...');
    
    // Get user statistics
    const userStats = await db.query(`
      SELECT 
        role,
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active
      FROM users 
      GROUP BY role
    `);
    
    console.log('User stats:', userStats);

    // Get course statistics
    const courseStats = await db.query(`
      SELECT 
        COUNT(*) as total_courses,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_courses,
        SUM(current_students) as total_enrollments
      FROM courses
    `);
    
    console.log('Course stats:', courseStats);

    // Get enrollment statistics (optional - table might not exist yet)
    let enrollmentStats = [];
    try {
      enrollmentStats = await db.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM enrollments 
        GROUP BY status
      `);
    } catch (enrollmentError) {
      console.log('Enrollments table not found, using empty array:', enrollmentError.message);
      enrollmentStats = [];
    }

    // Get recent activities
    const recentUsers = await db.query(`
      SELECT first_name, last_name, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Get recent courses (optional - might have issues with joins)
    let recentCourses = [];
    try {
      recentCourses = await db.query(`
        SELECT c.course_code, c.title, u.first_name, u.last_name, c.created_at
        FROM courses c
        INNER JOIN users u ON c.instructor_id = u.id
        ORDER BY c.created_at DESC 
        LIMIT 5
      `);
    } catch (coursesError) {
      console.log('Recent courses query failed, using empty array:', coursesError.message);
      recentCourses = [];
    }

    const responseData = {
      success: true,
      data: {
        users: userStats,
        courses: courseStats[0],
        enrollments: enrollmentStats,
        recentUsers,
        recentCourses
      }
    };
    
    console.log('Dashboard response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get system settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await db.query('SELECT setting_key, setting_value, description FROM system_settings');
    
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update system settings
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    const adminId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
        [value, adminId, key]
      );
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const action = req.query.action;
    const user_id = req.query.user_id;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get audit logs
    const logs = await db.query(
      `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, 
              al.details, al.ip_address, al.created_at,
              u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

module.exports = router;
