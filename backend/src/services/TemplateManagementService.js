const Template = require('../models/Template')
const EventEmitter = require('events')
const logger = require('../utils/logger')
const fs = require('fs').promises
const path = require('path')

class TemplateManagementService extends EventEmitter {
  constructor() {
    super()
    
    // 模板缓存
    this.templateCache = new Map()
    this.cacheExpiry = 30 * 60 * 1000 // 30分钟缓存
    
    // 预定义模板配置
    this.defaultTemplates = {
      'pxi_datasheet': {
        name: 'PXI模块数据表模板',
        type: 'datasheet',
        productCategory: 'pxi_module',
        description: '用于生成PXI模块的标准数据表文档',
        structure: {
          sections: [
            {
              id: 'overview',
              name: 'overview',
              title: '产品概述',
              order: 1,
              required: true,
              type: 'text',
              template: '{{productName}}是简仪科技开发的{{productType}}，主要用于{{primaryApplication}}。该产品具有{{keyFeatures}}等特点。',
              placeholder: '请描述产品的基本信息和主要特点'
            },
            {
              id: 'specifications',
              name: 'specifications',
              title: '技术规格',
              order: 2,
              required: true,
              type: 'table',
              template: '技术规格表格模板',
              placeholder: '请填写详细的技术参数'
            },
            {
              id: 'features',
              name: 'features',
              title: '产品特性',
              order: 3,
              required: true,
              type: 'list',
              template: '• {{feature1}}\n• {{feature2}}\n• {{feature3}}',
              placeholder: '请列出产品的主要特性'
            },
            {
              id: 'applications',
              name: 'applications',
              title: '应用领域',
              order: 4,
              required: false,
              type: 'text',
              template: '{{productName}}广泛应用于{{applicationAreas}}等领域。',
              placeholder: '请描述产品的应用场景'
            },
            {
              id: 'ordering_info',
              name: 'ordering_info',
              title: '订购信息',
              order: 5,
              required: true,
              type: 'table',
              template: '订购信息表格模板',
              placeholder: '请提供产品型号和订购信息'
            }
          ],
          variables: [
            {
              name: 'productName',
              type: 'text',
              description: '产品名称',
              required: true,
              defaultValue: '',
              validation: {
                pattern: '^[A-Za-z0-9\\s\\-]+$'
              }
            },
            {
              name: 'productType',
              type: 'text',
              description: '产品类型',
              required: true,
              validation: {
                options: ['PXI模块', 'DAQ设备', '测试仪器', '软件工具']
              }
            },
            {
              name: 'primaryApplication',
              type: 'text',
              description: '主要应用',
              required: true
            },
            {
              name: 'keyFeatures',
              type: 'text',
              description: '关键特性',
              required: true
            }
          ]
        }
      },
      'seesharp_user_manual': {
        name: 'SeeSharp用户手册模板',
        type: 'user_manual',
        productCategory: 'software_tool',
        description: '用于生成SeeSharp软件的用户手册',
        structure: {
          sections: [
            {
              id: 'introduction',
              name: 'introduction',
              title: '软件介绍',
              order: 1,
              required: true,
              type: 'text',
              template: 'SeeSharp是简仪科技开发的{{softwareType}}，版本{{version}}。本软件主要用于{{mainPurpose}}。',
              placeholder: '请介绍软件的基本信息'
            },
            {
              id: 'installation',
              name: 'installation',
              title: '安装指南',
              order: 2,
              required: true,
              type: 'procedures',
              template: '安装步骤模板',
              placeholder: '请提供详细的安装步骤'
            },
            {
              id: 'getting_started',
              name: 'getting_started',
              title: '快速入门',
              order: 3,
              required: true,
              type: 'procedures',
              template: '快速入门指南模板',
              placeholder: '请提供快速上手的步骤'
            },
            {
              id: 'user_interface',
              name: 'user_interface',
              title: '用户界面',
              order: 4,
              required: true,
              type: 'text',
              template: 'SeeSharp的用户界面包括{{uiComponents}}等主要组件。',
              placeholder: '请描述软件的用户界面'
            },
            {
              id: 'functions',
              name: 'functions',
              title: '功能说明',
              order: 5,
              required: true,
              type: 'text',
              template: '功能说明模板',
              placeholder: '请详细说明软件的各项功能'
            }
          ],
          variables: [
            {
              name: 'softwareType',
              type: 'text',
              description: '软件类型',
              required: true,
              validation: {
                options: ['测控软件平台', '数据采集软件', '分析工具', '开发环境']
              }
            },
            {
              name: 'version',
              type: 'text',
              description: '软件版本',
              required: true,
              validation: {
                pattern: '^\\d+\\.\\d+\\.\\d+$'
              }
            },
            {
              name: 'mainPurpose',
              type: 'text',
              description: '主要用途',
              required: true
            }
          ]
        }
      }
    }
    
    // 统计信息
    this.stats = {
      totalTemplates: 0,
      activeTemplates: 0,
      totalGenerations: 0,
      averageGenerationTime: 0,
      popularTemplates: new Map()
    }
  }

