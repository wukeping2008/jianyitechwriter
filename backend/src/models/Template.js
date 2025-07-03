const jsonDB = require('../config/jsonDatabase')
const { v4: uuidv4 } = require('uuid')

class Template {
  constructor(data) {
    // 基本信息
    this.id = data.id || uuidv4()
    this.name = data.name
    this.description = data.description || ''
    
    // 模板类型
    this.type = data.type
    this.productCategory = data.productCategory || 'universal'
    
    // 模板内容结构
    this.structure = data.structure || {
      sections: [],
      variables: [],
      styling: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
        lineHeight: 1.5,
        margins: {},
        colors: {}
      }
    }
    
    // 生成配置
    this.generationConfig = data.generationConfig || {
      prompts: {
        systemPrompt: '',
        sectionPrompts: []
      },
      parameters: {
        temperature: 0.3,
        maxTokens: 2000,
        model: 'gpt-4'
      },
      postProcessing: {
        formatTables: true,
        generateTOC: true,
        addPageNumbers: true,
        validateLinks: true
      }
    }
    
    // 示例数据
    this.sampleData = data.sampleData || {
      variables: {},
      generatedContent: '',
      previewImages: []
    }
    
    // 使用统计
    this.usage = data.usage || {
      timesUsed: 0,
      lastUsed: null,
      averageRating: 0,
      totalRatings: 0
    }
    
    // 版本控制
    this.version = data.version || '1.0.0'
    this.parentTemplate = data.parentTemplate || null
    this.childTemplates = data.childTemplates || []
    
    // 状态和权限
    this.status = data.status || 'draft'
    this.isPublic = data.isPublic || false
    this.isDefault = data.isDefault || false
    
    // 创建者和权限
    this.createdBy = data.createdBy
    this.organization = data.organization || '简仪科技'
    
    // 标签和分类
    this.tags = data.tags || []
    this.category = data.category || ''
    
    // 评价和反馈
    this.reviews = data.reviews || []
    
    // 时间戳
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  // 虚拟字段
  get isPopular() {
    return this.usage.timesUsed > 10 && this.usage.averageRating > 4
  }

  get sectionsCount() {
    return this.structure.sections.length
  }

  get variablesCount() {
    return this.structure.variables.length
  }

  // 实例方法
  async incrementUsage() {
    this.usage.timesUsed += 1
    this.usage.lastUsed = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
    
    return await jsonDB.updateById('templates', this.id, {
      usage: this.usage,
      updatedAt: this.updatedAt
    })
  }

  async addReview(userId, rating, comment) {
    // 检查用户是否已经评价过
    const existingReviewIndex = this.reviews.findIndex(
      review => review.user === userId
    )
    
    if (existingReviewIndex !== -1) {
      this.reviews[existingReviewIndex] = {
        user: userId,
        rating: rating,
        comment: comment,
        createdAt: new Date().toISOString()
      }
    } else {
      this.reviews.push({
        user: userId,
        rating: rating,
        comment: comment,
        createdAt: new Date().toISOString()
      })
    }
    
    // 重新计算平均评分
    if (this.reviews.length > 0) {
      const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0)
      this.usage.averageRating = totalRating / this.reviews.length
      this.usage.totalRatings = this.reviews.length
    }
    
    this.updatedAt = new Date().toISOString()
    
