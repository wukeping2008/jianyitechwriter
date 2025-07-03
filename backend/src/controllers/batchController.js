const BatchProcessingService = require('../services/BatchProcessingService')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const logger = require('../utils/logger')

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/batch')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 50 // 最多50个文件
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (BatchProcessingService.isValidFileType && 
        !BatchProcessingService.isValidFileType(file.originalname)) {
      return cb(new Error(`不支持的文件格式: ${file.originalname}`))
    }
    
    // 检查文件安全性
    if (BatchProcessingService.isSafeFileType && 
        !BatchProcessingService.isSafeFileType(file.originalname)) {
      return cb(new Error(`不安全的文件类型: ${file.originalname}`))
    }
    
    cb(null, true)
  }
})

class BatchController {
  /**
   * 创建批量处理任务
   */
  static async createBatchTask(req, res) {
    try {
      // 检查是否有文件上传
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请上传至少一个文件'
        })
      }
      
      // 准备文件信息
      const files = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }))
      
      // 获取处理选项
      const options = {
        targetLanguage: req.body.targetLanguage || 'en',
        outputFormat: req.body.outputFormat || 'docx',
        includeOriginal: req.body.includeOriginal === 'true',
        generateEnglishManual: req.body.generateEnglishManual === 'true',
        priority: req.body.priority || 'normal'
      }
      
      // 创建批量任务
      const task = await BatchProcessingService.createBatchTask(files, options)
      
      logger.info(`用户创建批量任务: ${task.id}, 文件数量: ${files.length}`)
      
      res.json({
        success: true,
        message: '批量任务创建成功',
        data: {
          taskId: task.id,
          status: task.status,
          fileCount: files.length,
          progress: task.progress,
          createdAt: task.createdAt
        }
      })
      
    } catch (error) {
      logger.error('创建批量任务失败:', error)
      
      // 清理上传的文件
      if (req.files) {
        req.files.forEach(async (file) => {
          try {
            await fs.unlink(file.path)
          } catch (cleanupError) {
            logger.error('清理文件失败:', cleanupError)
          }
        })
      }
      
      res.status(500).json({
        success: false,
        message: error.message || '创建批量任务失败'
      })
    }
  }
  
  /**
   * 获取任务状态
   */
  static async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params
      
      const task = BatchProcessingService.getTaskStatus(taskId)
      if (!task) {
        return res.status(404).json({
          success: false,
          message: '任务不存在'
        })
      }
      
      res.json({
        success: true,
        data: {
          id: task.id,
          status: task.status,
          progress: task.progress,
          createdAt: task.createdAt,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          processingTime: task.processingTime,
          fileCount: task.files.length,
          options: task.options,
          retryCount: task.retryCount,
          error: task.error
        }
      })
      
    } catch (error) {
      logger.error('获取任务状态失败:', error)
      res.status(500).json({
        success: false,
        message: '获取任务状态失败'
      })
    }
  }
  
  /**
   * 获取任务结果
   */
  static async getTaskResults(req, res) {
    try {
      const { taskId } = req.params
      
      const task = BatchProcessingService.getTaskStatus(taskId)
      if (!task) {
        return res.status(404).json({
          success: false,
          message: '任务不存在'
        })
      }
      
      if (task.status === 'pending' || task.status === 'processing') {
        return res.status(400).json({
          success: false,
          message: '任务尚未完成'
        })
      }
      
      res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          results: task.results,
          summary: {
            total: task.progress.total,
            completed: task.progress.completed,
            failed: task.progress.failed,
            successRate: Math.round((task.progress.completed / task.progress.total) * 100)
          }
        }
      })
      
    } catch (error) {
      logger.error('获取任务结果失败:', error)
      res.status(500).json({
        success: false,
        message: '获取任务结果失败'
      })
    }
  }
  
  /**
   * 获取所有任务列表
   */
  static async getAllTasks(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query
      
      let tasks = BatchProcessingService.getAllTasks()
      
      // 状态过滤
      if (status) {
        tasks = tasks.filter(task => task.status === status)
      }
      
      // 分页
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + parseInt(limit)
      const paginatedTasks = tasks.slice(startIndex, endIndex)
      
      // 简化任务信息
      const simplifiedTasks = paginatedTasks.map(task => ({
        id: task.id,
        status: task.status,
        progress: task.progress,
        fileCount: task.files.length,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        processingTime: task.processingTime,
        retryCount: task.retryCount
      }))
      
      res.json({
        success: true,
        data: {
          tasks: simplifiedTasks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: tasks.length,
            pages: Math.ceil(tasks.length / limit)
          }
        }
      })
      
    } catch (error) {
      logger.error('获取任务列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取任务列表失败'
      })
    }
  }
  
  /**
   * 取消任务
   */
  static async cancelTask(req, res) {
    try {
      const { taskId } = req.params
      
      const cancelled = BatchProcessingService.cancelTask(taskId)
      
      if (cancelled) {
        res.json({
          success: true,
          message: '任务已取消'
        })
      } else {
        res.status(400).json({
          success: false,
          message: '无法取消任务（任务不存在或已在处理中）'
        })
      }
      
    } catch (error) {
      logger.error('取消任务失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '取消任务失败'
      })
    }
  }
  
  /**
   * 重试失败任务
   */
  static async retryTask(req, res) {
    try {
      const { taskId } = req.params
      
      const task = await BatchProcessingService.retryTask(taskId)
      
      res.json({
        success: true,
        message: '任务重试已启动',
        data: {
          taskId: task.id,
          status: task.status,
          retryCount: task.retryCount
        }
      })
      
    } catch (error) {
      logger.error('重试任务失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '重试任务失败'
      })
    }
  }
  
  /**
   * 导出任务结果
   */
  static async exportTaskResults(req, res) {
    try {
      const { taskId } = req.params
      const { format = 'json' } = req.query
      
      const exportData = await BatchProcessingService.exportTaskResults(taskId, format)
      
      // 设置响应头
      const filename = `batch_results_${taskId}_${Date.now()}.${format}`
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json')
        res.json(exportData)
      } else {
        res.setHeader('Content-Type', 'application/zip')
        res.send(exportData)
      }
      
    } catch (error) {
      logger.error('导出任务结果失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '导出任务结果失败'
      })
    }
  }
  
  /**
   * 获取系统统计信息
   */
  static async getStats(req, res) {
    try {
      const stats = BatchProcessingService.getStats()
      
      res.json({
        success: true,
        data: stats
      })
      
    } catch (error) {
      logger.error('获取统计信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取统计信息失败'
      })
    }
  }
  
  /**
   * 清理完成的任务
   */
  static async cleanupTasks(req, res) {
    try {
      const { hours = 24 } = req.query
      
      const cleanedCount = BatchProcessingService.cleanupCompletedTasks(parseInt(hours))
      
      res.json({
        success: true,
        message: `清理了 ${cleanedCount} 个过期任务`,
        data: {
          cleanedCount: cleanedCount,
          hours: parseInt(hours)
        }
      })
      
    } catch (error) {
      logger.error('清理任务失败:', error)
      res.status(500).json({
        success: false,
        message: '清理任务失败'
      })
    }
  }
  
  /**
   * WebSocket连接处理（用于实时进度更新）
   */
  static setupWebSocket(io) {
    // 监听批量处理服务的事件
    BatchProcessingService.on('taskCreated', (task) => {
      io.emit('taskCreated', {
        taskId: task.id,
        status: task.status,
        fileCount: task.files.length
      })
    })
    
    BatchProcessingService.on('taskStarted', (task) => {
      io.emit('taskStarted', {
        taskId: task.id,
        status: task.status,
        startedAt: task.startedAt
      })
    })
    
    BatchProcessingService.on('progressUpdated', (data) => {
      io.emit('progressUpdated', data)
    })
    
    BatchProcessingService.on('taskCompleted', (task) => {
      io.emit('taskCompleted', {
        taskId: task.id,
        status: task.status,
        completedAt: task.completedAt,
        processingTime: task.processingTime,
        results: task.results.length
      })
    })
    
    BatchProcessingService.on('taskFailed', (task) => {
      io.emit('taskFailed', {
        taskId: task.id,
        status: task.status,
        error: task.error
      })
    })
    
    BatchProcessingService.on('taskCancelled', (task) => {
      io.emit('taskCancelled', {
        taskId: task.id,
        status: task.status
      })
    })
  }
}

// 导出上传中间件和控制器
module.exports = {
  BatchController,
  upload
}
