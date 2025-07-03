const express = require('express')
const router = express.Router()
const { authenticate, authorize, requireRole } = require('../middleware/auth')
const jsonDB = require('../config/jsonDatabase')

// 获取所有用户（管理员）
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const users = await jsonDB.find('users')
    
    // 移除敏感信息
    const safeUsers = users.map(user => {
      const { password, emailVerificationToken, passwordResetToken, ...safeUser } = user
      return safeUser
    })

    res.json({
      success: true,
      data: safeUsers
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取单个用户
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const user = await jsonDB.findById('users', id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 检查权限：只能查看自己的信息或管理员可以查看所有
    if (req.user.userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    // 移除敏感信息
    const { password, emailVerificationToken, passwordResetToken, ...safeUser } = user

    res.json({
      success: true,
      data: safeUser
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 更新用户信息（管理员）
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // 不允许直接更新的字段
    const restrictedFields = ['password', 'emailVerificationToken', 'passwordResetToken']
    restrictedFields.forEach(field => delete updates[field])

    const updatedUser = await jsonDB.updateById('users', id, updates)

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 移除敏感信息
    const { password, emailVerificationToken, passwordResetToken, ...safeUser } = updatedUser

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: safeUser
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除用户（管理员）
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params

    // 不能删除自己
    if (req.user.userId === id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      })
    }

    const deletedUser = await jsonDB.deleteById('users', id)

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      message: '用户删除成功'
    })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

module.exports = router