    return await jsonDB.updateById('templates', this.id, {
      reviews: this.reviews,
      usage: this.usage,
      updatedAt: this.updatedAt
    })
  }

  async generateContent(variables, aiService) {
    try {
      const generatedSections = []
      
      for (const section of this.structure.sections) {
        if (section.type === 'text' && section.template) {
          // 替换变量占位符
          let content = section.template
          for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g')
            content = content.replace(placeholder, value)
          }
          
          // 如果有AI提示词，使用AI生成内容
          const sectionPrompt = this.generationConfig.prompts.sectionPrompts.find(
            p => p.sectionId === section.id
          )
          
          if (sectionPrompt && aiService) {
            const aiContent = await aiService.generateContent(
              sectionPrompt.prompt,
              variables,
              this.generationConfig.parameters
            )
            content = aiContent
          }
          
          generatedSections.push({
            id: section.id,
            name: section.name,
            title: section.title,
            content: content,
            order: section.order
          })
        }
      }
      
      // 按顺序排序
      generatedSections.sort((a, b) => a.order - b.order)
      
      return {
        sections: generatedSections,
        metadata: {
          templateId: this.id,
          templateName: this.name,
          templateVersion: this.version,
          generatedAt: new Date().toISOString(),
          variables: variables
        }
      }
      
    } catch (error) {
      throw new Error(`模板内容生成失败: ${error.message}`)
    }
  }

  validateVariables(variables) {
    const errors = []
    
    for (const varDef of this.structure.variables) {
      const value = variables[varDef.name]
      
      // 检查必填字段
      if (varDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`变量 ${varDef.name} 是必填的`)
        continue
      }
      
      // 跳过空值的验证
      if (value === undefined || value === null || value === '') {
        continue
      }
      
      // 类型验证
      if (varDef.type === 'number' && isNaN(Number(value))) {
        errors.push(`变量 ${varDef.name} 必须是数字`)
      }
      
      // 范围验证
      if (varDef.validation) {
        if (varDef.validation.min !== undefined && Number(value) < varDef.validation.min) {
          errors.push(`变量 ${varDef.name} 不能小于 ${varDef.validation.min}`)
        }
        
        if (varDef.validation.max !== undefined && Number(value) > varDef.validation.max) {
          errors.push(`变量 ${varDef.name} 不能大于 ${varDef.validation.max}`)
        }
        
        // 正则表达式验证
        if (varDef.validation.pattern && !new RegExp(varDef.validation.pattern).test(value)) {
          errors.push(`变量 ${varDef.name} 格式不正确`)
        }
        
        // 枚举值验证
        if (varDef.validation.options && !varDef.validation.options.includes(value)) {
          errors.push(`变量 ${varDef.name} 必须是以下值之一: ${varDef.validation.options.join(', ')}`)
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  // 转换为普通对象
  toObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      productCategory: this.productCategory,
      structure: this.structure,
      generationConfig: this.generationConfig,
      sampleData: this.sampleData,
      usage: this.usage,
      version: this.version,
      parentTemplate: this.parentTemplate,
      childTemplates: this.childTemplates,
      status: this.status,
      isPublic: this.isPublic,
      isDefault: this.isDefault,
      createdBy: this.createdBy,
      organization: this.organization,
      tags: this.tags,
      category: this.category,
      reviews: this.reviews,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // 虚拟字段
      isPopular: this.isPopular,
      sectionsCount: this.sectionsCount,
      variablesCount: this.variablesCount
    }
  }

  // 静态方法
  static async findByType(type, productCategory = null) {
    const query = { type: type, status: 'active' }
    
    if (productCategory) {
      // 查找指定类别或通用类别的模板
      const templates = await jsonDB.find('templates', query)
      return templates.filter(template => 
        template.productCategory === productCategory || 
        template.productCategory === 'universal'
      ).sort((a, b) => {
        // 按评分和使用次数排序
        if (b.usage.averageRating !== a.usage.averageRating) {
          return b.usage.averageRating - a.usage.averageRating
        }
        return b.usage.timesUsed - a.usage.timesUsed
      })
    }
    
    const templates = await jsonDB.find('templates', query)
    return templates.sort((a, b) => {
      if (b.usage.averageRating !== a.usage.averageRating) {
        return b.usage.averageRating - a.usage.averageRating
      }
      return b.usage.timesUsed - a.usage.timesUsed
    })
  }

  static async findPopular(limit = 10) {
    const templates = await jsonDB.find('templates', { 
      status: 'active'
    })
    
    return templates
      .filter(template => 
        template.usage.timesUsed >= 5 && 
        template.usage.averageRating >= 4
      )
      .sort((a, b) => {
        if (b.usage.timesUsed !== a.usage.timesUsed) {
          return b.usage.timesUsed - a.usage.timesUsed
        }
        return b.usage.averageRating - a.usage.averageRating
      })
      .slice(0, limit)
  }

  static async findByUser(userId) {
    const templates = await jsonDB.find('templates', { createdBy: userId })
    return templates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  static async getStatistics() {
    const templates = await jsonDB.find('templates')
    
    if (templates.length === 0) {
      return {
        totalTemplates: 0,
        activeTemplates: 0,
        totalUsage: 0,
        averageRating: 0,
        templatesByType: []
      }
    }
    
    const activeTemplates = templates.filter(t => t.status === 'active')
    const totalUsage = templates.reduce((sum, t) => sum + (t.usage.timesUsed || 0), 0)
    const ratingsSum = templates.reduce((sum, t) => sum + (t.usage.averageRating || 0), 0)
    const averageRating = ratingsSum / templates.length
    
    // 按类型统计
    const typeStats = {}
    templates.forEach(template => {
      typeStats[template.type] = (typeStats[template.type] || 0) + 1
    })
    
    const templatesByType = Object.entries(typeStats).map(([type, count]) => ({
      type,
      count
    }))
    
    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      totalUsage: totalUsage,
      averageRating: Math.round(averageRating * 100) / 100,
      templatesByType: templatesByType
    }
  }

  static async create(data) {
    const template = new Template(data)
    const saved = await jsonDB.insertOne('templates', template.toObject())
    return new Template(saved)
  }

  static async findById(id) {
    const template = await jsonDB.findById('templates', id)
    return template ? new Template(template) : null
  }

  static async updateById(id, updates) {
    updates.updatedAt = new Date().toISOString()
    const updated = await jsonDB.updateById('templates', id, updates)
    return updated ? new Template(updated) : null
  }

  static async deleteById(id) {
    return await jsonDB.deleteById('templates', id)
  }

  static async find(query = {}) {
    const templates = await jsonDB.find('templates', query)
    return templates.map(template => new Template(template))
  }
}

module.exports = Template
