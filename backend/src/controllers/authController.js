const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jsonDB = require('../config/jsonDatabase')
const { validationResult } = require('express-validator')

// 生成JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// 生成刷新Token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex')
}

// 用户注册
const register = async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      })
    }

    const { username, email, password, fullName, role = 'user' } = req.body

    // 检查用户是否已存在
    const existingUserByEmail = await jsonDB.findOne('users', { email })
    const existingUserByUsername = await jsonDB.findOne('users', { username })

    if (existingUserByEmail || existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: existingUserByEmail ? '邮箱已被注册' : '用户名已被使用'
      })
    }

    // 设置默认权限
    const defaultPermissions = {
      user: ['translate_documents'],
      translator: ['translate_documents', 'generate_documents', 'export_documents'],
      reviewer: ['translate_documents', 'generate_documents', 'review_translations', 'export_documents'],
      admin: [
        'translate_documents',
        'generate_documents', 
        'manage_terminology',
        'review_translations',
        'manage_users',
        'manage_templates',
        'access_analytics',
        'export_documents',
        'manage_projects'
      ]
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建新用户
    const userData = {
      username,
      email,
      password: hashedPassword,
      fullName,
      role,
      permissions: defaultPermissions[role] || defaultPermissions.user,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      isActive: true,
      isEmailVerified: false,
      lastActiveAt: new Date().toISOString(),
      profile: {
        firstName: fullName?.split(' ')[0] || '',
        lastName: fullName?.split(' ').slice(1).join(' ') || '',
        department: '',
        position: ''
      },
      preferences: {
        language: 'zh-CN',
        theme: 'light',
        notifications: true
      }
    }

    const user = await jsonDB.insertOne('users', userData)

    // 生成Token
    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken()

    // 返回用户信息（不包含密码）
    const { password: _, emailVerificationToken, ...userResponse } = user

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    })

  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 用户登录
const login = async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      })
    }

    const { email, password, rememberMe = false } = req.body

    // 查找用户
    const user = await jsonDB.findOne('users', { email })
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 检查账户状态
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用，请联系管理员'
      })
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 更新最后活跃时间
    await jsonDB.updateById('users', user.id, {
      lastActiveAt: new Date().toISOString()
    })

    // 生成Token
    const tokenExpiry = rememberMe ? '30d' : '7d'
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    )
    const refreshToken = generateRefreshToken()

    // 返回用户信息（不包含密码）
    const { password: _, emailVerificationToken, passwordResetToken, ...userResponse } = user

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      }
    })

  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  try {
    const user = await jsonDB.findById('users', req.user.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 返回用户信息（不包含敏感字段）
    const { password, emailVerificationToken, passwordResetToken, ...userResponse } = user

    res.json({
      success: true,
      data: { user: userResponse }
    })

  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 更新用户资料
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      })
    }

    const userId = req.user.userId
    const updates = req.body

    // 不允许直接更新的字段
    const restrictedFields = ['password', 'role', 'permissions', 'isActive', 'emailVerificationToken']
    restrictedFields.forEach(field => delete updates[field])

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      message: '资料更新成功',
      data: { user }
    })

  } catch (error) {
    console.error('更新资料错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 修改密码
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      })
    }

    const { currentPassword, newPassword } = req.body
    const userId = req.user.userId

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 验证当前密码
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      })
    }

    // 更新密码
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: '密码修改成功'
    })

  } catch (error) {
    console.error('修改密码错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 忘记密码
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findByEmail(email)
    if (!user) {
      // 为了安全，即使用户不存在也返回成功消息
      return res.json({
        success: true,
        message: '如果该邮箱存在，重置密码链接已发送'
      })
    }

    // 生成重置Token
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = resetToken
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10分钟后过期

    await user.save()

    // TODO: 发送重置密码邮件
    // await emailService.sendPasswordResetEmail(user.email, resetToken)

    res.json({
      success: true,
      message: '重置密码链接已发送到您的邮箱',
      // 开发环境下返回token便于测试
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    })

  } catch (error) {
    console.error('忘记密码错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 重置密码
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '重置密码链接无效或已过期'
      })
    }

    // 更新密码
    user.password = newPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save()

    res.json({
      success: true,
      message: '密码重置成功'
    })

  } catch (error) {
    console.error('重置密码错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 刷新Token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: '刷新Token不能为空'
      })
    }

    // TODO: 验证刷新Token（需要在数据库中存储）
    // 这里简化处理，实际应用中应该验证refreshToken的有效性

    const decoded = jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET, { ignoreExpiration: true })
    const user = await User.findById(decoded.userId)

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      })
    }

    // 生成新的Token
    const newToken = generateToken(user._id)
    const newRefreshToken = generateRefreshToken()

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    })

  } catch (error) {
    console.error('刷新Token错误:', error)
    res.status(401).json({
      success: false,
      message: 'Token刷新失败'
    })
  }
}

// 登出
const logout = async (req, res) => {
  try {
    // TODO: 将Token加入黑名单或从数据库中删除refreshToken
    
    res.json({
      success: true,
      message: '登出成功'
    })

  } catch (error) {
    console.error('登出错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 验证邮箱
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params

    const user = await User.findOne({ emailVerificationToken: token })
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '验证链接无效'
      })
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    await user.save()

    res.json({
      success: true,
      message: '邮箱验证成功'
    })

  } catch (error) {
    console.error('邮箱验证错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  verifyEmail
}
