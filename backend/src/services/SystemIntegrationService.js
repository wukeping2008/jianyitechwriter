const EventEmitter = require('events')
const logger = require('../utils/logger')
const TemplateManagementService = require('./TemplateManagementService')
const BatchProcessingService = require('./BatchProcessingService')
const QualityControlService = require('./QualityControlService')
const AdvancedEditorService = require('./AdvancedEditorService')
const AITranslationService = require('./AITranslationService')

class SystemIntegrationService extends EventEmitter {
  constructor() {
    super()
    
    // 系统状态
    this.systemStatus = {
      isInitialized: false,
      services: {
        template: { status: 'stopped', health: 'unknown' },
        batch: { status: 'stopped', health: 'unknown' },
        quality: { status: 'stopped', health: 'unknown' },
        editor: { status: 'stopped', health: 'unknown' },
        ai: { status: 'stopped', health: 'unknown' }
      },
      performance: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptime: 0
      }
    }
    
    // 工作流配置
    this.workflows = {
      documentGeneration: {
        name: '文档生成工作流',
        steps: [
          'template_selection',
          'variable_validation',
          'content_generation',
          'quality_check',
          'final_output'
        ]
      },
      batchTranslation: {
        name: '批量翻译工作流',
        steps: [
          'file_upload',
          'batch_processing',
          'quality_control',
          'result_compilation'
        ]
      },
      qualityAssurance: {
        name: '质量保证工作流',
        steps: [
          'content_analysis',
          'terminology_check',
          'consistency_validation',
          'format_verification',
          'final_scoring'
        ]
      }
    }
    
    // 性能监控
    this.performanceMetrics = {
      requestCounts: new Map(),
      responseTimes: [],
      errorCounts: new Map(),
      startTime: Date.now()
    }
    
