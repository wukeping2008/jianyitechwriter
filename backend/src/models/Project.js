const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // 项目类型
  type: {
    type: String,
    enum: [
      'translation_only',      // 仅翻译
      'generation_only',       // 仅生成
      'generation_translation', // 生成+翻译
      'batch_processing',      // 批量处理
      'template_creation'      // 模板创建
    ],
    required: true
  },
  
  // 产品信息
  productInfo: {
    name: String,
    model: String,
    series: String,
    category: {
      type: String,
      enum: [
        'pxi_module',
        'daq_system', 
        'test_equipment',
        'software_tool',
        'measurement_instrument'
      ]
    },
    specifications: mongoose.Schema.Types.Mixed
  },
  
  // 项目状态
  status: {
    type: String,
    enum: [
      'planning',      // 规划中
      'in_progress',   // 进行中
      'review',        // 审核中
      'completed',     // 已完成
      'on_hold',       // 暂停
      'cancelled',     // 已取消
      'archived'       // 已归档
    ],
    default: 'planning'
  },
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // 时间计划
  timeline: {
    startDate: Date,
    endDate: Date,
    estimatedDuration: Number, // 小时
    actualDuration: Number     // 小时
  },
  
  // 团队成员
  team: {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['translator', 'reviewer', 'editor', 'observer']
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    assignedTranslator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // 文档配置
  documentConfig: {
    // 源语言和目标语言
    sourceLanguage: {
      type: String,
      default: 'en'
    },
    targetLanguages: [{
      type: String,
      default: ['zh']
    }],
    
    // 文档类型配置
    outputTypes: [{
      type: String,
      enum: [
        'datasheet',
        'user_manual', 
        'combined_doc',
        'api_doc',
        'quick_guide'
      ]
    }],
    
    // 模板配置
    templates: [{
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template'
      },
      templateName: String,
      templateType: String,
      isDefault: Boolean
    }],
    
    // 处理选项
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
      autoReview: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // 进度跟踪
  progress: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    phases: {
      planning: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      materialCollection: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      contentGeneration: {
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
      review: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      finalization: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    }
  },
  
  // 文档关联
  documents: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    role: {
      type: String,
      enum: [
        'source_material',    // 源材料
        'reference_doc',      // 参考文档
        'generated_output',   // 生成输出
        'translated_output',  // 翻译输出
        'final_deliverable'   // 最终交付物
      ]
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 质量控制
  qualityControl: {
    reviewRequired: {
      type: Boolean,
      default: true
    },
    reviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    qualityStandards: {
      minimumScore: {
        type: Number,
        default: 0.8,
        min: 0,
        max: 1
      },
      requireTerminologyCheck: {
        type: Boolean,
        default: true
      },
      requireFormatCheck: {
        type: Boolean,
        default: true
      }
    },
    reviews: [{
      reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewedAt: Date,
      score: Number,
      comments: String,
      status: {
        type: String,
        enum: ['approved', 'rejected', 'needs_revision']
      }
    }]
  },
  
  // 统计信息
  statistics: {
    totalDocuments: {
      type: Number,
      default: 0
    },
    completedDocuments: {
      type: Number,
      default: 0
    },
    totalWords: {
      type: Number,
      default: 0
    },
    translatedWords: {
      type: Number,
      default: 0
    },
    generatedWords: {
      type: Number,
      default: 0
    },
    processingTime: {
      total: Number,
      generation: Number,
      translation: Number,
      review: Number
    },
    costs: {
      total: Number,
      generation: Number,
      translation: Number
    }
  },
  
  // 标签和分类
  tags: [String],
  category: String,
  
  // 备注和历史
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['note', 'milestone', 'issue', 'decision'],
      default: 'note'
    }
  }],
  
  // 里程碑
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending'
    }
  }],
  
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
projectSchema.index({ 'team.owner': 1, createdAt: -1 })
projectSchema.index({ status: 1, priority: 1 })
projectSchema.index({ type: 1 })
projectSchema.index({ 'productInfo.category': 1 })
projectSchema.index({ tags: 1 })
projectSchema.index({ 'timeline.endDate': 1 })

// 虚拟字段
projectSchema.virtual('isOverdue').get(function() {
  return this.timeline.endDate && 
         this.timeline.endDate < Date.now() && 
         this.status !== 'completed'
})

projectSchema.virtual('daysRemaining').get(function() {
  if (!this.timeline.endDate || this.status === 'completed') return null
  
  const now = new Date()
  const endDate = new Date(this.timeline.endDate)
  const diffTime = endDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
})

projectSchema.virtual('completionRate').get(function() {
  if (this.statistics.totalDocuments === 0) return 0
  return (this.statistics.completedDocuments / this.statistics.totalDocuments) * 100
})

// 中间件
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  
  // 计算总体进度
  const phases = this.progress.phases
  const phaseCount = Object.keys(phases).length
  const totalProgress = Object.values(phases).reduce((sum, progress) => sum + progress, 0)
  this.progress.overall = Math.round(totalProgress / phaseCount)
  
  // 设置完成时间
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = Date.now()
  }
  
  next()
})

// 实例方法
projectSchema.methods.addDocument = function(documentId, role) {
  this.documents.push({
    documentId: documentId,
    role: role
  })
  this.statistics.totalDocuments += 1
  return this.save()
}

projectSchema.methods.updateProgress = function(phase, value) {
  if (this.progress.phases[phase] !== undefined) {
    this.progress.phases[phase] = Math.max(0, Math.min(100, value))
    return this.save()
  }
}

projectSchema.methods.addTeamMember = function(userId, role) {
  const existingMember = this.team.members.find(
    member => member.user.toString() === userId.toString()
  )
  
  if (!existingMember) {
    this.team.members.push({
      user: userId,
      role: role
    })
    return this.save()
  }
  
  return Promise.resolve(this)
}

projectSchema.methods.addNote = function(authorId, content, type = 'note') {
  this.notes.push({
    author: authorId,
    content: content,
    type: type
  })
  return this.save()
}

projectSchema.methods.addMilestone = function(milestone) {
  this.milestones.push(milestone)
  return this.save()
}

projectSchema.methods.updateStatistics = function(stats) {
  Object.assign(this.statistics, stats)
  return this.save()
}

// 静态方法
projectSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { 'team.owner': userId },
      { 'team.members.user': userId }
    ]
  }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  return this.find(query)
    .populate('team.owner', 'username fullName')
    .populate('team.members.user', 'username fullName')
    .sort({ updatedAt: -1 })
}

projectSchema.statics.getOverdueProjects = function() {
  return this.find({
    'timeline.endDate': { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled', 'archived'] }
  })
    .populate('team.owner', 'username fullName')
    .sort({ 'timeline.endDate': 1 })
}

projectSchema.statics.getStatistics = async function(userId = null) {
  const matchStage = userId ? {
    $or: [
      { 'team.owner': mongoose.Types.ObjectId(userId) },
      { 'team.members.user': mongoose.Types.ObjectId(userId) }
    ]
  } : {}
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'in_progress'] },
              1,
              0
            ]
          }
        },
        completedProjects: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              1,
              0
            ]
          }
        },
        overdueProjects: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ['$timeline.endDate', new Date()] },
                  { $nin: ['$status', ['completed', 'cancelled', 'archived']] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalWords: { $sum: '$statistics.totalWords' },
        averageProgress: { $avg: '$progress.overall' }
      }
    }
  ])
  
  return stats[0] || {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    overdueProjects: 0,
    totalWords: 0,
    averageProgress: 0
  }
}

module.exports = mongoose.model('Project', projectSchema)
