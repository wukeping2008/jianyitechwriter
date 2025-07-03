const EventEmitter = require('events')
const path = require('path')
const fs = require('fs').promises
const DocumentParserService = require('./DocumentParserService')
const AITranslationService = require('./AITranslationService')
const DocumentGeneratorService = require('./DocumentGeneratorService')
const logger = require('../utils/logger')

class BatchProcessingService extends EventEmitter {
  constructor() {
    super()
    
    // 任务队列和状态管理
    this.taskQueue = []
    this.activeTasks = new Map()
    this.completedTasks = new Map()
    this.failedTasks = new Map()
    
    // 配置参数
    this.config = {
      maxConcurrentTasks: 10,
      maxRetries: 3,
      taskTimeout: 300000, // 5分钟超时
      maxBatchSize: 50,
      maxTotalSize: 1024 * 1024 * 1024 // 1GB
    }
    
    // 工作线程池状态
    this.workerPool = {
      available: this.config.maxConcurrentTasks,
      busy: 0
    }
    
    // 统计信息
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0
    }
  }

  /**
   * 创建批量处理任务
   */
  async createBatchTask(files, options = {}) {
    try {
      // 验证输入
      this.validateBatchInput(files, options)
      
      // 创建批量任务
      const batchTask = {
        id: this.generateTaskId(),
        files: files,
        options: {
          targetLanguage: options.targetLanguage || 'en',
          outputFormat: options.outputFormat || 'docx',
          includeOriginal: options.includeOriginal || false,
          generateEnglishManual: options.generateEnglishManual || false,
          ...options
        },
        status: 'pending',
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        progress: {
          total: files.length,
          completed: 0,
          failed: 0,
          percentage: 0
        },
        results: [],
        errors: [],
        retryCount: 0
      }
      
      // 添加到队列
      this.taskQueue.push(batchTask)
      this.stats.totalTasks++
      
      logger.info(`批量任务创建成功: ${batchTask.id}, 文件数量: ${files.length}`)
      
      // 触发任务创建事件
      this.emit('taskCreated', batchTask)
      
      // 开始处理队列
      this.processQueue()
      
      return batchTask
      
    } catch (error) {
      logger.error('创建批量任务失败:', error)
      throw error
    }
  }

  /**
   * 验证批量输入
   */
  validateBatchInput(files, options) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('文件列表不能为空')
    }
    
    if (files.length > this.config.maxBatchSize) {
      throw new Error(`批量文件数量超过限制: ${files.length} > ${this.config.maxBatchSize}`)
    }
    
    // 计算总文件大小
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)
    if (totalSize > this.config.maxTotalSize) {
      throw new Error(`批量文件总大小超过限制: ${Math.round(totalSize / 1024 / 1024)}MB > ${Math.round(this.config.maxTotalSize / 1024 / 1024)}MB`)
    }
    
    // 验证文件格式
    files.forEach((file, index) => {
      if (!DocumentParserService.isValidFileType(file.name)) {
        throw new Error(`文件 ${index + 1} 格式不支持: ${file.name}`)
      }
      
      if (!DocumentParserService.isSafeFileType(file.name)) {
        throw new Error(`文件 ${index + 1} 类型不安全: ${file.name}`)
      }
    })
  }

  /**
   * 处理任务队列
   */
  async processQueue() {
    while (this.taskQueue.length > 0 && this.workerPool.available > 0) {
      const task = this.taskQueue.shift()
      await this.startTask(task)
    }
  }

  /**
   * 开始处理任务
   */
  async startTask(task) {
    try {
      // 更新任务状态
      task.status = 'processing'
      task.startedAt = new Date()
      this.activeTasks.set(task.id, task)
      
      // 占用工作线程
      this.workerPool.available--
      this.workerPool.busy++
      
      logger.info(`开始处理批量任务: ${task.id}`)
      
      // 触发任务开始事件
      this.emit('taskStarted', task)
      
      // 并行处理文件
      const promises = task.files.map((file, index) => 
        this.processFile(task, file, index)
      )
      
      // 等待所有文件处理完成
      const results = await Promise.allSettled(promises)
      
      // 处理结果
      this.handleTaskResults(task, results)
      
    } catch (error) {
      this.handleTaskError(task, error)
    } finally {
      // 释放工作线程
      this.workerPool.available++
      this.workerPool.busy--
      
      // 继续处理队列
      this.processQueue()
    }
  }

  /**
   * 处理单个文件
   */
  async processFile(task, file, index) {
    const startTime = Date.now()
    
    try {
      logger.info(`处理文件 ${index + 1}/${task.files.length}: ${file.name}`)
      
      // 1. 解析文档
      const parseResult = await DocumentParserService.parseDocument(file.path, file.name)
      
      // 2. 翻译文档
      let translationResult = null
      if (task.options.targetLanguage !== 'zh') {
        translationResult = await AITranslationService.translateDocument(
          parseResult.text,
          'zh',
          task.options.targetLanguage
        )
      }
      
      // 3. 生成英文手册（如果需要）
      let englishManual = null
      if (task.options.generateEnglishManual) {
        const productInfo = await DocumentGeneratorService.extractProductInfo(parseResult.text)
        englishManual = await DocumentGeneratorService.generateEnglishManual(productInfo)
      }
      
      // 4. 构建结果
      const result = {
        fileIndex: index,
        fileName: file.name,
        status: 'completed',
        originalDocument: parseResult,
        translation: translationResult,
        englishManual: englishManual,
        processingTime: Date.now() - startTime,
        completedAt: new Date()
      }
      
      // 更新进度
      this.updateTaskProgress(task, 'completed')
      
      logger.info(`文件处理完成: ${file.name}, 耗时: ${result.processingTime}ms`)
      
      return result
      
    } catch (error) {
      logger.error(`文件处理失败: ${file.name}`, error)
      
      // 更新进度
      this.updateTaskProgress(task, 'failed')
      
      return {
        fileIndex: index,
        fileName: file.name,
        status: 'failed',
        error: error.message,
        processingTime: Date.now() - startTime,
        failedAt: new Date()
      }
    }
  }

  /**
   * 更新任务进度
   */
  updateTaskProgress(task, status) {
    if (status === 'completed') {
      task.progress.completed++
    } else if (status === 'failed') {
      task.progress.failed++
    }
    
    task.progress.percentage = Math.round(
      ((task.progress.completed + task.progress.failed) / task.progress.total) * 100
    )
    
    // 触发进度更新事件
    this.emit('progressUpdated', {
      taskId: task.id,
      progress: task.progress
    })
  }

  /**
   * 处理任务结果
   */
  handleTaskResults(task, results) {
    const processingTime = Date.now() - task.startedAt.getTime()
    
    // 分类结果
    const successResults = []
    const failedResults = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'completed') {
          successResults.push(result.value)
        } else {
          failedResults.push(result.value)
        }
      } else {
        failedResults.push({
          fileIndex: index,
          fileName: task.files[index].name,
          status: 'failed',
          error: result.reason.message,
          failedAt: new Date()
        })
      }
    })
    
    // 更新任务状态
    task.status = failedResults.length === 0 ? 'completed' : 
                  successResults.length === 0 ? 'failed' : 'partial'
    task.completedAt = new Date()
    task.results = [...successResults, ...failedResults]
    task.processingTime = processingTime
    
    // 移动到完成任务列表
    this.activeTasks.delete(task.id)
    if (task.status === 'failed') {
      this.failedTasks.set(task.id, task)
      this.stats.failedTasks++
    } else {
      this.completedTasks.set(task.id, task)
      this.stats.completedTasks++
    }
    
    // 更新统计信息
    this.stats.totalProcessingTime += processingTime
    this.stats.averageProcessingTime = this.stats.totalProcessingTime / 
                                      (this.stats.completedTasks + this.stats.failedTasks)
    
    logger.info(`批量任务完成: ${task.id}, 状态: ${task.status}, 成功: ${successResults.length}, 失败: ${failedResults.length}`)
    
    // 触发任务完成事件
    this.emit('taskCompleted', task)
  }

  /**
   * 处理任务错误
   */
  handleTaskError(task, error) {
    logger.error(`批量任务失败: ${task.id}`, error)
    
    task.status = 'failed'
    task.completedAt = new Date()
    task.error = error.message
    
    // 移动到失败任务列表
    this.activeTasks.delete(task.id)
    this.failedTasks.set(task.id, task)
    this.stats.failedTasks++
    
    // 触发任务失败事件
    this.emit('taskFailed', task)
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    // 检查活跃任务
    if (this.activeTasks.has(taskId)) {
      return this.activeTasks.get(taskId)
    }
    
    // 检查完成任务
    if (this.completedTasks.has(taskId)) {
      return this.completedTasks.get(taskId)
    }
    
    // 检查失败任务
    if (this.failedTasks.has(taskId)) {
      return this.failedTasks.get(taskId)
    }
    
    // 检查队列中的任务
    const queuedTask = this.taskQueue.find(task => task.id === taskId)
    if (queuedTask) {
      return queuedTask
    }
    
    return null
  }

  /**
   * 获取所有任务列表
   */
  getAllTasks() {
    const allTasks = []
    
    // 队列中的任务
    allTasks.push(...this.taskQueue)
    
    // 活跃任务
    allTasks.push(...Array.from(this.activeTasks.values()))
    
    // 完成任务
    allTasks.push(...Array.from(this.completedTasks.values()))
    
    // 失败任务
    allTasks.push(...Array.from(this.failedTasks.values()))
    
    return allTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    // 从队列中移除
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId)
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0]
      task.status = 'cancelled'
      task.completedAt = new Date()
      
      logger.info(`任务已取消: ${taskId}`)
      this.emit('taskCancelled', task)
      return true
    }
    
    // 活跃任务无法取消（已在处理中）
    if (this.activeTasks.has(taskId)) {
      throw new Error('无法取消正在处理的任务')
    }
    
    return false
  }

  /**
   * 重试失败任务
   */
  async retryTask(taskId) {
    const task = this.failedTasks.get(taskId)
    if (!task) {
      throw new Error('任务不存在或不是失败状态')
    }
    
    if (task.retryCount >= this.config.maxRetries) {
      throw new Error('任务重试次数已达上限')
    }
    
    // 重置任务状态
    task.status = 'pending'
    task.retryCount++
    task.startedAt = null
    task.completedAt = null
    task.progress = {
      total: task.files.length,
      completed: 0,
      failed: 0,
      percentage: 0
    }
    task.results = []
    task.errors = []
    
    // 移回队列
    this.failedTasks.delete(taskId)
    this.taskQueue.push(task)
    this.stats.failedTasks--
    
    logger.info(`任务重试: ${taskId}, 重试次数: ${task.retryCount}`)
    
    // 开始处理
    this.processQueue()
    
    return task
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks(olderThanHours = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    
    let cleanedCount = 0
    
    // 清理完成任务
    for (const [taskId, task] of this.completedTasks.entries()) {
      if (task.completedAt < cutoffTime) {
        this.completedTasks.delete(taskId)
        cleanedCount++
      }
    }
    
    // 清理失败任务
    for (const [taskId, task] of this.failedTasks.entries()) {
      if (task.completedAt < cutoffTime) {
        this.failedTasks.delete(taskId)
        cleanedCount++
      }
    }
    
    logger.info(`清理了 ${cleanedCount} 个过期任务`)
    return cleanedCount
  }

  /**
   * 获取系统统计信息
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      completedTasks: this.completedTasks.size,
      failedTasks: this.failedTasks.size,
      workerPool: { ...this.workerPool }
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 导出任务结果
   */
  async exportTaskResults(taskId, format = 'zip') {
    const task = this.getTaskStatus(taskId)
    if (!task) {
      throw new Error('任务不存在')
    }
    
    if (task.status !== 'completed' && task.status !== 'partial') {
      throw new Error('任务未完成，无法导出结果')
    }
    
    // 根据格式导出结果
    switch (format) {
      case 'zip':
        return await this.exportAsZip(task)
      case 'json':
        return await this.exportAsJson(task)
      default:
        throw new Error(`不支持的导出格式: ${format}`)
    }
  }

  /**
   * 导出为ZIP格式
   */
  async exportAsZip(task) {
    // 这里需要实现ZIP打包逻辑
    // 暂时返回任务结果的JSON格式
    return {
      format: 'zip',
      taskId: task.id,
      results: task.results,
      exportedAt: new Date()
    }
  }

  /**
   * 导出为JSON格式
   */
  async exportAsJson(task) {
    return {
      format: 'json',
      taskId: task.id,
      task: {
        id: task.id,
        status: task.status,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        progress: task.progress,
        processingTime: task.processingTime
      },
      results: task.results,
      exportedAt: new Date()
    }
  }
}

// 创建单例实例
const batchProcessingService = new BatchProcessingService()

module.exports = batchProcessingService
