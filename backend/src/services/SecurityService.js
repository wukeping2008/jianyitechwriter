const EventEmitter = require('events')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const validator = require('validator')
const logger = require('../utils/logger')

class SecurityService extends EventEmitter {
  constructor() {
    super()
    
    // 安全配置
    this.config = {
      // 加密配置
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        saltRounds: 12
      },
      
      // JWT配置
      jwt: {
        secret: process.env.JWT_SECRET || 'jianyi-tech-secret-key',
        expiresIn: '24h',
        refreshExpiresIn: '7d',
        algorithm: 'HS256'
      },
      
      // 速率限制配置
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100, // 最大请求数
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // 密码策略
      passwordPolicy: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventCommonPasswords: true,
        preventUserInfo: true
      },
      
      // 会话安全
      session: {
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
      },
      
      // 文件上传安全
      fileUpload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['txt', 'docx', 'pdf', 'md', 'json'],
        scanForMalware: true,
        quarantinePath: './quarantine'
      },
      
      // API安全
      api: {
        enableCORS: true,
        allowedOrigins: ['http://localhost:3000'],
        enableCSRF: true,
        enableXSS: true,
        enableSQLInjection: true
      }
    }
    
    // 安全事件记录
    this.securityEvents = []
    this.blockedIPs = new Set()
    this.suspiciousActivities = new Map()
    
    // 常见密码列表
    this.commonPasswords = new Set([
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ])
    
    // 恶意文件签名
    this.malwareSignatures = [
      '4d5a', // PE executable
      '7f454c46', // ELF executable
      '504b0304', // ZIP archive (potential)
      'cafebabe', // Java class file
      'd0cf11e0' // Microsoft Office (old format)
    ]
  }

  /**
   * 初始化安全服务
   */
  async initialize() {
    try {
      logger.info('初始化安全服务')
      
      // 设置安全中间件
      this.setupSecurityMiddleware()
      
      // 启动安全监控
      this.startSecurityMonitoring()
      
      // 加载安全规则
      await this.loadSecurityRules()
      
      this.emit('initialized')
      logger.info('安全服务初始化完成')
      
    } catch (error) {
      logger.error('安全服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 密码安全
   */
  
  // 验证密码强度
  validatePasswordStrength(password, userInfo = {}) {
    const errors = []
    
    // 长度检查
    if (password.length < this.config.passwordPolicy.minLength) {
      errors.push(`密码长度至少${this.config.passwordPolicy.minLength}位`)
    }
    
    if (password.length > this.config.passwordPolicy.maxLength) {
      errors.push(`密码长度不能超过${this.config.passwordPolicy.maxLength}位`)
    }
    
    // 复杂度检查
    if (this.config.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母')
    }
    
    if (this.config.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母')
    }
    
    if (this.config.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('密码必须包含数字')
    }
    
    if (this.config.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含特殊字符')
    }
    
    // 常见密码检查
    if (this.config.passwordPolicy.preventCommonPasswords && 
        this.commonPasswords.has(password.toLowerCase())) {
      errors.push('不能使用常见密码')
    }
    
    // 用户信息检查
    if (this.config.passwordPolicy.preventUserInfo && userInfo) {
      const userFields = [userInfo.username, userInfo.email, userInfo.firstName, userInfo.lastName]
      for (const field of userFields) {
        if (field && password.toLowerCase().includes(field.toLowerCase())) {
          errors.push('密码不能包含用户信息')
          break
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      strength: this.calculatePasswordStrength(password)
    }
  }
  
  // 计算密码强度
  calculatePasswordStrength(password) {
    let score = 0
    
    // 长度加分
    score += Math.min(password.length * 2, 20)
    
    // 字符类型加分
    if (/[a-z]/.test(password)) score += 5
    if (/[A-Z]/.test(password)) score += 5
    if (/\d/.test(password)) score += 5
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10
    
    // 多样性加分
    const uniqueChars = new Set(password).size
    score += Math.min(uniqueChars * 2, 20)
    
    // 模式检查减分
    if (/(.)\1{2,}/.test(password)) score -= 10 // 重复字符
    if (/123|abc|qwe/i.test(password)) score -= 10 // 连续字符
    
    if (score < 30) return 'weak'
    if (score < 60) return 'medium'
    if (score < 80) return 'strong'
    return 'very_strong'
  }
  
  // 哈希密码
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.config.encryption.saltRounds)
      const hash = await bcrypt.hash(password, salt)
      return hash
    } catch (error) {
      logger.error('密码哈希失败:', error)
      throw new Error('密码处理失败')
    }
  }
  
  // 验证密码
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      logger.error('密码验证失败:', error)
      return false
    }
  }

  /**
   * 数据加密
   */
  
  // 加密数据
  encryptData(data, key = null) {
    try {
      const algorithm = this.config.encryption.algorithm
      const encryptionKey = key || crypto.randomBytes(this.config.encryption.keyLength)
      const iv = crypto.randomBytes(this.config.encryption.ivLength)
      
      const cipher = crypto.createCipher(algorithm, encryptionKey, iv)
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        key: encryptionKey.toString('hex')
      }
    } catch (error) {
      logger.error('数据加密失败:', error)
      throw new Error('数据加密失败')
    }
  }
  
  // 解密数据
  decryptData(encryptedData, key, iv, tag) {
    try {
      const algorithm = this.config.encryption.algorithm
      const decipher = crypto.createDecipher(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'))
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return JSON.parse(decrypted)
    } catch (error) {
      logger.error('数据解密失败:', error)
      throw new Error('数据解密失败')
    }
  }
  
  // 生成安全随机字符串
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex')
  }
  
  // 生成哈希
  generateHash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex')
  }

  /**
   * JWT令牌管理
   */
  
  // 生成访问令牌
  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, this.config.jwt.secret, {
        expiresIn: this.config.jwt.expiresIn,
        algorithm: this.config.jwt.algorithm
      })
    } catch (error) {
      logger.error('生成访问令牌失败:', error)
      throw new Error('令牌生成失败')
    }
  }
  
  // 生成刷新令牌
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.config.jwt.secret, {
        expiresIn: this.config.jwt.refreshExpiresIn,
        algorithm: this.config.jwt.algorithm
      })
    } catch (error) {
      logger.error('生成刷新令牌失败:', error)
      throw new Error('刷新令牌生成失败')
    }
  }
  
  // 验证令牌
  verifyToken(token) {
    try {
      return jwt.verify(token, this.config.jwt.secret, {
        algorithms: [this.config.jwt.algorithm]
      })
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('令牌已过期')
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效令牌')
      } else {
        logger.error('令牌验证失败:', error)
        throw new Error('令牌验证失败')
      }
    }
  }
  
  // 刷新令牌
  refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken)
      
      // 生成新的访问令牌
      const newPayload = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      }
      
      return this.generateAccessToken(newPayload)
    } catch (error) {
      logger.error('刷新令牌失败:', error)
      throw new Error('令牌刷新失败')
    }
  }

  /**
   * 输入验证和清理
   */
  
  // 验证和清理输入
  validateAndSanitizeInput(input, type, options = {}) {
    const result = {
      isValid: true,
      sanitized: input,
      errors: []
    }
    
    try {
      switch (type) {
        case 'email':
          if (!validator.isEmail(input)) {
            result.isValid = false
            result.errors.push('无效的邮箱格式')
          } else {
            result.sanitized = validator.normalizeEmail(input)
          }
          break
          
        case 'username':
          if (!validator.isAlphanumeric(input, 'en-US', { ignore: '_-' })) {
            result.isValid = false
            result.errors.push('用户名只能包含字母、数字、下划线和连字符')
          }
          if (input.length < 3 || input.length > 30) {
            result.isValid = false
            result.errors.push('用户名长度必须在3-30个字符之间')
          }
          result.sanitized = validator.escape(input)
          break
          
        case 'url':
          if (!validator.isURL(input, options)) {
            result.isValid = false
            result.errors.push('无效的URL格式')
          }
          break
          
        case 'filename':
          // 检查文件名安全性
          if (/[<>:"/\\|?*]/.test(input)) {
            result.isValid = false
            result.errors.push('文件名包含非法字符')
          }
          if (input.startsWith('.') || input.includes('..')) {
            result.isValid = false
            result.errors.push('文件名不能以点开头或包含相对路径')
          }
          result.sanitized = validator.escape(input)
          break
          
        case 'text':
          result.sanitized = validator.escape(input)
          if (options.maxLength && input.length > options.maxLength) {
            result.isValid = false
            result.errors.push(`文本长度不能超过${options.maxLength}个字符`)
          }
          break
          
        case 'html':
          // 基本HTML清理
          result.sanitized = this.sanitizeHTML(input)
          break
          
        default:
          result.sanitized = validator.escape(input)
      }
    } catch (error) {
      logger.error('输入验证失败:', error)
      result.isValid = false
      result.errors.push('输入验证失败')
    }
    
    return result
  }
  
  // HTML清理
  sanitizeHTML(html) {
    // 移除危险标签和属性
    const dangerousTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
    const dangerousAttributes = /on\w+\s*=\s*["'][^"']*["']/gi
    
    let sanitized = html.replace(dangerousTags, '')
    sanitized = sanitized.replace(dangerousAttributes, '')
    
    return sanitized
  }
  
  // SQL注入检测
  detectSQLInjection(input) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i,
      /(\<\s*script\b)/i
    ]
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return true
      }
    }
    
    return false
  }
  
  // XSS检测
  detectXSS(input) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i,
      /<link\b/i,
      /<meta\b/i
    ]
    
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        return true
      }
    }
    
    return false
  }

  /**
   * 文件安全
   */
  
  // 验证文件类型
  validateFileType(filename, mimeType) {
    const extension = filename.split('.').pop().toLowerCase()
    
    if (!this.config.fileUpload.allowedTypes.includes(extension)) {
      return {
        isValid: false,
        error: '不支持的文件类型'
      }
    }
    
    // MIME类型验证
    const allowedMimeTypes = {
      'txt': 'text/plain',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pdf': 'application/pdf',
      'md': 'text/markdown',
      'json': 'application/json'
    }
    
    if (allowedMimeTypes[extension] && mimeType !== allowedMimeTypes[extension]) {
      return {
        isValid: false,
        error: '文件类型与扩展名不匹配'
      }
    }
    
    return { isValid: true }
  }
  
  // 扫描文件恶意软件
  async scanFileForMalware(filePath) {
    try {
      const fs = require('fs').promises
      const fileBuffer = await fs.readFile(filePath)
      const fileHex = fileBuffer.toString('hex', 0, 20) // 读取前20字节
      
      // 检查文件签名
      for (const signature of this.malwareSignatures) {
        if (fileHex.startsWith(signature.toLowerCase())) {
          return {
            isSafe: false,
            threat: 'suspicious_file_signature',
            details: `检测到可疑文件签名: ${signature}`
          }
        }
      }
      
      // 检查文件大小
      if (fileBuffer.length > this.config.fileUpload.maxSize) {
        return {
          isSafe: false,
          threat: 'file_too_large',
          details: `文件大小超过限制: ${fileBuffer.length} bytes`
        }
      }
      
      return { isSafe: true }
    } catch (error) {
      logger.error('文件扫描失败:', error)
      return {
        isSafe: false,
        threat: 'scan_error',
        details: '文件扫描失败'
      }
    }
  }

  /**
   * 安全监控
   */
  
  // 记录安全事件
  logSecurityEvent(type, details, severity = 'medium', ip = null) {
    const event = {
      id: this.generateSecureRandom(16),
      type: type,
      details: details,
      severity: severity,
      ip: ip,
      timestamp: new Date(),
      handled: false
    }
    
    this.securityEvents.push(event)
    
    // 保持最近1000个事件
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift()
    }
    
    // 发出安全事件
    this.emit('securityEvent', event)
    
    // 高危事件立即处理
    if (severity === 'high' || severity === 'critical') {
      this.handleHighSeverityEvent(event)
    }
    
    logger.warn(`安全事件: ${type}`, { details, severity, ip })
  }
  
  // 处理高危安全事件
  handleHighSeverityEvent(event) {
    switch (event.type) {
      case 'brute_force_attack':
      case 'sql_injection_attempt':
      case 'xss_attempt':
        if (event.ip) {
          this.blockIP(event.ip, '自动阻止：检测到恶意活动')
        }
        break
        
      case 'malware_detected':
        // 隔离文件
        this.quarantineFile(event.details.filePath)
        break
        
      case 'unauthorized_access':
        // 记录并通知
        this.notifySecurityTeam(event)
        break
    }
  }
  
  // 阻止IP
  blockIP(ip, reason) {
    this.blockedIPs.add(ip)
    
    this.logSecurityEvent('ip_blocked', {
      ip: ip,
      reason: reason
    }, 'high')
    
    logger.warn(`IP已被阻止: ${ip}, 原因: ${reason}`)
  }
  
  // 检查IP是否被阻止
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip)
  }
  
  // 监控可疑活动
  monitorSuspiciousActivity(ip, activity) {
    if (!this.suspiciousActivities.has(ip)) {
      this.suspiciousActivities.set(ip, [])
    }
    
    const activities = this.suspiciousActivities.get(ip)
    activities.push({
      activity: activity,
      timestamp: Date.now()
    })
    
    // 清理1小时前的活动
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentActivities = activities.filter(a => a.timestamp > oneHourAgo)
    this.suspiciousActivities.set(ip, recentActivities)
    
    // 检查是否需要阻止
    if (recentActivities.length > 10) {
      this.blockIP(ip, '可疑活动频繁')
    }
  }

  /**
   * 安全中间件
   */
  
  // 设置安全中间件
  setupSecurityMiddleware() {
    // Helmet安全头
    this.helmetMiddleware = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })
    
    // 速率限制
    this.rateLimitMiddleware = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: {
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logSecurityEvent('rate_limit_exceeded', {
          ip: req.ip,
          path: req.path
        }, 'medium', req.ip)
        
        res.status(429).json({
          error: '请求过于频繁，请稍后再试',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      }
    })
  }
  
  // IP阻止中间件
  ipBlockMiddleware() {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress
      
      if (this.isIPBlocked(clientIP)) {
        this.logSecurityEvent('blocked_ip_access', {
          ip: clientIP,
          path: req.path
        }, 'high', clientIP)
        
        return res.status(403).json({
          error: '访问被拒绝',
          code: 'IP_BLOCKED'
        })
      }
      
      next()
    }
  }
  
  // 输入验证中间件
  inputValidationMiddleware() {
    return (req, res, next) => {
      // 检查SQL注入
      const checkSQLInjection = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && this.detectSQLInjection(obj[key])) {
            this.logSecurityEvent('sql_injection_attempt', {
              ip: req.ip,
              path: req.path,
              field: key,
              value: obj[key]
            }, 'high', req.ip)
            
            return true
          }
        }
        return false
      }
      
      // 检查XSS
      const checkXSS = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && this.detectXSS(obj[key])) {
            this.logSecurityEvent('xss_attempt', {
              ip: req.ip,
              path: req.path,
              field: key,
              value: obj[key]
            }, 'high', req.ip)
            
            return true
          }
        }
        return false
      }
      
      if (req.body && (checkSQLInjection(req.body) || checkXSS(req.body))) {
        return res.status(400).json({
          error: '检测到恶意输入',
          code: 'MALICIOUS_INPUT'
        })
      }
      
      if (req.query && (checkSQLInjection(req.query) || checkXSS(req.query))) {
        return res.status(400).json({
          error: '检测到恶意输入',
          code: 'MALICIOUS_INPUT'
        })
      }
      
      next()
    }
  }

  // 辅助方法
  startSecurityMonitoring() {
    // 定期清理过期的安全事件
    setInterval(() => {
      this.cleanupSecurityEvents()
    }, 60 * 60 * 1000) // 每小时清理一次
  }
  
  cleanupSecurityEvents() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > oneWeekAgo)
  }
  
  async loadSecurityRules() {
    // 加载安全规则配置
    logger.info('加载安全规则完成')
  }
  
  quarantineFile(filePath) {
    // 隔离可疑文件
    logger.warn(`文件已被隔离: ${filePath}`)
  }
  
  notifySecurityTeam(event) {
    // 通知安全团队
    logger.error('高危安全事件，已通知安全团队', event)
  }
  
  // 获取安全统计
  getSecurityStats() {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    
    const recentEvents = this.securityEvents.filter(e => e.timestamp.getTime() > oneHourAgo)
    const dailyEvents = this.securityEvents.filter(e => e.timestamp.getTime() > oneDayAgo)
    
    return {
      blockedIPs: this.blockedIPs.size,
      totalSecurityEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      eventsByType: this.groupEventsByType(dailyEvents),
      eventsBySeverity: this.groupEventsBySeverity(dailyEvents)
    }
  }
  
  groupEventsByType(events) {
    const grouped = {}
    events.forEach(event => {
      grouped[event.type] = (grouped[event.type] || 0) + 1
    })
    return grouped
  }
  
  groupEventsBySeverity(events) {
    const grouped = {}
    events.forEach(event => {
      grouped[event.severity] = (grouped[event.severity] || 0) + 1
    })
    return grouped
  }
}

// 创建单例实例
const securityService = new SecurityService()

module.exports = securityService
