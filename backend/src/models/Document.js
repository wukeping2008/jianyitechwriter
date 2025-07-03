const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // 文档类型和分类
  type: {
    type: String,
    enum: [
      'translation',           // 翻译文档
      'generated_datasheet',   // 生成的数据表
      'generated_manual',      // 生成的用户手册
      'generated_combined',    // 生成的二合一文档
      'source_material',       // 源材料
      'template',             // 模板文档
      'reference'             // 参考文档
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'pxi_module',           // PXI模块
      'daq_system',           // 数据采集系统
      'test_equipment',       // 测试设备
      'software_tool',        // 软件工具
      'technical_spec',       // 技术规格
      'user_guide',          // 用户指南
      'api_documentation',    // API文档
      'training_material',    // 培训材料
      'marketing_material'    // 营销材料
    ]
  },
  
  // 文件信息
  originalFileName: String,
  fileSize: Number,
  mimeType: String,
  fileExtension: String,
  filePath: String,
  
  // 语言信息
  sourceLanguage: {
    type: String,
    default: 'en'
  },
  targetLanguage: {
    type: String,
    default: 'zh'
  },
  
  // 内容信息
  content: {
    // 原始内容
    original: {
      text: String,
      structure: mongoose.Schema.Types.Mixed, // 文档结构信息
      metadata: mongoose.Schema.Types.Mixed   // 元数据
    },
    
    // 翻译内容
    translated: {
      text: String,
      structure: mongoose.Schema.Types.Mixed,
      metadata: mongoose.Schema.Types.Mixed
    },
    
    // 生成内容（用于AI生成的文档）
    generated: {
      sections: [{
        type: {
          type: String,
          enum: [
            'overview',
            'specifications',
            'features',
            'installation',
            'operation',
            'troubleshooting',
            'appendix'
          ]
        },
        title: String,
        content: String,
        order: Number
      }],
      templates: [{
        templateId: mongoose.Schema.Types.ObjectId,
        templateName: String,
        appliedAt: Date
      }]
    }
  },
  
  // 处理状态
  status: {
    type: String,
    enum: [
      'uploaded',           // 已上传
      'processing',         // 处理中
      'parsed',            // 已解析
      'translating',       // 翻译中
      'generating',        // 生成中
      'completed',         // 已完成
      'reviewing',         // 审核中
      'approved',          // 已批准
      'rejected',          // 已拒绝
      'archived',          // 已归档
      'error'              // 错误
    ],
    default: 'uploaded'
  },
  
  // 处理进度
  progress: {
    parsing: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    translation: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    generation: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // 质量评估
  quality: {
    translationScore: {
      type: Number,
      min: 0,
      max: 1
    },
    generationScore: {
      type: Number,
      min: 0,
      max: 1
    },
    terminologyAccuracy: {
      type: Number,
      min: 0,
      max: 1
    },
    formatConsistency: {
      type: Number,
      min: 0,
      max: 1
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 1
    },
    reviewComments: [String],
    lastQualityCheck: Date
  },
  
  // 术语使用
  terminology: {
    detected: [{
      term: String,
      translation: String,
      confidence: Number,
      position: Number,
      context: String
    }],
    applied: [{
      termId: mongoose.Schema.Types.ObjectId,
      term: String,
      translation: String,
      occurrences: Number
    }],
    suggestions: [{
      term: String,
      suggestedTranslation: String,
      confidence: Number,
      reason: String
    }]
  },
  
  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  parentDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  childDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // 项目关联
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // 用户信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    status: {
      type: String,
      enum: ['approved', 'rejected', 'needs_revision']
    },
    comments: String
  }],
  
  // 处理配置
  processingOptions: {
    translationQuality: {
      type: String,
      enum: ['fast', 'balanced', 'accurate'],
      default: 'balanced'
    },
    preserveFormatting: {
      type: Boolean,
      default: true
    },
    enableTerminologyCheck: {
      type: Boolean,
      default: true
    },
    generateSummary: {
      type: Boolean,
      default: false
    },
    customInstructions: String
  },
  
  // 统计信息
  statistics: {
    wordCount: {
      original: Number,
      translated: Number
    },
    characterCount: {
      original: Number,
      translated: Number
    },
    processingTime: {
      parsing: Number,      // 毫秒
      translation: Number,  // 毫秒
      generation: Number,   // 毫秒
      total: Number        // 毫秒
    },
    apiCalls: {
      translation: Number,
      generation: Number,
      total: Number
    },
    cost: {
      translation: Number,  // 美元
      generation: Number,   // 美元
      total: Number        // 美元
    }
  },
  
  // 标签和元数据
  tags: [String],
  metadata: {
    productName: String,
    productModel: String,
    productSeries: String,
    documentVersion: String,
    technicalSpecs: mongoose.Schema.Types.Mixed,
    customFields: mongoose.Schema.Types.Mixed
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  archivedAt: Date
}, {
  timestamps: true
})

