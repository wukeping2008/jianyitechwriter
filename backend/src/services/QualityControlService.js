const EventEmitter = require('events')
const logger = require('../utils/logger')

class QualityControlService extends EventEmitter {
  constructor() {
    super()
    
    // 质量检查规则配置
    this.qualityRules = {
      terminology: {
        enabled: true,
        strictMode: true,
        categories: ['jytek-products', 'seesharp-platform', 'dotnet-tech', 'modular-instruments']
      },
      consistency: {
        enabled: true,
        checkTranslationConsistency: true,
        checkTerminologyConsistency: true,
        checkFormatConsistency: true
      },
      format: {
        enabled: true,
        checkPunctuation: true,
        checkNumberFormat: true,
        checkCapitalization: true,
        checkSpacing: true
      },
      completeness: {
        enabled: true,
        checkMissingTranslations: true,
        checkEmptySegments: true,
        checkUntranslatedTerms: true
      },
      accuracy: {
        enabled: true,
        aiConfidenceThreshold: 0.8,
        humanReviewRequired: false,
        flagSuspiciousTranslations: true
      }
    }
    
    // 质量评分权重
    this.scoreWeights = {
      terminology: 0.25,      // 术语准确性 25%
      consistency: 0.20,      // 一致性 20%
      format: 0.15,          // 格式规范 15%
      completeness: 0.20,     // 完整性 20%
      accuracy: 0.20         // 准确性 20%
    }
    
    // 质量检查历史
    this.qualityReports = new Map()
    
    // 统计信息
    this.stats = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      averageScore: 0,
      commonIssues: new Map()
    }
  }

  /**
   * 执行质量检查
   */
  async performQualityCheck(documentId, originalText, translatedText, options = {}) {
    try {
      const checkId = this.generateCheckId()
      
      logger.info(`开始质量检查: ${checkId}, 文档: ${documentId}`)
      
      const qualityReport = {
        id: checkId,
        documentId: documentId,
        timestamp: new Date(),
        originalText: originalText,
        translatedText: translatedText,
        options: options,
        checks: {},
        issues: [],
        score: 0,
        status: 'processing',
        recommendations: []
      }
      
      this.qualityReports.set(checkId, qualityReport)
      
      // 触发检查开始事件
      this.emit('checkStarted', qualityReport)
      
      // 执行各项检查
      if (this.qualityRules.terminology.enabled) {
        qualityReport.checks.terminology = await this.checkTerminology(originalText, translatedText, options.terminologyData)
      }
      
      if (this.qualityRules.consistency.enabled) {
        qualityReport.checks.consistency = await this.checkConsistency(originalText, translatedText, options.previousTranslations)
      }
      
      if (this.qualityRules.format.enabled) {
        qualityReport.checks.format = await this.checkFormat(originalText, translatedText)
      }
      
      if (this.qualityRules.completeness.enabled) {
        qualityReport.checks.completeness = await this.checkCompleteness(originalText, translatedText)
      }
      
      if (this.qualityRules.accuracy.enabled) {
        qualityReport.checks.accuracy = await this.checkAccuracy(originalText, translatedText, options.aiConfidence)
      }
      
      // 计算总体质量分数
      qualityReport.score = this.calculateOverallScore(qualityReport.checks)
      
      // 生成改进建议
      qualityReport.recommendations = this.generateRecommendations(qualityReport.checks)
      
      // 收集所有问题
      qualityReport.issues = this.collectAllIssues(qualityReport.checks)
      
      // 确定检查状态
      qualityReport.status = qualityReport.score >= 80 ? 'passed' : 'failed'
      
      // 更新统计信息
      this.updateStats(qualityReport)
      
      logger.info(`质量检查完成: ${checkId}, 分数: ${qualityReport.score}, 状态: ${qualityReport.status}`)
      
      // 触发检查完成事件
      this.emit('checkCompleted', qualityReport)
      
      return qualityReport
      
    } catch (error) {
      logger.error('质量检查失败:', error)
      throw error
    }
  }

  /**
   * 术语检查
   */
  async checkTerminology(originalText, translatedText, terminologyData) {
    const check = {
      name: 'terminology',
      score: 100,
      issues: [],
      details: {
        totalTerms: 0,
        correctTerms: 0,
        incorrectTerms: 0,
        missingTerms: 0
      }
    }
    
    if (!terminologyData || !terminologyData.terms) {
      return check
    }
    
    try {
      const terms = terminologyData.terms
      check.details.totalTerms = terms.length
      
      for (const term of terms) {
        const sourceRegex = new RegExp(`\\b${this.escapeRegex(term.sourceText)}\\b`, 'gi')
        const sourceMatches = originalText.match(sourceRegex) || []
        
        if (sourceMatches.length > 0) {
          // 检查译文中是否有对应的正确翻译
          const targetRegex = new RegExp(`\\b${this.escapeRegex(term.targetText)}\\b`, 'gi')
          const targetMatches = translatedText.match(targetRegex) || []
          
          if (targetMatches.length === sourceMatches.length) {
            check.details.correctTerms++
          } else if (targetMatches.length === 0) {
            check.details.missingTerms++
            check.issues.push({
              type: 'missing_term_translation',
              severity: 'high',
              message: `术语"${term.sourceText}"未翻译为"${term.targetText}"`,
              sourceText: term.sourceText,
              expectedTranslation: term.targetText,
              category: term.category
            })
          } else {
            check.details.incorrectTerms++
            check.issues.push({
              type: 'inconsistent_term_translation',
              severity: 'medium',
              message: `术语"${term.sourceText}"翻译不一致`,
              sourceText: term.sourceText,
              expectedTranslation: term.targetText,
              actualCount: targetMatches.length,
              expectedCount: sourceMatches.length
            })
          }
        }
      }
      
      // 计算术语检查分数
      const totalTermsFound = check.details.correctTerms + check.details.incorrectTerms + check.details.missingTerms
      if (totalTermsFound > 0) {
        check.score = Math.round((check.details.correctTerms / totalTermsFound) * 100)
      }
      
    } catch (error) {
      logger.error('术语检查失败:', error)
      check.score = 0
      check.issues.push({
        type: 'check_error',
        severity: 'high',
        message: '术语检查过程中发生错误'
      })
    }
    
    return check
  }

  /**
   * 一致性检查
   */
  async checkConsistency(originalText, translatedText, previousTranslations = []) {
    const check = {
      name: 'consistency',
      score: 100,
      issues: [],
      details: {
        translationConsistency: 100,
        terminologyConsistency: 100,
        formatConsistency: 100
      }
    }
    
    try {
      // 检查翻译一致性
      if (previousTranslations.length > 0) {
        const inconsistencies = this.findTranslationInconsistencies(originalText, translatedText, previousTranslations)
        if (inconsistencies.length > 0) {
          check.details.translationConsistency = Math.max(0, 100 - inconsistencies.length * 10)
          check.issues.push(...inconsistencies)
        }
      }
      
      // 检查术语一致性
      const terminologyInconsistencies = this.findTerminologyInconsistencies(translatedText)
      if (terminologyInconsistencies.length > 0) {
        check.details.terminologyConsistency = Math.max(0, 100 - terminologyInconsistencies.length * 15)
        check.issues.push(...terminologyInconsistencies)
      }
      
      // 检查格式一致性
      const formatInconsistencies = this.findFormatInconsistencies(originalText, translatedText)
      if (formatInconsistencies.length > 0) {
        check.details.formatConsistency = Math.max(0, 100 - formatInconsistencies.length * 5)
        check.issues.push(...formatInconsistencies)
      }
      
      // 计算总体一致性分数
      check.score = Math.round(
        (check.details.translationConsistency + 
         check.details.terminologyConsistency + 
         check.details.formatConsistency) / 3
      )
      
    } catch (error) {
      logger.error('一致性检查失败:', error)
      check.score = 0
      check.issues.push({
        type: 'check_error',
        severity: 'high',
        message: '一致性检查过程中发生错误'
      })
    }
    
    return check
  }

  /**
   * 格式检查
   */
  async checkFormat(originalText, translatedText) {
    const check = {
      name: 'format',
      score: 100,
      issues: [],
      details: {
        punctuation: 100,
        numberFormat: 100,
        capitalization: 100,
        spacing: 100
      }
    }
    
    try {
      // 检查标点符号
      const punctuationIssues = this.checkPunctuation(originalText, translatedText)
      if (punctuationIssues.length > 0) {
        check.details.punctuation = Math.max(0, 100 - punctuationIssues.length * 10)
        check.issues.push(...punctuationIssues)
      }
      
      // 检查数字格式
      const numberFormatIssues = this.checkNumberFormat(originalText, translatedText)
      if (numberFormatIssues.length > 0) {
        check.details.numberFormat = Math.max(0, 100 - numberFormatIssues.length * 15)
        check.issues.push(...numberFormatIssues)
      }
      
      // 检查大小写
      const capitalizationIssues = this.checkCapitalization(translatedText)
      if (capitalizationIssues.length > 0) {
        check.details.capitalization = Math.max(0, 100 - capitalizationIssues.length * 5)
        check.issues.push(...capitalizationIssues)
      }
      
      // 检查空格
      const spacingIssues = this.checkSpacing(translatedText)
      if (spacingIssues.length > 0) {
        check.details.spacing = Math.max(0, 100 - spacingIssues.length * 5)
        check.issues.push(...spacingIssues)
      }
      
      // 计算总体格式分数
      check.score = Math.round(
        (check.details.punctuation + 
         check.details.numberFormat + 
         check.details.capitalization + 
         check.details.spacing) / 4
      )
      
    } catch (error) {
      logger.error('格式检查失败:', error)
      check.score = 0
      check.issues.push({
        type: 'check_error',
        severity: 'high',
        message: '格式检查过程中发生错误'
      })
    }
    
    return check
  }

  /**
   * 完整性检查
   */
  async checkCompleteness(originalText, translatedText) {
    const check = {
      name: 'completeness',
      score: 100,
      issues: [],
      details: {
        missingTranslations: 0,
        emptySegments: 0,
        untranslatedTerms: 0,
        completenessRatio: 1.0
      }
    }
    
    try {
      // 检查是否有缺失的翻译
      if (!translatedText || translatedText.trim().length === 0) {
        check.details.missingTranslations = 1
        check.issues.push({
          type: 'missing_translation',
          severity: 'critical',
          message: '缺少翻译内容'
        })
      }
      
      // 检查空段落
      const originalSegments = this.segmentText(originalText)
      const translatedSegments = this.segmentText(translatedText)
      
      for (let i = 0; i < originalSegments.length; i++) {
        if (originalSegments[i].trim() && (!translatedSegments[i] || !translatedSegments[i].trim())) {
          check.details.emptySegments++
          check.issues.push({
            type: 'empty_segment',
            severity: 'high',
            message: `第${i + 1}段缺少翻译`,
            segmentIndex: i,
            originalText: originalSegments[i]
          })
        }
      }
      
      // 检查未翻译的术语（英文术语在中文译文中）
      const untranslatedTerms = this.findUntranslatedTerms(translatedText)
      check.details.untranslatedTerms = untranslatedTerms.length
      if (untranslatedTerms.length > 0) {
        check.issues.push(...untranslatedTerms.map(term => ({
          type: 'untranslated_term',
          severity: 'medium',
          message: `可能存在未翻译的术语: ${term}`,
          term: term
        })))
      }
      
      // 计算完整性比例
      const totalIssues = check.details.missingTranslations + check.details.emptySegments + check.details.untranslatedTerms
      check.details.completenessRatio = Math.max(0, 1 - (totalIssues * 0.1))
      
      // 计算完整性分数
      check.score = Math.round(check.details.completenessRatio * 100)
      
    } catch (error) {
      logger.error('完整性检查失败:', error)
      check.score = 0
      check.issues.push({
        type: 'check_error',
        severity: 'high',
        message: '完整性检查过程中发生错误'
      })
    }
    
    return check
  }

  /**
   * 准确性检查
   */
  async checkAccuracy(originalText, translatedText, aiConfidence = 0.9) {
    const check = {
      name: 'accuracy',
      score: 100,
      issues: [],
      details: {
        aiConfidence: aiConfidence,
        suspiciousTranslations: 0,
        lengthRatio: 1.0,
        semanticConsistency: 100
      }
    }
    
    try {
      // 检查AI置信度
      if (aiConfidence < this.qualityRules.accuracy.aiConfidenceThreshold) {
        check.issues.push({
          type: 'low_ai_confidence',
          severity: 'medium',
          message: `AI翻译置信度较低: ${Math.round(aiConfidence * 100)}%`,
          confidence: aiConfidence
        })
      }
      
      // 检查长度比例（译文长度与原文长度的比例）
      const lengthRatio = translatedText.length / originalText.length
      check.details.lengthRatio = lengthRatio
      
      if (lengthRatio < 0.5 || lengthRatio > 2.0) {
        check.issues.push({
          type: 'unusual_length_ratio',
          severity: 'medium',
          message: `译文长度异常，比例: ${lengthRatio.toFixed(2)}`,
          lengthRatio: lengthRatio
        })
      }
      
      // 检查可疑翻译（简单的启发式规则）
      const suspiciousPatterns = this.findSuspiciousPatterns(originalText, translatedText)
      check.details.suspiciousTranslations = suspiciousPatterns.length
      if (suspiciousPatterns.length > 0) {
        check.issues.push(...suspiciousPatterns)
      }
      
      // 计算准确性分数
      let accuracyScore = Math.round(aiConfidence * 100)
      
      // 根据问题调整分数
      if (lengthRatio < 0.5 || lengthRatio > 2.0) {
        accuracyScore -= 20
      }
      accuracyScore -= suspiciousPatterns.length * 10
      
      check.score = Math.max(0, accuracyScore)
      
    } catch (error) {
      logger.error('准确性检查失败:', error)
      check.score = 0
      check.issues.push({
        type: 'check_error',
        severity: 'high',
        message: '准确性检查过程中发生错误'
      })
    }
    
    return check
  }

  /**
   * 计算总体质量分数
   */
  calculateOverallScore(checks) {
    let totalScore = 0
    let totalWeight = 0
    
    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (this.scoreWeights[checkName]) {
        totalScore += checkResult.score * this.scoreWeights[checkName]
        totalWeight += this.scoreWeights[checkName]
      }
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(checks) {
    const recommendations = []
    
    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult.score < 80) {
        switch (checkName) {
          case 'terminology':
            recommendations.push({
              type: 'terminology',
              priority: 'high',
              message: '建议检查术语翻译的准确性和一致性',
              actions: ['使用术语库', '统一术语翻译', '人工审核术语']
            })
            break
          case 'consistency':
            recommendations.push({
              type: 'consistency',
              priority: 'medium',
              message: '建议提高翻译的一致性',
              actions: ['参考历史翻译', '建立翻译记忆库', '制定翻译规范']
            })
            break
          case 'format':
            recommendations.push({
              type: 'format',
              priority: 'low',
              message: '建议规范翻译格式',
              actions: ['检查标点符号', '统一数字格式', '规范大小写']
            })
            break
          case 'completeness':
            recommendations.push({
              type: 'completeness',
              priority: 'high',
              message: '建议完善翻译内容',
              actions: ['补充缺失翻译', '检查空段落', '翻译专业术语']
            })
            break
          case 'accuracy':
            recommendations.push({
              type: 'accuracy',
              priority: 'high',
              message: '建议提高翻译准确性',
              actions: ['人工审核', '使用专业词典', '咨询领域专家']
            })
            break
        }
      }
    }
    
    return recommendations
  }

  /**
   * 收集所有问题
   */
  collectAllIssues(checks) {
    const allIssues = []
    
    for (const checkResult of Object.values(checks)) {
      allIssues.push(...checkResult.issues)
    }
    
    // 按严重程度排序
    return allIssues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  /**
   * 更新统计信息
   */
  updateStats(qualityReport) {
    this.stats.totalChecks++
    
    if (qualityReport.status === 'passed') {
      this.stats.passedChecks++
    } else {
      this.stats.failedChecks++
    }
    
    // 更新平均分数
    this.stats.averageScore = Math.round(
      ((this.stats.averageScore * (this.stats.totalChecks - 1)) + qualityReport.score) / this.stats.totalChecks
    )
    
    // 统计常见问题
    for (const issue of qualityReport.issues) {
      const count = this.stats.commonIssues.get(issue.type) || 0
      this.stats.commonIssues.set(issue.type, count + 1)
    }
  }

  /**
   * 获取质量检查报告
   */
  getQualityReport(checkId) {
    return this.qualityReports.get(checkId)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      commonIssues: Object.fromEntries(this.stats.commonIssues)
    }
  }

  // 辅助方法
  generateCheckId() {
    return `qc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  segmentText(text) {
    return text.split(/[。！？.!?]+/).filter(segment => segment.trim().length > 0)
  }

  findTranslationInconsistencies(originalText, translatedText, previousTranslations) {
    // 简化实现：检查是否与历史翻译一致
    const inconsistencies = []
    // 这里可以实现更复杂的一致性检查逻辑
    return inconsistencies
  }

  findTerminologyInconsistencies(translatedText) {
    // 检查术语翻译的一致性
    const inconsistencies = []
    // 这里可以实现术语一致性检查逻辑
    return inconsistencies
  }

  findFormatInconsistencies(originalText, translatedText) {
    // 检查格式一致性
    const inconsistencies = []
    // 这里可以实现格式一致性检查逻辑
    return inconsistencies
  }

  checkPunctuation(originalText, translatedText) {
    const issues = []
    
    // 检查句号
    const originalPeriods = (originalText.match(/\./g) || []).length
    const translatedPeriods = (translatedText.match(/[。.]/g) || []).length
    
    if (Math.abs(originalPeriods - translatedPeriods) > 1) {
      issues.push({
        type: 'punctuation_mismatch',
        severity: 'low',
        message: '句号数量不匹配',
        expected: originalPeriods,
        actual: translatedPeriods
      })
    }
    
    return issues
  }

  checkNumberFormat(originalText, translatedText) {
    const issues = []
    
    // 提取数字
    const originalNumbers = originalText.match(/\d+/g) || []
    const translatedNumbers = translatedText.match(/\d+/g) || []
    
    if (originalNumbers.length !== translatedNumbers.length) {
      issues.push({
        type: 'number_count_mismatch',
        severity: 'medium',
        message: '数字数量不匹配',
        originalNumbers: originalNumbers,
        translatedNumbers: translatedNumbers
      })
    }
    
    return issues
  }

  checkCapitalization(translatedText) {
    const issues = []
    
    // 检查句首大写
    const sentences = translatedText.split(/[。！？.!?]+/)
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (sentence && /^[a-z]/.test(sentence)) {
        issues.push({
          type: 'capitalization_error',
          severity: 'low',
          message: `第${i + 1}句句首应该大写`,
          sentence: sentence
        })
      }
    }
    
    return issues
  }

  checkSpacing(translatedText) {
    const issues = []
    
    // 检查多余空格
    if (/\s{2,}/.test(translatedText)) {
      issues.push({
        type: 'extra_spaces',
        severity: 'low',
        message: '存在多余的空格'
      })
    }
    
    // 检查中英文之间的空格
    if (/[\u4e00-\u9fa5][a-zA-Z]|[a-zA-Z][\u4e00-\u9fa5]/.test(translatedText)) {
      issues.push({
        type: 'missing_spaces',
        severity: 'low',
        message: '中英文之间建议添加空格'
      })
    }
    
    return issues
  }

  findUntranslatedTerms(translatedText) {
    // 查找可能未翻译的英文术语
    const englishTerms = translatedText.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []
    return englishTerms.filter(term => 
      !['SeeSharp', 'JYTEK', 'PXI', 'API', 'SDK', 'USB', 'TCP', 'IP'].includes(term)
    )
  }

  findSuspiciousPatterns(originalText, translatedText) {
    const suspicious = []
    
    // 检查是否有重复的句子
    const sentences = this.segmentText(translatedText)
    const uniqueSentences = new Set(sentences)
    if (sentences.length !== uniqueSentences.size) {
      suspicious.push({
        type: 'repeated_sentences',
        severity: 'medium',
        message: '译文中存在重复的句子'
      })
    }
    
    // 检查是否有明显的机器翻译痕迹
    if (translatedText.includes('的的') || translatedText.includes('了了')) {
      suspicious.push({
        type: 'machine_translation_artifacts',
        severity: 'medium',
        message: '可能存在机器翻译痕迹'
      })
    }
    
    return suspicious
  }
}

// 创建单例实例
const qualityControlService = new QualityControlService()

module.exports = qualityControlService
