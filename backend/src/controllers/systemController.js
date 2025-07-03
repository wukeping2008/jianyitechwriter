const SystemIntegrationService = require('../services/SystemIntegrationService')
const logger = require('../utils/logger')

class SystemController {
  /**
   * 获取系统状态
   */
  static async getSystemStatus(req, res) {
    try {
      const status = SystemIntegrationService.getSystemStatus()
      
      res.json({
        success: true,
        data: status
      })

    } catch (error) {
      logger.error('获取系统状态失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取系统状态失败'
      })
    }
  }

  /**
   * 获取系统性能指标
   */
  static async getPerformanceMetrics(req, res) {
    try {
      const metrics = SystemIntegrationService.getPerformanceMetrics()
      
      res.json({
        success: true,
        data: metrics
      })

    } catch (error) {
      logger.error('获取性能指标失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取性能指标失败'
      })
    }
  }

  /**
   * 初始化系统
   */
  static async initializeSystem(req, res) {
    try {
      await SystemIntegrationService.initialize()
      
      logger.info(`用户 ${req.user.id} 初始化系统`)
      
      res.json({
        success: true,
        message: '系统初始化成功'
      })

    } catch (error) {
      logger.error('系统初始化失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '系统初始化失败'
      })
    }
  }

  /**
   * 执行文档生成工作流
   */
  static async executeDocumentGenerationWorkflow(req, res) {
    try {
      const { templateId, variables, options = {} } = req.body

      if (!templateId || !variables) {
        return res.status(400).json({
          success: false,
          message: '模板ID和变量参数是必需的'
        })
      }

      const result = await SystemIntegrationService.executeDocumentGenerationWorkflow(
        templateId,
        variables,
        options
      )

      logger.info(`用户 ${req.user.id} 执行文档生成工作流: ${result.workflowId}`)

      res.json({
        success: true,
        message: '文档生成工作流执行成功',
        data: result
      })

    } catch (error) {
      logger.error('执行文档生成工作流失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '执行文档生成工作流失败'
      })
    }
  }

  /**
   * 执行批量翻译工作流
   */
  static async executeBatchTranslationWorkflow(req, res) {
    try {
      const { files, options = {} } = req.body

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '文件列表不能为空'
        })
      }

      const result = await SystemIntegrationService.executeBatchTranslationWorkflow(
        files,
        options
      )

      logger.info(`用户 ${req.user.id} 执行批量翻译工作流: ${result.workflowId}`)

      res.json({
        success: true,
        message: '批量翻译工作流执行成功',
        data: result
      })

    } catch (error) {
      logger.error('执行批量翻译工作流失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '执行批量翻译工作流失败'
      })
    }
  }

  /**
   * 执行质量保证工作流
   */
  static async executeQualityAssuranceWorkflow(req, res) {
    try {
      const { documentId, originalText, translatedText, options = {} } = req.body

      if (!documentId || !originalText || !translatedText) {
        return res.status(400).json({
          success: false,
          message: '文档ID、原文和译文都是必需的'
        })
      }

      const result = await SystemIntegrationService.executeQualityAssuranceWorkflow(
        documentId,
        originalText,
        translatedText,
        options
      )

      logger.info(`用户 ${req.user.id} 执行质量保证工作流: ${result.workflowId}`)

      res.json({
        success: true,
        message: '质量保证工作流执行成功',
        data: result
      })

    } catch (error) {
      logger.error('执行质量保证工作流失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '执行质量保证工作流失败'
      })
    }
  }

  /**
   * 获取工作流列表
   */
  static async getWorkflows(req, res) {
    try {
      const workflows = [
        {
          id: 'documentGeneration',
          name: '文档生成工作流',
          description: '基于模板生成专业文档，包含变量验证、内容生成和质量检查',
          steps: [
            { id: 'template_selection', name: '模板选择', description: '选择合适的文档模板' },
            { id: 'variable_validation', name: '变量验证', description: '验证输入变量的有效性' },
            { id: 'content_generation', name: '内容生成', description: '基于模板和变量生成文档内容' },
            { id: 'quality_check', name: '质量检查', description: '对生成的内容进行质量评估' },
            { id: 'final_output', name: '最终输出', description: '输出最终的文档结果' }
          ],
          estimatedTime: '2-5分钟',
          requiredParams: ['templateId', 'variables']
        },
        {
          id: 'batchTranslation',
          name: '批量翻译工作流',
          description: '批量处理多个文档的翻译任务，支持并发处理和质量控制',
          steps: [
            { id: 'file_upload', name: '文件上传', description: '上传和验证待翻译文件' },
            { id: 'batch_processing', name: '批量处理', description: '并发执行翻译任务' },
            { id: 'quality_control', name: '质量控制', description: '对翻译结果进行质量检查' },
            { id: 'result_compilation', name: '结果编译', description: '编译和打包翻译结果' }
          ],
          estimatedTime: '5-30分钟',
          requiredParams: ['files']
        },
        {
          id: 'qualityAssurance',
          name: '质量保证工作流',
          description: '全面的翻译质量检查和评估，提供详细的质量报告和改进建议',
          steps: [
            { id: 'content_analysis', name: '内容分析', description: '分析文档内容的基本特征' },
            { id: 'terminology_check', name: '术语检查', description: '验证专业术语的准确性' },
            { id: 'consistency_validation', name: '一致性验证', description: '检查翻译的一致性' },
            { id: 'format_verification', name: '格式验证', description: '验证文档格式的正确性' },
            { id: 'final_scoring', name: '最终评分', description: '生成综合质量评分和报告' }
          ],
          estimatedTime: '1-3分钟',
          requiredParams: ['documentId', 'originalText', 'translatedText']
        }
      ]

      res.json({
        success: true,
        data: {
          workflows: workflows,
          count: workflows.length
        }
      })

    } catch (error) {
      logger.error('获取工作流列表失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取工作流列表失败'
      })
    }
  }

  /**
   * 获取工作流详情
   */
  static async getWorkflowById(req, res) {
    try {
      const { workflowId } = req.params

      const workflowDetails = {
        documentGeneration: {
          id: 'documentGeneration',
          name: '文档生成工作流',
          description: '基于模板生成专业文档的完整工作流程',
          version: '1.0.0',
          author: '简仪科技',
          category: 'document',
          tags: ['template', 'generation', 'ai'],
          configuration: {
            enableQualityCheck: {
              type: 'boolean',
              default: true,
              description: '是否启用质量检查'
            },
            aiModel: {
              type: 'string',
              default: 'gpt-4',
              options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'],
              description: 'AI模型选择'
            },
            outputFormat: {
              type: 'string',
              default: 'markdown',
              options: ['markdown', 'html', 'docx', 'pdf'],
              description: '输出格式'
            }
          },
          inputSchema: {
            templateId: {
              type: 'string',
              required: true,
              description: '模板ID'
            },
            variables: {
              type: 'object',
              required: true,
              description: '模板变量'
            },
            options: {
              type: 'object',
              required: false,
              description: '可选配置'
            }
          },
          outputSchema: {
            workflowId: 'string',
            template: 'object',
            content: 'object',
            metadata: 'object',
            quality: 'object',
            generatedAt: 'string'
          }
        },
        batchTranslation: {
          id: 'batchTranslation',
          name: '批量翻译工作流',
          description: '高效的批量文档翻译处理工作流',
          version: '1.0.0',
          author: '简仪科技',
          category: 'translation',
          tags: ['batch', 'translation', 'concurrent'],
          configuration: {
            maxConcurrency: {
              type: 'number',
              default: 5,
              min: 1,
              max: 10,
              description: '最大并发数'
            },
            enableQualityCheck: {
              type: 'boolean',
              default: true,
              description: '是否启用质量检查'
            },
            targetLanguage: {
              type: 'string',
              default: 'zh-CN',
              options: ['zh-CN', 'en-US', 'ja-JP'],
              description: '目标语言'
            }
          },
          inputSchema: {
            files: {
              type: 'array',
              required: true,
              description: '文件列表'
            },
            options: {
              type: 'object',
              required: false,
              description: '批量处理选项'
            }
          },
          outputSchema: {
            workflowId: 'string',
            batchId: 'string',
            totalFiles: 'number',
            results: 'array',
            qualityResults: 'array',
            completedAt: 'string'
          }
        },
        qualityAssurance: {
          id: 'qualityAssurance',
          name: '质量保证工作流',
          description: '全面的翻译质量评估和改进建议工作流',
          version: '1.0.0',
          author: '简仪科技',
          category: 'quality',
          tags: ['quality', 'assessment', 'improvement'],
          configuration: {
            strictMode: {
              type: 'boolean',
              default: false,
              description: '严格模式'
            },
            includeRecommendations: {
              type: 'boolean',
              default: true,
              description: '包含改进建议'
            },
            terminologyCheck: {
              type: 'boolean',
              default: true,
              description: '术语检查'
            }
          },
          inputSchema: {
            documentId: {
              type: 'string',
              required: true,
              description: '文档ID'
            },
            originalText: {
              type: 'string',
              required: true,
              description: '原文'
            },
            translatedText: {
              type: 'string',
              required: true,
              description: '译文'
            },
            options: {
              type: 'object',
              required: false,
              description: '质量检查选项'
            }
          },
          outputSchema: {
            workflowId: 'string',
            documentId: 'string',
            analysis: 'object',
            overallScore: 'number',
            recommendations: 'array',
            completedAt: 'string'
          }
        }
      }

      const workflow = workflowDetails[workflowId]
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: '工作流不存在'
        })
      }

      res.json({
        success: true,
        data: workflow
      })

    } catch (error) {
      logger.error('获取工作流详情失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取工作流详情失败'
      })
    }
  }

  /**
   * 获取系统健康检查
   */
  static async getHealthCheck(req, res) {
    try {
      const status = SystemIntegrationService.getSystemStatus()
      const metrics = SystemIntegrationService.getPerformanceMetrics()

      const healthStatus = {
        status: status.isInitialized ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: metrics.uptime,
        services: status.services,
        performance: {
          totalRequests: metrics.totalRequests,
          averageResponseTime: metrics.averageResponseTime,
          errorRate: metrics.errorRate
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          },
          cpu: {
            usage: process.cpuUsage()
          }
        }
      }

      // 根据服务状态确定HTTP状态码
      const hasUnhealthyServices = Object.values(status.services)
        .some(service => service.health === 'unhealthy')
      
      const httpStatus = hasUnhealthyServices ? 503 : 200

      res.status(httpStatus).json({
        success: !hasUnhealthyServices,
        data: healthStatus
      })

    } catch (error) {
      logger.error('健康检查失败:', error)
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        message: error.message || '健康检查失败',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * 记录性能指标
   */
  static async recordMetrics(req, res) {
    try {
      const { serviceName, responseTime, isError = false } = req.body

      if (!serviceName || responseTime === undefined) {
        return res.status(400).json({
          success: false,
          message: '服务名称和响应时间是必需的'
        })
      }

      SystemIntegrationService.recordRequest(serviceName, responseTime, isError)

      res.json({
        success: true,
        message: '性能指标记录成功'
      })

    } catch (error) {
      logger.error('记录性能指标失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '记录性能指标失败'
      })
    }
  }

  /**
   * 获取系统配置
   */
  static async getSystemConfiguration(req, res) {
    try {
      const configuration = {
        system: {
          name: '简仪科技翻译系统',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          timezone: 'Asia/Shanghai',
          locale: 'zh-CN'
        },
        features: {
          batchProcessing: {
            enabled: true,
            maxFiles: 50,
            maxConcurrency: 10,
            supportedFormats: ['txt', 'docx', 'pdf', 'md']
          },
          qualityControl: {
            enabled: true,
            autoCheck: true,
            scoreThreshold: 70,
            dimensions: ['terminology', 'consistency', 'format', 'completeness', 'accuracy']
          },
          templateManagement: {
            enabled: true,
            maxTemplates: 100,
            versionControl: true,
            collaboration: true
          },
          advancedEditor: {
            enabled: true,
            realTimePreview: true,
            versionHistory: true,
            collaborativeEditing: false
          }
        },
        limits: {
          maxFileSize: '10MB',
          maxBatchSize: 50,
          maxConcurrentUsers: 100,
          rateLimit: {
            requests: 100,
            window: '15m'
          }
        },
        integrations: {
          ai: {
            provider: 'OpenAI',
            models: ['gpt-4', 'gpt-3.5-turbo'],
            fallback: 'claude-3'
          },
          storage: {
            provider: 'Local',
            backup: true,
            retention: '30d'
          }
        }
      }

      res.json({
        success: true,
        data: configuration
      })

    } catch (error) {
      logger.error('获取系统配置失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取系统配置失败'
      })
    }
  }
}

module.exports = SystemController
