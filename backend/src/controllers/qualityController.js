const QualityControlService = require('../services/QualityControlService')
const logger = require('../utils/logger')

class QualityController {
  /**
   * 执行质量检查
   */
  static async performQualityCheck(req, res) {
    try {
      const { documentId, originalText, translatedText, options = {} } = req.body

      if (!documentId || !originalText || !translatedText) {
        return res.status(400).json({
          success: false,
          message: '文档ID、原文和译文不能为空'
        })
      }

      // 添加用户信息到选项中
      options.userId = req.user.id

      const qualityReport = await QualityControlService.performQualityCheck(
        documentId,
        originalText,
        translatedText,
        options
      )

      logger.info(`用户 ${req.user.id} 执行质量检查: ${qualityReport.id}`)

      res.json({
        success: true,
        message: '质量检查完成',
        data: {
          checkId: qualityReport.id,
          documentId: qualityReport.documentId,
          score: qualityReport.score,
          status: qualityReport.status,
          timestamp: qualityReport.timestamp,
          summary: {
            totalIssues: qualityReport.issues.length,
            criticalIssues: qualityReport.issues.filter(i => i.severity === 'critical').length,
            highIssues: qualityReport.issues.filter(i => i.severity === 'high').length,
            mediumIssues: qualityReport.issues.filter(i => i.severity === 'medium').length,
            lowIssues: qualityReport.issues.filter(i => i.severity === 'low').length
          }
        }
      })

    } catch (error) {
      logger.error('执行质量检查失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '质量检查失败'
      })
    }
  }

  /**
   * 获取质量检查报告
   */
  static async getQualityReport(req, res) {
    try {
      const { checkId } = req.params
      const { includeDetails = 'true' } = req.query

      const qualityReport = QualityControlService.getQualityReport(checkId)
      if (!qualityReport) {
        return res.status(404).json({
          success: false,
          message: '质量检查报告不存在'
        })
      }

      // 构建响应数据
      const responseData = {
        id: qualityReport.id,
        documentId: qualityReport.documentId,
        timestamp: qualityReport.timestamp,
        score: qualityReport.score,
        status: qualityReport.status,
        summary: {
          totalIssues: qualityReport.issues.length,
          criticalIssues: qualityReport.issues.filter(i => i.severity === 'critical').length,
          highIssues: qualityReport.issues.filter(i => i.severity === 'high').length,
          mediumIssues: qualityReport.issues.filter(i => i.severity === 'medium').length,
          lowIssues: qualityReport.issues.filter(i => i.severity === 'low').length
        },
        checks: {}
      }

      // 添加检查结果摘要
      for (const [checkName, checkResult] of Object.entries(qualityReport.checks)) {
        responseData.checks[checkName] = {
          name: checkResult.name,
          score: checkResult.score,
          issueCount: checkResult.issues.length
        }
      }

      // 如果需要详细信息
      if (includeDetails === 'true') {
        responseData.issues = qualityReport.issues
        responseData.recommendations = qualityReport.recommendations
        responseData.checkDetails = qualityReport.checks
      }

      res.json({
        success: true,
        data: responseData
      })

    } catch (error) {
      logger.error('获取质量检查报告失败:', error)
      res.status(500).json({
        success: false,
        message: '获取质量检查报告失败'
      })
    }
  }

  /**
   * 获取质量检查统计信息
   */
  static async getQualityStats(req, res) {
    try {
      const stats = QualityControlService.getStats()

      // 计算通过率
      const passRate = stats.totalChecks > 0 
        ? Math.round((stats.passedChecks / stats.totalChecks) * 100)
        : 0

      // 获取最常见的问题（前10个）
      const commonIssues = Object.entries(stats.commonIssues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count }))

      res.json({
        success: true,
        data: {
          totalChecks: stats.totalChecks,
          passedChecks: stats.passedChecks,
          failedChecks: stats.failedChecks,
          passRate: passRate,
          averageScore: stats.averageScore,
          commonIssues: commonIssues
        }
      })

    } catch (error) {
      logger.error('获取质量统计信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取质量统计信息失败'
      })
    }
  }

  /**
   * 获取质量检查规则配置
   */
  static async getQualityRules(req, res) {
    try {
      const rules = QualityControlService.qualityRules
      const weights = QualityControlService.scoreWeights

      res.json({
        success: true,
        data: {
          rules: rules,
          weights: weights,
          description: {
            terminology: '术语准确性检查 - 验证专业术语的正确翻译',
            consistency: '一致性检查 - 确保翻译风格和术语使用的一致性',
            format: '格式规范检查 - 验证标点符号、数字格式等规范性',
            completeness: '完整性检查 - 确保翻译内容的完整性',
            accuracy: '准确性检查 - 评估翻译的准确性和可信度'
          }
        }
      })

    } catch (error) {
      logger.error('获取质量检查规则失败:', error)
      res.status(500).json({
        success: false,
        message: '获取质量检查规则失败'
      })
    }
  }

  /**
   * 更新质量检查规则配置
   */
  static async updateQualityRules(req, res) {
    try {
      const { rules, weights } = req.body

      // 验证规则配置
      if (rules) {
        // 这里可以添加规则验证逻辑
        Object.assign(QualityControlService.qualityRules, rules)
      }

      // 验证权重配置
      if (weights) {
        // 验证权重总和是否为1
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
        if (Math.abs(totalWeight - 1.0) > 0.01) {
          return res.status(400).json({
            success: false,
            message: '权重总和必须等于1.0'
          })
        }
        Object.assign(QualityControlService.scoreWeights, weights)
      }

      logger.info(`用户 ${req.user.id} 更新质量检查规则配置`)

      res.json({
        success: true,
        message: '质量检查规则配置更新成功',
        data: {
          rules: QualityControlService.qualityRules,
          weights: QualityControlService.scoreWeights
        }
      })

    } catch (error) {
      logger.error('更新质量检查规则失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '更新质量检查规则失败'
      })
    }
  }

  /**
   * 批量质量检查
   */
  static async batchQualityCheck(req, res) {
    try {
      const { documents, options = {} } = req.body

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({
          success: false,
          message: '文档列表不能为空'
        })
      }

      if (documents.length > 20) {
        return res.status(400).json({
          success: false,
          message: '批量检查文档数量不能超过20个'
        })
      }

      const batchId = `batch_qc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const results = []

      // 添加用户信息到选项中
      options.userId = req.user.id

      for (const doc of documents) {
        try {
          const qualityReport = await QualityControlService.performQualityCheck(
            doc.documentId,
            doc.originalText,
            doc.translatedText,
            { ...options, batchId }
          )

          results.push({
            documentId: doc.documentId,
            checkId: qualityReport.id,
            score: qualityReport.score,
            status: qualityReport.status,
            issueCount: qualityReport.issues.length
          })

        } catch (error) {
          results.push({
            documentId: doc.documentId,
            error: error.message,
            status: 'error'
          })
        }
      }

      // 计算批量检查统计
      const successfulChecks = results.filter(r => r.status !== 'error')
      const averageScore = successfulChecks.length > 0
        ? Math.round(successfulChecks.reduce((sum, r) => sum + r.score, 0) / successfulChecks.length)
        : 0

      logger.info(`用户 ${req.user.id} 执行批量质量检查: ${batchId}, 文档数: ${documents.length}`)

      res.json({
        success: true,
        message: '批量质量检查完成',
        data: {
          batchId: batchId,
          totalDocuments: documents.length,
          successfulChecks: successfulChecks.length,
          failedChecks: documents.length - successfulChecks.length,
          averageScore: averageScore,
          results: results
        }
      })

    } catch (error) {
      logger.error('批量质量检查失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '批量质量检查失败'
      })
    }
  }

  /**
   * 获取质量改进建议
   */
  static async getQualityRecommendations(req, res) {
    try {
      const { checkId } = req.params

      const qualityReport = QualityControlService.getQualityReport(checkId)
      if (!qualityReport) {
        return res.status(404).json({
          success: false,
          message: '质量检查报告不存在'
        })
      }

      // 按优先级排序建议
      const sortedRecommendations = qualityReport.recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

      // 生成详细的改进计划
      const improvementPlan = {
        immediate: sortedRecommendations.filter(r => r.priority === 'high'),
        shortTerm: sortedRecommendations.filter(r => r.priority === 'medium'),
        longTerm: sortedRecommendations.filter(r => r.priority === 'low')
      }

      res.json({
        success: true,
        data: {
          checkId: checkId,
          overallScore: qualityReport.score,
          recommendations: sortedRecommendations,
          improvementPlan: improvementPlan,
          estimatedImpact: {
            immediate: '预计提升10-20分',
            shortTerm: '预计提升5-10分',
            longTerm: '预计提升3-5分'
          }
        }
      })

    } catch (error) {
      logger.error('获取质量改进建议失败:', error)
      res.status(500).json({
        success: false,
        message: '获取质量改进建议失败'
      })
    }
  }

  /**
   * 导出质量检查报告
   */
  static async exportQualityReport(req, res) {
    try {
      const { checkId } = req.params
      const { format = 'json' } = req.query

      const qualityReport = QualityControlService.getQualityReport(checkId)
      if (!qualityReport) {
        return res.status(404).json({
          success: false,
          message: '质量检查报告不存在'
        })
      }

      // 准备导出数据
      const exportData = {
        reportInfo: {
          checkId: qualityReport.id,
          documentId: qualityReport.documentId,
          timestamp: qualityReport.timestamp,
          score: qualityReport.score,
          status: qualityReport.status
        },
        checks: qualityReport.checks,
        issues: qualityReport.issues,
        recommendations: qualityReport.recommendations,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.id
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="quality_report_${checkId}.json"`)
        res.json(exportData)
      } else {
        // 其他格式可以在这里扩展
        res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        })
      }

    } catch (error) {
      logger.error('导出质量检查报告失败:', error)
      res.status(500).json({
        success: false,
        message: '导出质量检查报告失败'
      })
    }
  }

  /**
   * WebSocket连接处理（用于实时质量检查）
   */
  static setupWebSocket(io) {
    // 监听质量控制服务的事件
    QualityControlService.on('checkStarted', (qualityReport) => {
      io.emit('qualityCheckStarted', {
        checkId: qualityReport.id,
        documentId: qualityReport.documentId,
        timestamp: qualityReport.timestamp
      })
    })

    QualityControlService.on('checkCompleted', (qualityReport) => {
      io.emit('qualityCheckCompleted', {
        checkId: qualityReport.id,
        documentId: qualityReport.documentId,
        score: qualityReport.score,
        status: qualityReport.status,
        issueCount: qualityReport.issues.length,
        timestamp: qualityReport.timestamp
      })
    })

    // WebSocket连接处理
    io.on('connection', (socket) => {
      // 加入质量检查房间
      socket.on('joinQualityCheck', (checkId) => {
        socket.join(`quality_${checkId}`)
        logger.info(`用户加入质量检查房间: ${checkId}`)
      })

      // 离开质量检查房间
      socket.on('leaveQualityCheck', (checkId) => {
        socket.leave(`quality_${checkId}`)
        logger.info(`用户离开质量检查房间: ${checkId}`)
      })
    })
  }
}

module.exports = QualityController