  /**
   * 初始化默认模板
   */
  async initializeDefaultTemplates(userId) {
    try {
      logger.info('开始初始化默认模板')
      
      for (const [key, templateData] of Object.entries(this.defaultTemplates)) {
        // 检查是否已存在相同的默认模板
        const existingTemplates = await Template.find({
          type: templateData.type,
          productCategory: templateData.productCategory,
          isDefault: true
        })
        
        if (existingTemplates.length === 0) {
          const template = await Template.create({
            ...templateData,
            createdBy: userId,
            isDefault: true,
            isPublic: true,
            status: 'active',
            version: '1.0.0'
          })
          
          logger.info(`创建默认模板: ${templateData.name}`)
        }
      }
      
      this.emit('defaultTemplatesInitialized')
      logger.info('默认模板初始化完成')
      
    } catch (error) {
      logger.error('初始化默认模板失败:', error)
      throw error
    }
  }

  /**
   * 创建新模板
   */
  async createTemplate(templateData, userId) {
    try {
      logger.info(`用户 ${userId} 创建新模板: ${templateData.name}`)
      
      // 验证模板数据
      const validation = this.validateTemplateData(templateData)
      if (!validation.isValid) {
        throw new Error(`模板数据验证失败: ${validation.errors.join(', ')}`)
      }
      
      const template = await Template.create({
        ...templateData,
        createdBy: userId,
        status: 'draft',
        version: '1.0.0'
      })
      
      // 清除缓存
      this.clearTemplateCache()
      
      // 触发事件
      this.emit('templateCreated', {
        templateId: template.id,
        templateName: template.name,
        userId: userId
      })
      
      logger.info(`模板创建成功: ${template.id}`)
      return template
      
    } catch (error) {
      logger.error('创建模板失败:', error)
      throw error
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(templateId, updateData, userId) {
    try {
      const template = await Template.findById(templateId)
      if (!template) {
        throw new Error('模板不存在')
      }
      
      // 权限检查
      if (template.createdBy !== userId) {
        throw new Error('无权限修改此模板')
      }
      
      // 验证更新数据
      if (updateData.structure) {
        const validation = this.validateTemplateStructure(updateData.structure)
        if (!validation.isValid) {
          throw new Error(`模板结构验证失败: ${validation.errors.join(', ')}`)
        }
      }
      
      // 更新版本号
      if (updateData.structure || updateData.generationConfig) {
        const versionParts = template.version.split('.')
        versionParts[1] = (parseInt(versionParts[1]) + 1).toString()
        updateData.version = versionParts.join('.')
      }
      
      const updatedTemplate = await Template.updateById(templateId, updateData)
      
      // 清除缓存
      this.clearTemplateCache(templateId)
      
      // 触发事件
      this.emit('templateUpdated', {
        templateId: updatedTemplate.id,
        templateName: updatedTemplate.name,
        userId: userId,
        version: updatedTemplate.version
      })
      
      logger.info(`模板更新成功: ${templateId}`)
      return updatedTemplate
      
    } catch (error) {
      logger.error('更新模板失败:', error)
      throw error
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId, userId) {
    try {
      const template = await Template.findById(templateId)
      if (!template) {
        throw new Error('模板不存在')
      }
      
      // 权限检查
      if (template.createdBy !== userId) {
        throw new Error('无权限删除此模板')
      }
      
      // 检查是否为默认模板
      if (template.isDefault) {
        throw new Error('不能删除默认模板')
      }
      
      // 软删除：标记为已归档
      await Template.updateById(templateId, { status: 'archived' })
      
      // 清除缓存
      this.clearTemplateCache(templateId)
      
      // 触发事件
      this.emit('templateDeleted', {
        templateId: template.id,
        templateName: template.name,
        userId: userId
      })
      
      logger.info(`模板删除成功: ${templateId}`)
      return { success: true, message: '模板已归档' }
      
    } catch (error) {
      logger.error('删除模板失败:', error)
      throw error
    }
  }

  /**
   * 复制模板
   */
  async duplicateTemplate(templateId, newName, userId) {
    try {
      const originalTemplate = await Template.findById(templateId)
      if (!originalTemplate) {
        throw new Error('原模板不存在')
      }
      
      // 检查访问权限
      if (!originalTemplate.isPublic && originalTemplate.createdBy !== userId) {
        throw new Error('无权限复制此模板')
      }
      
      const duplicatedTemplate = await Template.create({
        name: newName || `${originalTemplate.name} (副本)`,
        description: originalTemplate.description,
        type: originalTemplate.type,
        productCategory: originalTemplate.productCategory,
        structure: originalTemplate.structure,
        generationConfig: originalTemplate.generationConfig,
        tags: [...originalTemplate.tags],
        category: originalTemplate.category,
        createdBy: userId,
        parentTemplate: originalTemplate.id,
        status: 'draft',
        version: '1.0.0'
      })
      
      // 更新原模板的子模板列表
      const childTemplates = [...originalTemplate.childTemplates, duplicatedTemplate.id]
      await Template.updateById(templateId, { childTemplates })
      
      // 触发事件
      this.emit('templateDuplicated', {
        originalTemplateId: templateId,
        newTemplateId: duplicatedTemplate.id,
        userId: userId
      })
      
      logger.info(`模板复制成功: ${templateId} -> ${duplicatedTemplate.id}`)
      return duplicatedTemplate
      
    } catch (error) {
      logger.error('复制模板失败:', error)
      throw error
    }
  }

  /**
   * 生成文档内容
   */
  async generateDocument(templateId, variables, options = {}) {
    try {
      const startTime = Date.now()
      
      // 获取模板
      const template = await this.getTemplateById(templateId)
      if (!template) {
        throw new Error('模板不存在')
      }
      
      // 验证变量
      const validation = template.validateVariables(variables)
      if (!validation.isValid) {
        throw new Error(`变量验证失败: ${validation.errors.join(', ')}`)
      }
      
      // 生成内容
      const generatedContent = await template.generateContent(variables, options.aiService)
      
      // 更新使用统计
      await template.incrementUsage()
      
      // 记录生成时间
      const generationTime = Date.now() - startTime
      this.updateGenerationStats(generationTime)
      
      // 触发事件
      this.emit('documentGenerated', {
        templateId: templateId,
        templateName: template.name,
        generationTime: generationTime,
        variableCount: Object.keys(variables).length
      })
      
      logger.info(`文档生成成功: 模板 ${templateId}, 耗时 ${generationTime}ms`)
      
      return {
        content: generatedContent,
        metadata: {
          templateId: templateId,
          templateName: template.name,
          templateVersion: template.version,
          generatedAt: new Date(),
          generationTime: generationTime,
          variables: variables
        }
      }
      
    } catch (error) {
      logger.error('生成文档失败:', error)
      throw error
    }
  }

  /**
   * 获取模板列表
   */
  async getTemplates(filters = {}, pagination = {}) {
    try {
      const {
        type,
        productCategory,
        status = 'active',
        isPublic,
        createdBy,
        tags,
        search
      } = filters
      
      const {
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = pagination
      
      // 构建查询条件
      const query = { status }
      
      if (type) query.type = type
      if (isPublic !== undefined) query.isPublic = isPublic
      if (createdBy) query.createdBy = createdBy
      
      // 获取所有模板
      let templates = await Template.find(query)
      
      // 产品类别过滤
      if (productCategory) {
        templates = templates.filter(template => 
          template.productCategory === productCategory || 
          template.productCategory === 'universal'
        )
      }
      
      // 标签过滤
      if (tags && tags.length > 0) {
        templates = templates.filter(template =>
          tags.some(tag => template.tags.includes(tag))
        )
      }
      
      // 搜索过滤
      if (search) {
        const searchLower = search.toLowerCase()
        templates = templates.filter(template =>
          template.name.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower) ||
          template.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }
      
      // 排序
      templates.sort((a, b) => {
        let aValue = a[sortBy]
        let bValue = b[sortBy]
        
        if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
          aValue = new Date(aValue)
          bValue = new Date(bValue)
        }
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1
        } else {
          return aValue > bValue ? 1 : -1
        }
      })
      
      // 分页
      const total = templates.length
      const startIndex = (page - 1) * limit
      const paginatedTemplates = templates.slice(startIndex, startIndex + limit)
      
      return {
        templates: paginatedTemplates,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
      
    } catch (error) {
      logger.error('获取模板列表失败:', error)
      throw error
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplateById(templateId, useCache = true) {
    try {
      // 检查缓存
      if (useCache && this.templateCache.has(templateId)) {
        const cached = this.templateCache.get(templateId)
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.template
        }
      }
      
      const template = await Template.findById(templateId)
      
      if (!template) {
        return null
      }
      
      // 更新缓存
      if (useCache) {
        this.templateCache.set(templateId, {
          template: template,
          timestamp: Date.now()
        })
      }
      
      return template
      
    } catch (error) {
      logger.error('获取模板详情失败:', error)
      throw error
    }
  }

  /**
   * 获取推荐模板
   */
  async getRecommendedTemplates(userId, limit = 5) {
    try {
      // 获取用户最近使用的模板类型
      const userTemplates = await Template.find({ createdBy: userId })
      
      // 按最后使用时间排序
      userTemplates.sort((a, b) => {
        const aLastUsed = a.usage.lastUsed ? new Date(a.usage.lastUsed) : new Date(0)
        const bLastUsed = b.usage.lastUsed ? new Date(b.usage.lastUsed) : new Date(0)
        return bLastUsed - aLastUsed
      })
      
      const recentUserTemplates = userTemplates.slice(0, 10)
      const userTypes = [...new Set(recentUserTemplates.map(t => t.type))]
      const userCategories = [...new Set(recentUserTemplates.map(t => t.productCategory))]
      
      // 获取所有公开的活跃模板
      const allTemplates = await Template.find({
        status: 'active',
        isPublic: true
      })
      
      // 推荐相似类型的热门模板
      const recommendations = allTemplates
        .filter(template => 
          template.createdBy !== userId && (
            userTypes.includes(template.type) ||
            userCategories.includes(template.productCategory) ||
            template.usage.averageRating >= 4
          )
        )
        .sort((a, b) => {
          // 按使用次数和评分排序
          if (b.usage.timesUsed !== a.usage.timesUsed) {
            return b.usage.timesUsed - a.usage.timesUsed
          }
          return b.usage.averageRating - a.usage.averageRating
        })
        .slice(0, limit)
      
      return recommendations
      
    } catch (error) {
      logger.error('获取推荐模板失败:', error)
      throw error
    }
  }

  /**
   * 获取模板统计信息
   */
  async getTemplateStatistics() {
    try {
      const stats = await Template.getStatistics()
      
      // 获取最受欢迎的模板
      const popularTemplates = await Template.findPopular(5)
      
      // 获取最新模板
      const allTemplates = await Template.find({ status: 'active' })
      const recentTemplates = allTemplates
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
      
      return {
        ...stats,
        popularTemplates: popularTemplates,
        recentTemplates: recentTemplates,
        generationStats: {
          totalGenerations: this.stats.totalGenerations,
          averageGenerationTime: this.stats.averageGenerationTime
        }
      }
      
    } catch (error) {
      logger.error('获取模板统计失败:', error)
      throw error
    }
  }

  /**
   * 导入模板
   */
  async importTemplate(templateData, userId) {
    try {
      // 验证导入数据
      const validation = this.validateTemplateData(templateData)
      if (!validation.isValid) {
        throw new Error(`模板数据验证失败: ${validation.errors.join(', ')}`)
      }
      
      // 检查是否存在同名模板
      const existingTemplates = await Template.find({
        name: templateData.name,
        createdBy: userId
      })
      
      if (existingTemplates.length > 0) {
        templateData.name = `${templateData.name} (导入)`
      }
      
      const template = await Template.create({
        ...templateData,
        createdBy: userId,
        status: 'draft'
      })
      
      // 触发事件
      this.emit('templateImported', {
        templateId: template.id,
        templateName: template.name,
        userId: userId
      })
      
      logger.info(`模板导入成功: ${template.id}`)
      return template
      
    } catch (error) {
      logger.error('导入模板失败:', error)
      throw error
    }
  }

  /**
   * 导出模板
   */
  async exportTemplate(templateId, format = 'json') {
    try {
      const template = await Template.findById(templateId)
      if (!template) {
        throw new Error('模板不存在')
      }
      
      // 移除不需要导出的字段
      const exportData = {
        name: template.name,
        description: template.description,
        type: template.type,
        productCategory: template.productCategory,
        structure: template.structure,
        generationConfig: template.generationConfig,
        tags: template.tags,
        category: template.category,
        version: template.version,
        exportedAt: new Date(),
        exportFormat: format
      }
      
      if (format === 'json') {
        return JSON.stringify(exportData, null, 2)
      }
      
      // 其他格式可以在这里扩展
      throw new Error(`不支持的导出格式: ${format}`)
      
    } catch (error) {
      logger.error('导出模板失败:', error)
      throw error
    }
  }

  // 辅助方法
  validateTemplateData(templateData) {
    const errors = []
    
    if (!templateData.name || templateData.name.trim().length === 0) {
      errors.push('模板名称不能为空')
    }
    
    if (!templateData.type) {
      errors.push('模板类型不能为空')
    }
    
    if (templateData.structure) {
      const structureValidation = this.validateTemplateStructure(templateData.structure)
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  validateTemplateStructure(structure) {
    const errors = []
    
    if (!structure.sections || !Array.isArray(structure.sections)) {
      errors.push('模板必须包含sections数组')
    } else {
      structure.sections.forEach((section, index) => {
        if (!section.id) {
          errors.push(`第${index + 1}个section缺少id`)
        }
        if (!section.name) {
          errors.push(`第${index + 1}个section缺少name`)
        }
        if (!section.title) {
          errors.push(`第${index + 1}个section缺少title`)
        }
      })
    }
    
    if (!structure.variables || !Array.isArray(structure.variables)) {
      errors.push('模板必须包含variables数组')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  clearTemplateCache(templateId = null) {
    if (templateId) {
      this.templateCache.delete(templateId)
    } else {
      this.templateCache.clear()
    }
  }

  updateGenerationStats(generationTime) {
    this.stats.totalGenerations++
    this.stats.averageGenerationTime = 
      (this.stats.averageGenerationTime * (this.stats.totalGenerations - 1) + generationTime) / 
      this.stats.totalGenerations
  }
}

// 创建单例实例
const templateManagementService = new TemplateManagementService()

module.exports = templateManagementService
