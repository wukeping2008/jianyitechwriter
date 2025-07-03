const logger = require('../utils/logger')

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

// 验证错误处理
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => val.message)
  const message = `输入数据验证失败: ${errors.join('. ')}`
  return new AppError(message, 400, 'VALIDATION_ERROR')
}

// 重复字段错误处理
const handleDuplicateFieldsError = (err) => {
  const field = Object.keys(err.keyValue)[0]
  const value = err.keyValue[field]
  const message = `${field} '${value}' 已存在，请使用其他值`
  return new AppError(message, 400, 'DUPLICATE_FIELD')
}

// 类型转换错误处理
const handleCastError = (err) => {
  const message = `无效的 ${err.path}: ${err.value}`
  return new AppError(message, 400, 'INVALID_ID')
}

// JWT错误处理
const handleJWTError = () => {
  return new AppError('访问令牌无效，请重新登录', 401, 'INVALID_TOKEN')
}

const handleJWTExpiredError = () => {
  return new AppError('访问令牌已过期，请重新登录', 401, 'TOKEN_EXPIRED')
}

// 文件上传错误处理
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('文件大小超出限制', 400, 'FILE_TOO_LARGE')
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('文件数量超出限制', 400, 'TOO_MANY_FILES')
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('不支持的文件字段', 400, 'INVALID_FILE_FIELD')
  }
  return new AppError('文件上传失败', 400, 'UPLOAD_ERROR')
}

// 数据库连接错误处理
const handleMongoError = (err) => {
  if (err.name === 'MongoNetworkError') {
    return new AppError('数据库连接失败', 500, 'DB_CONNECTION_ERROR')
  }
  if (err.name === 'MongoTimeoutError') {
    return new AppError('数据库操作超时', 500, 'DB_TIMEOUT')
  }
  return new AppError('数据库操作失败', 500, 'DB_ERROR')
}

// 发送开发环境错误响应
const sendErrorDev = (err, req, res) => {
  // API错误
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack,
      code: err.code
    })
  }

  // 渲染错误页面（如果有前端渲染）
  console.error('ERROR 💥', err)
  return res.status(err.statusCode).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  })
}

// 发送生产环境错误响应
const sendErrorProd = (err, req, res) => {
  // API错误
  if (req.originalUrl.startsWith('/api')) {
    // 操作性错误：发送消息给客户端
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code
      })
    }

    // 编程错误：不泄露错误详情
    console.error('ERROR 💥', err)
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    })
  }

  // 操作性错误：发送消息给客户端
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code
    })
  }

  // 编程错误：不泄露错误详情
  console.error('ERROR 💥', err)
  return res.status(500).json({
    success: false,
    message: '服务器内部错误'
  })
}

// 全局错误处理中间件
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  // 记录错误日志
  logger.logError(err, req)

  // 根据环境发送不同的错误响应
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res)
  } else {
    let error = { ...err }
    error.message = err.message

    // 处理特定类型的错误
    if (error.name === 'CastError') error = handleCastError(error)
    if (error.code === 11000) error = handleDuplicateFieldsError(error)
    if (error.name === 'ValidationError') error = handleValidationError(error)
    if (error.name === 'JsonWebTokenError') error = handleJWTError()
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
    if (error.name === 'MulterError') error = handleMulterError(error)
    if (error.name && error.name.includes('Mongo')) error = handleMongoError(error)

    sendErrorProd(error, req, res)
  }
}

// 404错误处理中间件
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`找不到路径 ${req.originalUrl}`, 404, 'NOT_FOUND')
  next(err)
}

// 异步错误捕获包装器
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

// 验证错误格式化
const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.param || error.path,
    message: error.msg || error.message,
    value: error.value,
    location: error.location
  }))
}

// 业务逻辑错误类
class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message, 400, code)
  }
}

// 权限错误类
class PermissionError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'PERMISSION_DENIED')
  }
}

// 认证错误类
class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_FAILED')
  }
}

// 资源不存在错误类
class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 404, 'RESOURCE_NOT_FOUND')
  }
}

// 冲突错误类
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'RESOURCE_CONFLICT')
  }
}

// 速率限制错误类
class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

// 服务不可用错误类
class ServiceUnavailableError extends AppError {
  constructor(message = '服务暂时不可用') {
    super(message, 503, 'SERVICE_UNAVAILABLE')
  }
}

// 错误响应助手函数
const sendErrorResponse = (res, error, statusCode = 500) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code
    })
  }

  return res.status(statusCode).json({
    success: false,
    message: error.message || '服务器内部错误',
    code: 'INTERNAL_ERROR'
  })
}

// 成功响应助手函数
const sendSuccessResponse = (res, data = null, message = '操作成功', statusCode = 200) => {
  const response = {
    success: true,
    message
  }

  if (data !== null) {
    response.data = data
  }

  return res.status(statusCode).json(response)
}

// 分页响应助手函数
const sendPaginatedResponse = (res, data, pagination, message = '获取成功') => {
  return res.json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  })
}

module.exports = {
  AppError,
  BusinessError,
  PermissionError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  formatValidationErrors,
  sendErrorResponse,
  sendSuccessResponse,
  sendPaginatedResponse
}
