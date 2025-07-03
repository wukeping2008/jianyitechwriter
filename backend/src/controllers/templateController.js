const TemplateManagementService = require('../services/TemplateManagementService')
const Template = require('../models/Template')
const logger = require('../utils/logger')

class TemplateController {
  /**
   * 获取模板列表
   */
  static async getTemplates(req, res) {
    try {
      const {
        type,
        productCategory,
        status,
        isPublic,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query

      const filters = {
        type,
        productCategory,
        status,
        isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
        tags: tags ? tags.split(',') : undefined,
        search
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      }

      const result = await TemplateManagementService.getTemplates(filters, pagination)

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('获取模板列表失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取模板列表失败'
      })
    }
  }

  /**
   * 获取模板详情
   */
  static async getTemplateById(req, res) {
    try {
      const { templateId } = req.params
      const { includeUsage = 'false' } = req.query

      const template = await TemplateManagementService.getTemplateById(templateId)
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        })
      }

      // 检查访问权限
      if (!template.isPublic && template.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权限访问此模板'
        })
      }

      let responseData = template.toObject()

      // 如果不需要使用统计，移除敏感信息
      if (includeUsage !== 'true') {
        delete responseData.usage
        delete responseData.reviews
      }

      res.json({
        success: true,
        data: responseData
      })

    } catch (error) {
      logger.error('获取模板详情失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取模板详情失败'
      })
    }
  }

  /**
   * 创建新模板
   */
  static async createTemplate(req, res) {
    try {
      const templateData = req.body
      const userId = req.user.id

      const template = await TemplateManagementService.createTemplate(templateData, userId)

      logger.info(`用户 ${userId} 创建模板: ${template.id}`)

      res.status(201).json({
        success: true,
        message: '模板创建成功',
        data: {
          templateId: template.id,
          name: template.name,
          type: template.type,
          status: template.status,
          version: template.version,
          createdAt: template.createdAt
        }
      })

    } catch (error) {
      logger.error('创建模板失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '创建模板失败'
      })
    }
  }

  /**
   * 更新模板
   */
  static async updateTemplate(req, res) {
    try {
      const { templateId } = req.params
      const updateData = req.body
      const userId = req.user.id

      const template = await TemplateManagementService.updateTemplate(templateId, updateData, userId)

      logger.info(`用户 ${userId} 更新模板: ${templateId}`)

      res.json({
        success: true,
        message: '模板更新成功',
        data: {
          templateId: template.id,
          name: template.name,
          version: template.version,
          updatedAt: template.updatedAt
        }
      })

    } catch (error) {
      logger.error('更新模板失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '更新模板失败'
      })
    }
  }

  /**
   * 删除模板
   */
  static async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params
      const userId = req.user.id

      const result = await TemplateManagementService.deleteTemplate(templateId, userId)

      logger.info(`用户 ${userId} 删除模板: ${templateId}`)

      res.json({
        success: true,
        message: result.message
      })

    } catch (error) {
      logger.error('删除模板失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '删除模板失败'
      })
    }
  }

  /**
   * 复制模板
   */
  static async duplicateTemplate(req, res) {
    try {
      const { templateId } = req.params
      const { name } = req.body
      const userId = req.user.id

      const duplicatedTemplate = await TemplateManagementService.duplicateTemplate(
        templateId,
        name,
        userId
      )

      logger.info(`用户 ${userId} 复制模板: ${templateId} -> ${duplicatedTemplate.id}`)

      res.status(201).json({
        success: true,
        message: '模板复制成功',
        data: {
          templateId: duplicatedTemplate.id,
          name: duplicatedTemplate.name,
          originalTemplateId: templateId
        }
      })

    } catch (error) {
      logger.error('复制模板失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '复制模板失败'
      })
    }
  }

  /**
   * 生成文档
   */
  static async generateDocument(req, res) {
    try {
      const { templateId } = req.params
      const { variables, options = {} } = req.body

      if (!variables || typeof variables !== 'object') {
        return res.status(400).json({
          success: false,
          message: '变量参数无效'
        })
      }

      // 添加AI服务到选项中
      options.aiService = req.aiService

      const result = await TemplateManagementService.generateDocument(
        templateId,
        variables,
        options
      )

      logger.info(`用户 ${req.user.id} 使用模板 ${templateId} 生成文档`)

      res.json({
        success: true,
        message: '文档生成成功',
        data: result
      })

    } catch (error) {
      logger.error('生成文档失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '生成文档失败'
      })
    }
  }

  /**
   * 获取推荐模板
   */
  static async getRecommendedTemplates(req, res) {
    try {
      const userId = req.user.id
      const { limit = 5 } = req.query

      const recommendations = await TemplateManagementService.getRecommendedTemplates(
        userId,
        parseInt(limit)
      )

      res.json({
        success: true,
        data: {
          recommendations: recommendations,
          count: recommendations.length
        }
      })

    } catch (error) {
      logger.error('获取推荐模板失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取推荐模板失败'
      })
    }
  }

  /**
   * 获取模板统计信息
   */
  static async getTemplateStatistics(req, res) {
    try {
      const stats = await TemplateManagementService.getTemplateStatistics()

      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      logger.error('获取模板统计失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取模板统计失败'
      })
    }
  }

  /**
   * 获取用户的模板
   */
  static async getUserTemplates(req, res) {
    try {
      const userId = req.user.id
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query

      const filters = {
        createdBy: userId,
        status
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      }

      const result = await TemplateManagementService.getTemplates(filters, pagination)

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('获取用户模板失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '获取用户模板失败'
      })
    }
  }

  /**
   * 导入模板
   */
  static async importTemplate(req, res) {
    try {
      const templateData = req.body
      const userId = req.user.id

      if (!templateData || typeof templateData !== 'object') {
        return res.status(400).json({
          success: false,
          message: '模板数据无效'
        })
      }

      const template = await TemplateManagementService.importTemplate(templateData, userId)

      logger.info(`用户 ${userId} 导入模板: ${template.id}`)

      res.status(201).json({
        success: true,
        message: '模板导入成功',
        data: {
          templateId: template.id,
          name: template.name,
          type: template.type
        }
      })

    } catch (error) {
      logger.error('导入模板失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '导入模板失败'
      })
    }
  }

  /**
   * 导出模板
   */
  static async exportTemplate(req, res) {
    try {
      const { templateId } = req.params
      const { format = 'json' } = req.query

      const exportData = await TemplateManagementService.exportTemplate(templateId, format)

      // 设置响应头
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="template_${templateId}.${format}"`)

      res.send(exportData)

    } catch (error) {
      logger.error('导出模板失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '导出模板失败'
      })
    }
  }

  /**
   * 添加模板评价
   */
  static async addTemplateReview(req, res) {
    try {
      const { templateId } = req.params
      const { rating, comment } = req.body
      const userId = req.user.id

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: '评分必须在1-5之间'
        })
      }

      const template = await TemplateManagementService.getTemplateById(templateId)
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        })
      }

      await template.addReview(userId, rating, comment)

      logger.info(`用户 ${userId} 评价模板 ${templateId}: ${rating}分`)

      res.json({
        success: true,
        message: '评价添加成功',
        data: {
          rating: rating,
          averageRating: template.usage.averageRating,
          totalRatings: template.usage.totalRatings
        }
      })

    } catch (error) {
      logger.error('添加模板评价失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '添加模板评价失败'
      })
    }
  }

  /**
   * 获取模板类型列表
   */
  static async getTemplateTypes(req, res) {
    try {
      const types = [
        {
          value: 'datasheet',
          label: '数据表模板',
          description: '用于生成产品数据表文档'
        },
        {
          value: 'user_manual',
          label: '用户手册模板',
          description: '用于生成软件或产品的用户手册'
        },
        {
          value: 'combined_doc',
          label: '二合一文档模板',
          description: '包含数据表和用户手册的综合文档'
        },
        {
          value: 'api_documentation',
          label: 'API文档模板',
          description: '用于生成API接口文档'
        },
        {
          value: 'quick_guide',
          label: '快速指南模板',
          description: '用于生成快速入门指南'
        },
        {
          value: 'technical_spec',
          label: '技术规格模板',
          description: '用于生成技术规格说明书'
        },
        {
          value: 'installation_guide',
          label: '安装指南模板',
          description: '用于生成安装和配置指南'
        },
        {
          value: 'troubleshooting',
          label: '故障排除模板',
          description: '用于生成故障排除和维护文档'
        }
      ]

      res.json({
        success: true,
        data: types
      })

    } catch (error) {
      logger.error('获取模板类型失败:', error)
      res.status(500).json({
        success: false,
        message: '获取模板类型失败'
      })
    }
  }

  /**
   * 获取产品类别列表
   */
  static async getProductCategories(req, res) {
    try {
      const categories = [
        {
          value: 'pxi_module',
          label: 'PXI模块',
          description: 'PXI标准的模块化仪器'
        },
        {
          value: 'daq_system',
          label: 'DAQ系统',
          description: '数据采集系统和设备'
        },
        {
          value: 'test_equipment',
          label: '测试设备',
          description: '各类测试和测量设备'
        },
        {
          value: 'software_tool',
          label: '软件工具',
          description: '软件应用和开发工具'
        },
        {
          value: 'measurement_instrument',
          label: '测量仪器',
          description: '精密测量和分析仪器'
        },
        {
          value: 'universal',
          label: '通用',
          description: '适用于多种产品类型的通用模板'
        }
      ]

      res.json({
        success: true,
        data: categories
      })

    } catch (error) {
      logger.error('获取产品类别失败:', error)
      res.status(500).json({
        success: false,
        message: '获取产品类别失败'
      })
    }
  }

  /**
   * 初始化默认模板
   */
  static async initializeDefaultTemplates(req, res) {
    try {
      const userId = req.user.id

      await TemplateManagementService.initializeDefaultTemplates(userId)

      logger.info(`用户 ${userId} 初始化默认模板`)

      res.json({
        success: true,
        message: '默认模板初始化成功'
      })

    } catch (error) {
      logger.error('初始化默认模板失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '初始化默认模板失败'
      })
    }
  }

  /**
   * 验证模板变量
   */
  static async validateTemplateVariables(req, res) {
    try {
      const { templateId } = req.params
      const { variables } = req.body

      if (!variables || typeof variables !== 'object') {
        return res.status(400).json({
          success: false,
          message: '变量参数无效'
        })
      }

      const template = await TemplateManagementService.getTemplateById(templateId)
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        })
      }

      const validation = template.validateVariables(variables)

      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          templateId: templateId
        }
      })

    } catch (error) {
      logger.error('验证模板变量失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '验证模板变量失败'
      })
    }
  }

  /**
   * 获取模板预览
   */
  static async getTemplatePreview(req, res) {
    try {
      const { templateId } = req.params
      const { variables = {} } = req.body

      const template = await TemplateManagementService.getTemplateById(templateId)
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        })
      }

      // 生成预览内容（使用默认值或提供的变量）
      const previewVariables = { ...variables }
      
      // 为缺失的必填变量提供默认值
      template.structure.variables.forEach(varDef => {
        if (varDef.required && !previewVariables[varDef.name]) {
          previewVariables[varDef.name] = varDef.defaultValue || `[${varDef.description}]`
        }
      })

      const previewContent = await template.generateContent(previewVariables)

      res.json({
        success: true,
        data: {
          templateId: templateId,
          templateName: template.name,
          previewContent: previewContent,
          variables: previewVariables
        }
      })

    } catch (error) {
      logger.error('获取模板预览失败:', error)
      res.status(400).json({
        success: false,
        message: error.message || '获取模板预览失败'
      })
    }
  }
}

module.exports = TemplateController
