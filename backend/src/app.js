const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const path = require('path')
require('dotenv').config()

// 导入配置和工具
const jsonDB = require('./config/jsonDatabase')
const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')

// 导入路由
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const documentRoutes = require('./routes/documents')
const translationRoutes = require('./routes/translation')
const terminologyRoutes = require('./routes/terminology')
const analyticsRoutes = require('./routes/analytics')

const app = express()

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// 压缩响应
app.use(compression())

// 请求日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }))
}

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP 100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// 解析请求体
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/translate', translationRoutes)
app.use('/api/terminology', terminologyRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/batch', require('./routes/batch'))
app.use('/api/editor', require('./routes/editor'))
app.use('/api/quality', require('./routes/quality'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/system', require('./routes/system'))

// API文档 (开发环境)
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SWAGGER === 'true') {
  const swaggerUi = require('swagger-ui-express')
  const swaggerDocument = require('./docs/swagger.json')
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '简仪科技翻译系统 API 文档'
  }))
}

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  })
})

// 全局错误处理
app.use(errorHandler)

// 全局server变量
let server = null

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭...')
  if (server) {
    server.close(() => {
      logger.info('HTTP服务器已关闭')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
})

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭...')
  if (server) {
    server.close(() => {
      logger.info('HTTP服务器已关闭')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
})

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason)
  process.exit(1)
})

// 启动服务器函数
async function startServer() {
  try {
    // 初始化JSON数据库
    await jsonDB.init()
    
    const PORT = process.env.PORT || 5000
    const HOST = process.env.HOST || 'localhost'

    server = app.listen(PORT, HOST, () => {
      logger.info(`简仪科技翻译系统后端服务启动成功`)
      logger.info(`服务地址: http://${HOST}:${PORT}`)
      logger.info(`环境: ${process.env.NODE_ENV}`)
      logger.info(`进程ID: ${process.pid}`)
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API文档: http://${HOST}:${PORT}/api-docs`)
        logger.info(`健康检查: http://${HOST}:${PORT}/health`)
      }
    })

    // 设置服务器超时
    server.timeout = 30000 // 30秒
    
    return server
  } catch (err) {
    logger.error('服务器启动失败:', err)
    process.exit(1)
  }
}

// 启动服务器
startServer()

module.exports = app
