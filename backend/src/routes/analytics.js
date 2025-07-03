const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth')
const jsonDB = require('../config/jsonDatabase')

// 获取系统统计信息
router.get('/stats', authenticate, authorize('access_analytics'), async (req, res) => {
  try {
    const users = await jsonDB.find('users')
    const documents = await jsonDB.find('documents')
    const terminology = await jsonDB.find('terminology')
    const templates = await jsonDB.find('templates')

    const stats = {
      users: {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        byRole: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1
          return acc
        }, {})
      },
      documents: {
        total: documents.length,
        byStatus: documents.reduce((acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1
          return acc
        }, {}),
        byType: documents.reduce((acc, doc) => {
          acc[doc.type] = (acc[doc.type] || 0) + 1
          return acc
        }, {})
      },
      terminology: {
        total: terminology.length,
        byCategory: terminology.reduce((acc, term) => {
          acc[term.category] = (acc[term.category] || 0) + 1
          return acc
        }, {})
      },
      templates: {
        total: templates.length,
        active: templates.filter(t => t.status === 'active').length
      }
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取统计信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取用户活动统计
router.get('/user-activity', authenticate, authorize('access_analytics'), async (req, res) => {
  try {
    const { period = '7d' } = req.query
    
    // 计算时间范围
    const now = new Date()
    let startDate
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const users = await jsonDB.find('users')
    const documents = await jsonDB.find('documents')

    // 活跃用户统计
    const activeUsers = users.filter(user => {
      if (!user.lastActiveAt) return false
      const lastActive = new Date(user.lastActiveAt)
      return lastActive >= startDate
    })

    // 文档创建统计
    const recentDocuments = documents.filter(doc => {
      if (!doc.createdAt) return false
      const created = new Date(doc.createdAt)
      return created >= startDate
    })

    const activity = {
      period,
      activeUsers: activeUsers.length,
      totalUsers: users.length,
      documentsCreated: recentDocuments.length,
      userActivity: activeUsers.map(user => ({
        id: user.id,
        username: user.username,
        lastActive: user.lastActiveAt,
        role: user.role
      }))
    }

    res.json({
      success: true,
      data: activity
    })
  } catch (error) {
    console.error('获取用户活动统计错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取翻译统计
router.get('/translation-stats', authenticate, authorize('access_analytics'), async (req, res) => {
  try {
    const { period = '30d' } = req.query
    
    const now = new Date()
    let startDate
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const documents = await jsonDB.find('documents')
    
    // 过滤时间范围内的文档
    const recentDocuments = documents.filter(doc => {
      if (!doc.createdAt) return false
      const created = new Date(doc.createdAt)
      return created >= startDate
    })

    const translationStats = {
      period,
      totalDocuments: recentDocuments.length,
      completedTranslations: recentDocuments.filter(doc => doc.status === 'completed').length,
      inProgressTranslations: recentDocuments.filter(doc => doc.status === 'in_progress').length,
      averageCompletionTime: 0, // 需要根据实际数据计算
      topTranslators: [], // 需要根据实际数据计算
      languagePairs: recentDocuments.reduce((acc, doc) => {
        if (doc.sourceLanguage && doc.targetLanguage) {
          const pair = `${doc.sourceLanguage}-${doc.targetLanguage}`
          acc[pair] = (acc[pair] || 0) + 1
        }
        return acc
      }, {})
    }

    res.json({
      success: true,
      data: translationStats
    })
  } catch (error) {
    console.error('获取翻译统计错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取系统性能指标
router.get('/performance', authenticate, authorize('access_analytics'), async (req, res) => {
  try {
    const performance = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      database: await jsonDB.checkHealth(),
      requests: {
        // 这里可以添加请求统计逻辑
        total: 0,
        errors: 0,
        averageResponseTime: 0
      }
    }

    res.json({
      success: true,
      data: performance
    })
  } catch (error) {
    console.error('获取性能指标错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取使用趋势
router.get('/trends', authenticate, authorize('access_analytics'), async (req, res) => {
  try {
    const { metric = 'documents', period = '30d' } = req.query
    
    const now = new Date()
    let startDate
    let groupBy = 'day'
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        groupBy = 'week'
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
    }

    // 根据指标类型获取数据
    let data = []
    switch (metric) {
      case 'documents':
        data = await jsonDB.find('documents')
        break
      case 'users':
        data = await jsonDB.find('users')
        break
      case 'terminology':
        data = await jsonDB.find('terminology')
        break
      default:
        data = await jsonDB.find('documents')
    }

    // 简单的趋势分析（按天分组）
    const trends = {}
    data.forEach(item => {
      if (item.createdAt) {
        const date = new Date(item.createdAt)
        if (date >= startDate) {
          const key = date.toISOString().split('T')[0] // YYYY-MM-DD
          trends[key] = (trends[key] || 0) + 1
        }
      }
    })

    const trendData = Object.entries(trends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    res.json({
      success: true,
      data: {
        metric,
        period,
        groupBy,
        trends: trendData
      }
    })
  } catch (error) {
    console.error('获取使用趋势错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

module.exports = router
