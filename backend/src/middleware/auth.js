const jwt = require('jsonwebtoken')
const jsonDB = require('../config/jsonDatabase')

// JWT认证中间件
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失或格式错误'
      })
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌不能为空'
      })
    }

    // 验证JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 查找用户
    const user = await jsonDB.findById('users', decoded.userId)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      })
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    }

    next()

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌无效'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期'
      })
    }

    console.error('认证中间件错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 权限检查中间件
const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      })
    }

    // 管理员拥有所有权限
    if (req.user.role === 'admin') {
      return next()
    }

    // 检查用户是否拥有所需权限
    const hasPermission = permissions.some(permission => 
      req.user.permissions.includes(permission)
    )

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
        requiredPermissions: permissions,
        userPermissions: req.user.permissions
      })
    }

    next()
  }
}

// 角色检查中间件
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '角色权限不足',
        requiredRoles: roles,
        userRole: req.user.role
      })
    }

    next()
  }
}

// 可选认证中间件（不强制要求认证）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return next()
    }

    // 验证JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 查找用户
    const user = await jsonDB.findById('users', decoded.userId)
    
    if (user && user.isActive) {
      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    }

    next()

  } catch (error) {
    // 可选认证失败时不返回错误，继续执行
    next()
  }
}

// 资源所有者检查中间件
const requireOwnership = (resourceModel, resourceIdParam = 'id', ownerField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        })
      }

      // 管理员可以访问所有资源
      if (req.user.role === 'admin') {
        return next()
      }

      const resourceId = req.params[resourceIdParam]
      const resource = await resourceModel.findById(resourceId)

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: '资源不存在'
        })
      }

      // 检查资源所有权
      const ownerId = resource[ownerField]
      if (ownerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: '无权访问此资源'
        })
      }

      // 将资源添加到请求对象中，避免重复查询
      req.resource = resource

      next()

    } catch (error) {
      console.error('资源所有权检查错误:', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

// API限流中间件
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map()

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()
    const windowStart = now - windowMs

    // 清理过期记录
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart)
      requests.set(key, userRequests)
    } else {
      requests.set(key, [])
    }

    const userRequests = requests.get(key)

    if (userRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil(windowMs / 1000)
      })
    }

    userRequests.push(now)
    requests.set(key, userRequests)

    // 设置响应头
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': max - userRequests.length,
      'X-RateLimit-Reset': new Date(now + windowMs)
    })

    next()
  }
}

// 验证用户状态中间件
const requireActiveUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      })
    }

    const user = await jsonDB.findById('users', req.user.userId)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用，请联系管理员'
      })
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: '请先验证邮箱地址'
      })
    }

    next()

  } catch (error) {
    console.error('用户状态验证错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

module.exports = {
  authenticate,
  authorize,
  requireRole,
  optionalAuth,
  requireOwnership,
  rateLimit,
  requireActiveUser
}