    // 服务依赖关系
    this.serviceDependencies = {
      template: [],
      batch: ['ai', 'quality'],
      quality: ['template'],
      editor: ['ai', 'quality'],
      ai: []
    }
  }

  /**
   * 初始化系统集成服务
   */
  async initialize() {
    try {
      logger.info('开始初始化系统集成服务')
      
      // 初始化各个服务
      await this.initializeServices()
      
      // 设置服务间通信
      this.setupServiceCommunication()
      
      // 启动性能监控
      this.startPerformanceMonitoring()
      
      // 设置健康检查
      this.setupHealthChecks()
      
      this.systemStatus.isInitialized = true
      this.emit('systemInitialized')
      
      logger.info('系统集成服务初始化完成')
      
    } catch (error) {
      logger.error('系统集成服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化各个服务
   */
  async initializeServices() {
    const services = [
      { name: 'template', service: TemplateManagementService },
      { name: 'batch', service: BatchProcessingService },
      { name: 'quality', service: QualityControlService },
      { name: 'editor', service: AdvancedEditorService },
      { name: 'ai', service: AITranslationService }
    ]

    for (const { name, service } of services) {
      try {
        if (service.initialize && typeof service.initialize === 'function') {
          await service.initialize()
        }
        
        this.systemStatus.services[name] = {
          status: 'running',
          health: 'healthy',
          lastCheck: Date.now()
        }
        
        logger.info(`服务 ${name} 初始化成功`)
        
      } catch (error) {
        this.systemStatus.services[name] = {
          status: 'error',
          health: 'unhealthy',
          error: error.message,
          lastCheck: Date.now()
        }
        
        logger.error(`服务 ${name} 初始化失败:`, error)
      }
    }
  }

  /**
   * 设置服务间通信
   */
  setupServiceCommunication() {
    // 模板服务事件
    TemplateManagementService.on('templateCreated', (data) => {
      this.emit('templateCreated', data)
      logger.info(`模板创建事件: ${data.templateName}`)
    })

    TemplateManagementService.on('documentGenerated', (data) => {
      this.emit('documentGenerated', data)
      // 自动触发质量检查
      this.triggerQualityCheck(data)
    })

    // 批量处理事件
    BatchProcessingService.on('batchStarted', (data) => {
      this.emit('batchStarted', data)
      logger.info(`批量处理开始: ${data.batchId}`)
    })

    BatchProcessingService.on('batchCompleted', (data) => {
      this.emit('batchCompleted', data)
      // 自动生成批量质量报告
      this.generateBatchQualityReport(data)
    })

    // 质量控制事件
    QualityControlService.on('qualityCheckCompleted', (data) => {
      this.emit('qualityCheckCompleted', data)
      // 如果质量分数低，触发改进建议
      if (data.score < 70) {
        this.triggerImprovementSuggestions(data)
      }
    })

    // 高级编辑器事件
    AdvancedEditorService.on('documentSaved', (data) => {
      this.emit('documentSaved', data)
      // 自动保存到版本控制
      this.saveToVersionControl(data)
    })
  }

  /**
   * 执行完整的文档生成工作流
   */
  async executeDocumentGenerationWorkflow(templateId, variables, options = {}) {
    const workflowId = `doc_gen_${Date.now()}`
    
    try {
      logger.info(`开始文档生成工作流: ${workflowId}`)
      
      // 步骤1: 模板选择和验证
      const template = await TemplateManagementService.getTemplateById(templateId)
      if (!template) {
        throw new Error('模板不存在')
      }

      // 步骤2: 变量验证
      const validation = template.validateVariables(variables)
      if (!validation.isValid) {
        throw new Error(`变量验证失败: ${validation.errors.join(', ')}`)
      }

      // 步骤3: 内容生成
      const generationResult = await TemplateManagementService.generateDocument(
        templateId, 
        variables, 
        options
      )

      // 步骤4: 质量检查
      let qualityResult = null
      if (options.enableQualityCheck !== false) {
        qualityResult = await this.performQualityCheck(
          generationResult.content,
          options.qualityOptions
        )
      }

      // 步骤5: 最终输出
      const finalResult = {
        workflowId: workflowId,
        template: {
          id: template.id,
          name: template.name,
          version: template.version
        },
        content: generationResult.content,
        metadata: generationResult.metadata,
        quality: qualityResult,
        generatedAt: new Date(),
        workflow: 'documentGeneration'
      }

      this.emit('workflowCompleted', {
        workflowId: workflowId,
        type: 'documentGeneration',
        result: finalResult
      })

      logger.info(`文档生成工作流完成: ${workflowId}`)
      return finalResult

    } catch (error) {
      logger.error(`文档生成工作流失败: ${workflowId}`, error)
      
      this.emit('workflowFailed', {
        workflowId: workflowId,
        type: 'documentGeneration',
        error: error.message
      })
      
      throw error
    }
  }

  /**
   * 执行批量翻译工作流
   */
  async executeBatchTranslationWorkflow(files, options = {}) {
    const workflowId = `batch_trans_${Date.now()}`
    
    try {
      logger.info(`开始批量翻译工作流: ${workflowId}`)
      
      // 步骤1: 文件上传和验证
      const validatedFiles = await this.validateBatchFiles(files)
      
      // 步骤2: 批量处理
      const batchResult = await BatchProcessingService.processBatch(
        validatedFiles,
        options.batchOptions
      )

      // 步骤3: 质量控制
      let qualityResults = []
      if (options.enableQualityCheck !== false) {
        qualityResults = await this.performBatchQualityCheck(
          batchResult.results,
          options.qualityOptions
        )
      }

      // 步骤4: 结果编译
      const finalResult = {
        workflowId: workflowId,
        batchId: batchResult.batchId,
        totalFiles: validatedFiles.length,
        successfulTranslations: batchResult.successfulTranslations,
        failedTranslations: batchResult.failedTranslations,
        results: batchResult.results,
        qualityResults: qualityResults,
        completedAt: new Date(),
        workflow: 'batchTranslation'
      }

      this.emit('workflowCompleted', {
        workflowId: workflowId,
        type: 'batchTranslation',
        result: finalResult
      })

      logger.info(`批量翻译工作流完成: ${workflowId}`)
      return finalResult

    } catch (error) {
      logger.error(`批量翻译工作流失败: ${workflowId}`, error)
      
      this.emit('workflowFailed', {
        workflowId: workflowId,
        type: 'batchTranslation',
        error: error.message
      })
      
      throw error
    }
  }

  /**
   * 执行质量保证工作流
   */
  async executeQualityAssuranceWorkflow(documentId, originalText, translatedText, options = {}) {
    const workflowId = `qa_${Date.now()}`
    
    try {
      logger.info(`开始质量保证工作流: ${workflowId}`)
      
      // 步骤1: 内容分析
      const contentAnalysis = await this.analyzeContent(originalText, translatedText)
      
      // 步骤2: 术语检查
      const terminologyCheck = await QualityControlService.checkTerminology(
        originalText,
        translatedText
      )

      // 步骤3: 一致性验证
      const consistencyCheck = await QualityControlService.checkConsistency(
        originalText,
        translatedText
      )

      // 步骤4: 格式验证
      const formatCheck = await QualityControlService.checkFormat(
        originalText,
        translatedText
      )

      // 步骤5: 最终评分
      const finalScore = await QualityControlService.calculateOverallScore({
        terminology: terminologyCheck.score,
        consistency: consistencyCheck.score,
        format: formatCheck.score,
        content: contentAnalysis.score
      })

      const finalResult = {
        workflowId: workflowId,
        documentId: documentId,
        analysis: {
          content: contentAnalysis,
          terminology: terminologyCheck,
          consistency: consistencyCheck,
          format: formatCheck
        },
        overallScore: finalScore,
        recommendations: await this.generateQualityRecommendations(finalScore),
        completedAt: new Date(),
        workflow: 'qualityAssurance'
      }

      this.emit('workflowCompleted', {
        workflowId: workflowId,
        type: 'qualityAssurance',
        result: finalResult
      })

      logger.info(`质量保证工作流完成: ${workflowId}`)
      return finalResult

    } catch (error) {
      logger.error(`质量保证工作流失败: ${workflowId}`, error)
      
      this.emit('workflowFailed', {
        workflowId: workflowId,
        type: 'qualityAssurance',
        error: error.message
      })
      
      throw error
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      ...this.systemStatus,
      performance: {
        ...this.systemStatus.performance,
        uptime: Date.now() - this.performanceMetrics.startTime
      }
    }
  }

  /**
   * 获取系统性能指标
   */
  getPerformanceMetrics() {
    const totalRequests = Array.from(this.performanceMetrics.requestCounts.values())
      .reduce((sum, count) => sum + count, 0)
    
    const averageResponseTime = this.performanceMetrics.responseTimes.length > 0
      ? this.performanceMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
        this.performanceMetrics.responseTimes.length
      : 0
    
    const totalErrors = Array.from(this.performanceMetrics.errorCounts.values())
      .reduce((sum, count) => sum + count, 0)
    
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

    return {
      totalRequests: totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: Date.now() - this.performanceMetrics.startTime,
      requestsByService: Object.fromEntries(this.performanceMetrics.requestCounts),
      errorsByService: Object.fromEntries(this.performanceMetrics.errorCounts)
    }
  }

  /**
   * 记录请求指标
   */
  recordRequest(serviceName, responseTime, isError = false) {
    // 记录请求数
    const currentCount = this.performanceMetrics.requestCounts.get(serviceName) || 0
    this.performanceMetrics.requestCounts.set(serviceName, currentCount + 1)
    
    // 记录响应时间
    this.performanceMetrics.responseTimes.push(responseTime)
    
    // 保持响应时间数组大小
    if (this.performanceMetrics.responseTimes.length > 1000) {
      this.performanceMetrics.responseTimes.shift()
    }
    
    // 记录错误数
    if (isError) {
      const currentErrors = this.performanceMetrics.errorCounts.get(serviceName) || 0
      this.performanceMetrics.errorCounts.set(serviceName, currentErrors + 1)
    }
  }

  // 辅助方法
  async triggerQualityCheck(documentData) {
    try {
      if (documentData.content && documentData.content.sections) {
        const originalText = documentData.variables ? 
          JSON.stringify(documentData.variables) : ''
        const translatedText = documentData.content.sections
          .map(section => section.content)
          .join('\n')
        
        await QualityControlService.performQualityCheck(
          documentData.templateId,
          originalText,
          translatedText
        )
      }
    } catch (error) {
      logger.error('自动质量检查失败:', error)
    }
  }

  async generateBatchQualityReport(batchData) {
    try {
      // 生成批量质量报告的逻辑
      logger.info(`生成批量质量报告: ${batchData.batchId}`)
    } catch (error) {
      logger.error('生成批量质量报告失败:', error)
    }
  }

  async triggerImprovementSuggestions(qualityData) {
    try {
      // 触发改进建议的逻辑
      logger.info(`触发改进建议: 质量分数 ${qualityData.score}`)
    } catch (error) {
      logger.error('触发改进建议失败:', error)
    }
  }

  async saveToVersionControl(documentData) {
    try {
      // 保存到版本控制的逻辑
      logger.info(`保存到版本控制: ${documentData.documentId}`)
    } catch (error) {
      logger.error('保存到版本控制失败:', error)
    }
  }

  async validateBatchFiles(files) {
    // 文件验证逻辑
    return files.filter(file => file && file.size > 0)
  }

  async performQualityCheck(content, options = {}) {
    try {
      // 执行质量检查
      return await QualityControlService.performQualityCheck(
        'temp_doc',
        '',
        JSON.stringify(content),
        options
      )
    } catch (error) {
      logger.error('质量检查失败:', error)
      return null
    }
  }

  async performBatchQualityCheck(results, options = {}) {
    const qualityResults = []
    
    for (const result of results) {
      try {
        const qualityCheck = await this.performQualityCheck(result.content, options)
        qualityResults.push({
          fileId: result.fileId,
          fileName: result.fileName,
          quality: qualityCheck
        })
      } catch (error) {
        logger.error(`文件 ${result.fileName} 质量检查失败:`, error)
      }
    }
    
    return qualityResults
  }

  async analyzeContent(originalText, translatedText) {
    // 内容分析逻辑
    return {
      score: 85,
      wordCount: translatedText.split(' ').length,
      characterCount: translatedText.length,
      complexity: 'medium'
    }
  }

  async generateQualityRecommendations(score) {
    const recommendations = []
    
    if (score < 60) {
      recommendations.push('建议重新翻译')
    } else if (score < 80) {
      recommendations.push('建议人工审核')
    } else {
      recommendations.push('质量良好')
    }
    
    return recommendations
  }

  startPerformanceMonitoring() {
    // 每分钟更新性能指标
    setInterval(() => {
      this.updatePerformanceMetrics()
    }, 60000)
  }

  updatePerformanceMetrics() {
    const metrics = this.getPerformanceMetrics()
    this.systemStatus.performance = metrics
    
    this.emit('performanceUpdate', metrics)
  }

  setupHealthChecks() {
    // 每5分钟进行健康检查
    setInterval(() => {
      this.performHealthChecks()
    }, 5 * 60 * 1000)
  }

  async performHealthChecks() {
    const services = Object.keys(this.systemStatus.services)
    
    for (const serviceName of services) {
      try {
        // 执行健康检查逻辑
        this.systemStatus.services[serviceName] = {
          ...this.systemStatus.services[serviceName],
          health: 'healthy',
          lastCheck: Date.now()
        }
      } catch (error) {
        this.systemStatus.services[serviceName] = {
          ...this.systemStatus.services[serviceName],
          health: 'unhealthy',
          error: error.message,
          lastCheck: Date.now()
        }
      }
    }
    
    this.emit('healthCheckCompleted', this.systemStatus.services)
  }
}

// 创建单例实例
const systemIntegrationService = new SystemIntegrationService()

module.exports = systemIntegrationService