// 索引
documentSchema.index({ createdBy: 1, createdAt: -1 })
documentSchema.index({ type: 1, status: 1 })
documentSchema.index({ category: 1 })
documentSchema.index({ projectId: 1 })
documentSchema.index({ 'metadata.productName': 1 })
documentSchema.index({ tags: 1 })
documentSchema.index({ status: 1, updatedAt: -1 })

// 虚拟字段
documentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' || this.status === 'approved'
})

documentSchema.virtual('processingTimeFormatted').get(function() {
  if (!this.statistics.processingTime.total) return null
  
  const totalMs = this.statistics.processingTime.total
  const minutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  
  return `${minutes}分${seconds}秒`
})

// 中间件
documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  
  // 计算总体进度
  const { parsing, translation, generation } = this.progress
  this.progress.overall = Math.round((parsing + translation + generation) / 3)
  
  // 设置完成时间
  if (this.isCompleted && !this.completedAt) {
    this.completedAt = Date.now()
  }
  
  next()
})

// 实例方法
documentSchema.methods.updateProgress = function(type, value) {
  if (this.progress[type] !== undefined) {
    this.progress[type] = Math.max(0, Math.min(100, value))
    return this.save()
  }
}

documentSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus
  
  if (userId && ['approved', 'rejected'].includes(newStatus)) {
    this.reviewedBy.push({
      user: userId,
      reviewedAt: Date.now(),
      status: newStatus
    })
  }
  
  return this.save()
}

documentSchema.methods.addTerminology = function(terminology) {
  this.terminology.applied.push(terminology)
  return this.save()
}

documentSchema.methods.updateQuality = function(qualityData) {
  Object.assign(this.quality, qualityData)
  this.quality.lastQualityCheck = Date.now()
  return this.save()
}

// 静态方法
documentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { createdBy: userId }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  return this.find(query)
    .populate('createdBy', 'username fullName')
    .populate('assignedTo', 'username fullName')
    .sort({ updatedAt: -1 })
}

documentSchema.statics.getStatistics = async function(userId = null) {
  const matchStage = userId ? { createdBy: mongoose.Types.ObjectId(userId) } : {}
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        completedDocuments: {
          $sum: {
            $cond: [
              { $in: ['$status', ['completed', 'approved']] },
              1,
              0
            ]
          }
        },
        totalWords: { $sum: '$statistics.wordCount.original' },
        totalProcessingTime: { $sum: '$statistics.processingTime.total' },
        averageQuality: { $avg: '$quality.overallScore' }
      }
    }
  ])
  
  return stats[0] || {
    totalDocuments: 0,
    completedDocuments: 0,
    totalWords: 0,
    totalProcessingTime: 0,
    averageQuality: 0
  }
}

documentSchema.statics.findPendingReview = function() {
  return this.find({ status: 'reviewing' })
    .populate('createdBy', 'username fullName')
    .sort({ updatedAt: 1 })
}

module.exports = mongoose.model('Document', documentSchema)
