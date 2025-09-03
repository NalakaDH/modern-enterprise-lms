const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireUser } = require('../middleware/auth');
const { validateUser, validateId, validatePagination, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const role = req.query.role;
    const search = req.query.search;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (role && role !== 'all') {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR student_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get users
    const users = await db.query(
      `SELECT id, email, first_name, last_name, role, student_id, department, phone, 
              is_active, email_verified, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, requireUser, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Check if user can access this profile
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const users = await db.query(
      `SELECT id, email, first_name, last_name, role, student_id, department, phone, 
              address, profile_image, is_active, email_verified, created_at, updated_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, validateUser, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, student_id, department, phone, address, is_active } = req.body;

    // Check if user already exists
    const existingUsers = await db.query(
      'SELECT id FROM users WHERE email = ? OR (student_id = ? AND student_id IS NOT NULL)',
      [email, student_id || null]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or student ID already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user - convert undefined to null for database
    const result = await db.query(
      `INSERT INTO users (email, password, first_name, last_name, role, student_id, department, phone, address, is_active, email_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email, 
        hashedPassword, 
        first_name, 
        last_name, 
        role, 
        student_id || null, 
        department || null, 
        phone || null, 
        address || null, 
        is_active !== undefined ? is_active : true, 
        true
      ]
    );

    // Get the created user
    const newUsers = await db.query(
      'SELECT id, email, first_name, last_name, role, student_id, department, phone, address, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUsers[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { first_name, last_name, role, student_id, department, phone, address, is_active } = req.body;

    // Check if user exists
    const existingUsers = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for duplicate student_id if provided
    if (student_id) {
      const duplicateUsers = await db.query(
        'SELECT id FROM users WHERE student_id = ? AND id != ?',
        [student_id, userId]
      );
      if (duplicateUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    // Update user - convert undefined to null for database
    await db.query(
      `UPDATE users SET first_name = ?, last_name = ?, role = ?, student_id = ?, 
              department = ?, phone = ?, address = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        first_name, 
        last_name, 
        role, 
        student_id || null, 
        department || null, 
        phone || null, 
        address || null, 
        is_active !== undefined ? is_active : true, 
        userId
      ]
    );

    // Get updated user
    const updatedUsers = await db.query(
      'SELECT id, email, first_name, last_name, role, student_id, department, phone, address, is_active FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUsers[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existingUsers = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of the last admin
    if (existingUsers[0].role === 'admin') {
      const adminCount = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last administrator'
        });
      }
    }

    // Delete user (cascade will handle related records)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Toggle user active status (admin only)
router.patch('/:id/toggle-status', authenticateToken, requireAdmin, validateId, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existingUsers = await db.query('SELECT id, is_active, role FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentStatus = existingUsers[0].is_active;
    const newStatus = !currentStatus;

    // Prevent deactivating the last admin
    if (existingUsers[0].role === 'admin' && newStatus === false) {
      const adminCount = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = true');
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last administrator'
        });
      }
    }

    // Update status
    await db.query(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, userId]
    );

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: userId,
        is_active: newStatus
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        role,
        COUNT(*) as count,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count
      FROM users 
      GROUP BY role
    `);

    const totalUsers = await db.query('SELECT COUNT(*) as total FROM users');
    const activeUsers = await db.query('SELECT COUNT(*) as active FROM users WHERE is_active = true');

    res.json({
      success: true,
      data: {
        total: totalUsers[0].total,
        active: activeUsers[0].active,
        byRole: stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;
