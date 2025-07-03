const mongoose = require('mongoose')
const logger = require('../utils/logger')

const connectDB = async () => {
  try {
    // MongoDB连接选项
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // 维护最多10个socket连接
      serverSelectionTimeoutMS: 5000, // 5秒后超时
      socketTimeoutMS: 45000, // 45秒后关闭socket
      family: 4, // 使用IPv4，跳过IPv6
      bufferCommands: false, // 禁用mongoose缓冲
      bufferMaxEntries: 0 // 禁用mongoose缓冲
    }

    // 构建连接字符串
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianyi-translator'
    
    // 连接MongoDB
    const conn = await mongoose.connect(mongoURI, options)
    
    logger.info(`MongoDB连接成功: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`)
    
    // 监听连接事件
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB连接已建立')
    })
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB连接错误:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB连接已断开')
    })
    
    // 应用终止时关闭数据库连接
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close()
        logger.info('MongoDB连接已关闭')
        process.exit(0)
      } catch (err) {
        logger.error('关闭MongoDB连接时出错:', err)
        process.exit(1)
      }
    })
    
    return conn
    
  } catch (error) {
    logger.error('MongoDB连接失败:', error.message)
    
    // 在开发环境中提供更详细的错误信息
    if (process.env.NODE_ENV === 'development') {
      logger.error('连接详情:', {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jianyi-translator',
        error: error.stack
      })
    }
    
    // 退出进程
    process.exit(1)
  }
}

// 数据库健康检查
const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
    
    return {
      status: states[state] || 'unknown',
      readyState: state,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    }
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    }
  }
}

// 获取数据库统计信息
const getDBStats = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('数据库未连接')
    }
    
    const admin = mongoose.connection.db.admin()
    const stats = await admin.serverStatus()
    
    return {
      version: stats.version,
      uptime: stats.uptime,
      connections: stats.connections,
      memory: stats.mem,
      network: stats.network,
      opcounters: stats.opcounters
    }
  } catch (error) {
    logger.error('获取数据库统计信息失败:', error)
    throw error
  }
}

// 创建数据库索引
const createIndexes = async () => {
  try {
    logger.info('开始创建数据库索引...')
    
    // 这里可以添加自定义索引创建逻辑
    // 大部分索引已在模型中定义，这里主要用于复合索引或特殊索引
    
    // 用户集合索引
    await mongoose.connection.collection('users').createIndex(
      { email: 1, isActive: 1 },
      { background: true }
    )
    
    // 文档集合索引
    await mongoose.connection.collection('documents').createIndex(
      { createdBy: 1, status: 1, createdAt: -1 },
      { background: true }
    )
    
    await mongoose.connection.collection('documents').createIndex(
      { 'metadata.productName': 'text', title: 'text', description: 'text' },
      { background: true, name: 'document_search_index' }
    )
    
    // 项目集合索引
    await mongoose.connection.collection('projects').createIndex(
      { 'team.owner': 1, status: 1, 'timeline.endDate': 1 },
      { background: true }
    )
    
    // 模板集合索引
    await mongoose.connection.collection('templates').createIndex(
      { type: 1, productCategory: 1, status: 1 },
      { background: true }
    )
    
    logger.info('数据库索引创建完成')
    
  } catch (error) {
    logger.error('创建数据库索引失败:', error)
    // 索引创建失败不应该阻止应用启动
  }
}

// 数据库清理任务
const cleanupDatabase = async () => {
  try {
    logger.info('开始数据库清理任务...')
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    // 清理过期的密码重置令牌
    await mongoose.connection.collection('users').updateMany(
      { passwordResetExpires: { $lt: new Date() } },
      { 
        $unset: { 
          passwordResetToken: 1, 
          passwordResetExpires: 1 
        } 
      }
    )
    
    // 清理临时文件记录（如果有的话）
    // await mongoose.connection.collection('tempfiles').deleteMany({
    //   createdAt: { $lt: thirtyDaysAgo }
    // })
    
    logger.info('数据库清理任务完成')
    
  } catch (error) {
    logger.error('数据库清理任务失败:', error)
  }
}

// 定期执行清理任务
const scheduleCleanup = () => {
  // 每天凌晨2点执行清理任务
  const cleanupInterval = 24 * 60 * 60 * 1000 // 24小时
  
  setInterval(async () => {
    const now = new Date()
    if (now.getHours() === 2) { // 凌晨2点
      await cleanupDatabase()
    }
  }, cleanupInterval)
}

module.exports = {
  connectDB,
  checkDBHealth,
  getDBStats,
  createIndexes,
  cleanupDatabase,
  scheduleCleanup
}
