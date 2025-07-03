const winston = require('winston')
const path = require('path')

// 定义日志级别和颜色
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
}

// 添加颜色配置
winston.addColors(logColors)

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // 如果有错误堆栈，添加到日志中
    if (stack) {
      log += `\n${stack}`
    }
    
    // 如果有额外的元数据，添加到日志中
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

// 控制台日志格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`
    if (stack) {
      log += `\n${stack}`
    }
    return log
  })
)

// 创建日志目录
const logDir = path.join(__dirname, '../../logs')
require('fs').mkdirSync(logDir, { recursive: true })

// 配置传输器
const transports = []

// 控制台输出（开发环境）
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  )
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  )
}

// 文件输出
transports.push(
  // 错误日志文件
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // 组合日志文件
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
)

// 创建logger实例
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: logFormat,
  transports,
  exitOnError: false
})

// 处理未捕获的异常和Promise拒绝
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    format: logFormat
  })
)

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log'),
    format: logFormat
  })
)

// 扩展logger功能
logger.stream = {
  write: (message) => {
    logger.http(message.trim())
  }
}

// 添加自定义方法
logger.logRequest = (req, res, responseTime) => {
  const { method, url, ip, headers } = req
  const { statusCode } = res
  
  logger.http('HTTP Request', {
    method,
    url,
    ip,
    userAgent: headers['user-agent'],
    statusCode,
    responseTime: `${responseTime}ms`
  })
}

logger.logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name
  }
  
  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId
    }
  }
  
  logger.error('Application Error', errorInfo)
}

logger.logAuth = (action, userId, details = {}) => {
  logger.info('Authentication Event', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  })
}

logger.logTranslation = (action, userId, documentId, details = {}) => {
  logger.info('Translation Event', {
    action,
    userId,
    documentId,
    timestamp: new Date().toISOString(),
    ...details
  })
}

logger.logGeneration = (action, userId, templateId, details = {}) => {
  logger.info('Document Generation Event', {
    action,
    userId,
    templateId,
    timestamp: new Date().toISOString(),
    ...details
  })
}

logger.logSecurity = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  })
}

logger.logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  })
}

// 数据库操作日志
logger.logDB = (operation, collection, details = {}) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    timestamp: new Date().toISOString(),
    ...details
  })
}

// API调用日志
logger.logAPI = (service, endpoint, method, statusCode, responseTime, details = {}) => {
  logger.info('External API Call', {
    service,
    endpoint,
    method,
    statusCode,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString(),
    ...details
  })
}

// 系统监控日志
logger.logSystem = (metric, value, unit = '', details = {}) => {
  logger.info('System Metric', {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString(),
    ...details
  })
}

// 用户活动日志
logger.logActivity = (userId, action, resource, details = {}) => {
  logger.info('User Activity', {
    userId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...details
  })
}

// 业务逻辑日志
logger.logBusiness = (event, data = {}) => {
  logger.info('Business Event', {
    event,
    timestamp: new Date().toISOString(),
    ...data
  })
}

// 导出logger
module.exports = logger
