const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  
  // 角色和权限
  role: {
    type: String,
    enum: ['admin', 'translator', 'reviewer', 'user'],
    default: 'user'
  },
  permissions: [{
    type: String,
    enum: [
      'translate_documents',
      'generate_documents', 
      'manage_terminology',
      'review_translations',
      'manage_users',
      'manage_templates',
      'access_analytics',
      'export_documents',
      'manage_projects'
    ]
  }],
  
  // 用户偏好设置
  preferences: {
    language: {
      type: String,
      enum: ['zh', 'en'],
      default: 'zh'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    defaultSourceLanguage: {
      type: String,
      default: 'en'
    },
    defaultTargetLanguage: {
      type: String,
      default: 'zh'
    },
    translationQuality: {
      type: String,
      enum: ['fast', 'balanced', 'accurate'],
      default: 'balanced'
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    showTerminologyHints: {
      type: Boolean,
      default: true
    },
    enableKeyboardShortcuts: {
      type: Boolean,
      default: true
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      },
      translationComplete: {
        type: Boolean,
        default: true
      },
      documentGenerated: {
        type: Boolean,
        default: true
      },
      systemUpdates: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // 统计信息
  statistics: {
    documentsTranslated: {
      type: Number,
      default: 0
    },
    documentsGenerated: {
      type: Number,
      default: 0
    },
    wordsTranslated: {
      type: Number,
      default: 0
    },
    projectsCompleted: {
      type: Number,
      default: 0
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // 账户状态
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // 组织信息
  organization: {
    type: String,
    default: '简仪科技'
  },
  department: String,
  jobTitle: String,
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password
      delete ret.emailVerificationToken
      delete ret.passwordResetToken
      return ret
    }
  }
})

// 索引
userSchema.index({ email: 1 })
userSchema.index({ username: 1 })
userSchema.index({ role: 1 })
userSchema.index({ 'statistics.lastActiveAt': -1 })

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// 更新时间中间件
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// 实例方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

userSchema.methods.hasPermission = function(permission) {
  return this.role === 'admin' || this.permissions.includes(permission)
}

userSchema.methods.updateLastActive = function() {
  this.statistics.lastActiveAt = Date.now()
  this.lastLoginAt = Date.now()
  return this.save()
}

userSchema.methods.incrementStats = function(type, value = 1) {
  if (this.statistics[type] !== undefined) {
    this.statistics[type] += value
    return this.save()
  }
}

// 静态方法
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() })
}

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true })
}

userSchema.statics.getUsersByRole = function(role) {
  return this.find({ role: role, isActive: true })
}

userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        totalDocumentsTranslated: { $sum: '$statistics.documentsTranslated' },
        totalDocumentsGenerated: { $sum: '$statistics.documentsGenerated' },
        totalWordsTranslated: { $sum: '$statistics.wordsTranslated' }
      }
    }
  ])
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    totalDocumentsTranslated: 0,
    totalDocumentsGenerated: 0,
    totalWordsTranslated: 0
  }
}

module.exports = mongoose.model('User', userSchema)
