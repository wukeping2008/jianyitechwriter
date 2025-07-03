const EventEmitter = require('events')
const logger = require('../utils/logger')

class AdvancedEditorService extends EventEmitter {
  constructor() {
    super()
    
    // 编辑会话管理
    this.editingSessions = new Map()
    
    // 版本控制
    this.documentVersions = new Map()
    
    // 术语高亮配置
    this.terminologyConfig = {
      enabled: true,
      highlightColors: {
        'jytek-products': '#1890ff',
        'seesharp-platform': '#52c41a',
        'dotnet-tech': '#faad14',
        'modular-instruments': '#722ed1',
        'data-acquisition': '#eb2f96',
        'signal-processing': '#13c2c2'
      }
    }
    
    // 实时协作配置
    this.collaborationConfig = {
      enabled: true,
      maxConcurrentUsers: 10,
      autoSaveInterval: 30000 // 30秒自动保存
    }
  }

  /**
   * 创建编辑会话
   */
  async createEditingSession(documentId, userId, options = {}) {
    try {
      const sessionId = this.generateSessionId()
      
      const session = {
        id: sessionId,
        documentId: documentId,
        userId: userId,
        createdAt: new Date(),
        lastActivity: new Date(),
        options: {
          enableTerminologyHighlight: options.enableTerminologyHighlight !== false,
          enableRealTimeSync: options.enableRealTimeSync !== false,
          enableVersionControl: options.enableVersionControl !== false,
          language: options.language || 'zh',
          ...options
        },
        content: {
          original: '',
          translated: '',
          currentVersion: 1
        },
        cursor: {
          position: 0,
          selection: null
        },
        collaborators: new Set(),
        changes: [],
        isActive: true
      }
      
      this.editingSessions.set(sessionId, session)
      
      logger.info(`创建编辑会话: ${sessionId}, 文档: ${documentId}, 用户: ${userId}`)
      
      // 触发会话创建事件
      this.emit('sessionCreated', session)
      
      return session
      
    } catch (error) {
      logger.error('创建编辑会话失败:', error)
      throw error
    }
  }

  /**
   * 获取编辑会话
   */
  getEditingSession(sessionId) {
    return this.editingSessions.get(sessionId)
  }

  /**
   * 更新文档内容
   */
  async updateDocumentContent(sessionId, content, type = 'original') {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session) {
        throw new Error('编辑会话不存在')
      }
      
      // 创建版本快照
      const previousContent = session.content[type]
      const change = {
        id: this.generateChangeId(),
        sessionId: sessionId,
        type: 'content_update',
        contentType: type,
        timestamp: new Date(),
        userId: session.userId,
        changes: {
          before: previousContent,
          after: content
        },
        metadata: {
          length: content.length,
          wordCount: this.countWords(content)
        }
      }
      
      // 更新内容
      session.content[type] = content
      session.lastActivity = new Date()
      session.changes.push(change)
      
      // 如果启用版本控制，保存版本
      if (session.options.enableVersionControl) {
        await this.saveVersion(sessionId, type, content)
      }
      
      logger.info(`更新文档内容: ${sessionId}, 类型: ${type}, 长度: ${content.length}`)
      
      // 触发内容更新事件
      this.emit('contentUpdated', {
        sessionId: sessionId,
        type: type,
        content: content,
        change: change
      })
      
      return change
      
    } catch (error) {
      logger.error('更新文档内容失败:', error)
      throw error
    }
  }

  /**
   * 术语高亮处理
   */
  async highlightTerminology(sessionId, text, terminologyData) {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session || !session.options.enableTerminologyHighlight) {
        return { highlightedText: text, terms: [] }
      }
      
      const highlightedTerms = []
      let highlightedText = text
      
      // 遍历术语库
      if (terminologyData && terminologyData.terms) {
        terminologyData.terms.forEach(term => {
          const regex = new RegExp(`\\b${this.escapeRegex(term.sourceText)}\\b`, 'gi')
          const matches = [...text.matchAll(regex)]
          
          matches.forEach(match => {
            const highlightInfo = {
              term: term.sourceText,
              translation: term.targetText,
              category: term.category,
              position: match.index,
              length: match[0].length,
              color: this.terminologyConfig.highlightColors[term.category] || '#1890ff',
              confidence: term.confidence || 1.0
            }
            
            highlightedTerms.push(highlightInfo)
          })
        })
      }
      
      // 按位置排序，避免重叠
      highlightedTerms.sort((a, b) => a.position - b.position)
      
      // 应用高亮标记
      let offset = 0
      highlightedTerms.forEach(termInfo => {
        const startPos = termInfo.position + offset
        const endPos = startPos + termInfo.length
        
        const highlightTag = `<span class="terminology-highlight" data-category="${termInfo.category}" data-translation="${termInfo.translation}" style="background-color: ${termInfo.color}20; border-bottom: 2px solid ${termInfo.color};">`
        const closeTag = '</span>'
        
        highlightedText = highlightedText.slice(0, startPos) + 
                         highlightTag + 
                         highlightedText.slice(startPos, endPos) + 
                         closeTag + 
                         highlightedText.slice(endPos)
        
        offset += highlightTag.length + closeTag.length
      })
      
      logger.info(`术语高亮处理: ${sessionId}, 识别术语: ${highlightedTerms.length}个`)
      
      return {
        highlightedText: highlightedText,
        terms: highlightedTerms,
        statistics: {
          totalTerms: highlightedTerms.length,
          categories: [...new Set(highlightedTerms.map(t => t.category))]
        }
      }
      
    } catch (error) {
      logger.error('术语高亮处理失败:', error)
      throw error
    }
  }

  /**
   * 翻译对比功能
   */
  async compareTranslations(sessionId, originalText, translatedText, options = {}) {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session) {
        throw new Error('编辑会话不存在')
      }
      
      // 分段对比
      const originalSegments = this.segmentText(originalText)
      const translatedSegments = this.segmentText(translatedText)
      
      const comparison = {
        sessionId: sessionId,
        timestamp: new Date(),
        segments: [],
        statistics: {
          totalSegments: Math.max(originalSegments.length, translatedSegments.length),
          matchedSegments: 0,
          modifiedSegments: 0,
          addedSegments: 0,
          deletedSegments: 0
        }
      }
      
      // 逐段对比
      const maxLength = Math.max(originalSegments.length, translatedSegments.length)
      for (let i = 0; i < maxLength; i++) {
        const originalSegment = originalSegments[i] || ''
        const translatedSegment = translatedSegments[i] || ''
        
        let status = 'matched'
        if (!originalSegment && translatedSegment) {
          status = 'added'
          comparison.statistics.addedSegments++
        } else if (originalSegment && !translatedSegment) {
          status = 'deleted'
          comparison.statistics.deletedSegments++
        } else if (originalSegment !== translatedSegment) {
          status = 'modified'
          comparison.statistics.modifiedSegments++
        } else {
          comparison.statistics.matchedSegments++
        }
        
        const segmentComparison = {
          index: i,
          original: originalSegment,
          translated: translatedSegment,
          status: status,
          similarity: this.calculateSimilarity(originalSegment, translatedSegment),
          suggestions: options.includeSuggestions ? await this.generateSuggestions(originalSegment, translatedSegment) : []
        }
        
        comparison.segments.push(segmentComparison)
      }
      
      logger.info(`翻译对比完成: ${sessionId}, 段落: ${comparison.statistics.totalSegments}个`)
      
      // 触发对比完成事件
      this.emit('comparisonCompleted', comparison)
      
      return comparison
      
    } catch (error) {
      logger.error('翻译对比失败:', error)
      throw error
    }
  }

  /**
   * 版本控制
   */
  async saveVersion(sessionId, contentType, content) {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session) {
        throw new Error('编辑会话不存在')
      }
      
      const versionKey = `${sessionId}_${contentType}`
      if (!this.documentVersions.has(versionKey)) {
        this.documentVersions.set(versionKey, [])
      }
      
      const versions = this.documentVersions.get(versionKey)
      const version = {
        version: versions.length + 1,
        content: content,
        timestamp: new Date(),
        userId: session.userId,
        sessionId: sessionId,
        contentType: contentType,
        metadata: {
          length: content.length,
          wordCount: this.countWords(content),
          hash: this.generateContentHash(content)
        }
      }
      
      versions.push(version)
      
      // 限制版本数量（保留最近50个版本）
      if (versions.length > 50) {
        versions.splice(0, versions.length - 50)
      }
      
      // 更新会话中的当前版本号
      session.content.currentVersion = version.version
      
      logger.info(`保存版本: ${sessionId}, 版本: ${version.version}, 类型: ${contentType}`)
      
      // 触发版本保存事件
      this.emit('versionSaved', version)
      
      return version
      
    } catch (error) {
      logger.error('保存版本失败:', error)
      throw error
    }
  }

  /**
   * 获取版本历史
   */
  getVersionHistory(sessionId, contentType) {
    const versionKey = `${sessionId}_${contentType}`
    return this.documentVersions.get(versionKey) || []
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(sessionId, contentType, versionNumber) {
    try {
      const versions = this.getVersionHistory(sessionId, contentType)
      const targetVersion = versions.find(v => v.version === versionNumber)
      
      if (!targetVersion) {
        throw new Error(`版本 ${versionNumber} 不存在`)
      }
      
      // 更新当前内容
      await this.updateDocumentContent(sessionId, targetVersion.content, contentType)
      
      logger.info(`恢复版本: ${sessionId}, 版本: ${versionNumber}, 类型: ${contentType}`)
      
      // 触发版本恢复事件
      this.emit('versionRestored', {
        sessionId: sessionId,
        contentType: contentType,
        version: targetVersion
      })
      
      return targetVersion
      
    } catch (error) {
      logger.error('恢复版本失败:', error)
      throw error
    }
  }

  /**
   * 实时协作功能
   */
  async addCollaborator(sessionId, userId) {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session) {
        throw new Error('编辑会话不存在')
      }
      
      if (session.collaborators.size >= this.collaborationConfig.maxConcurrentUsers) {
        throw new Error('协作用户数量已达上限')
      }
      
      session.collaborators.add(userId)
      
      logger.info(`添加协作者: ${sessionId}, 用户: ${userId}`)
      
      // 触发协作者加入事件
      this.emit('collaboratorJoined', {
        sessionId: sessionId,
        userId: userId,
        collaborators: Array.from(session.collaborators)
      })
      
      return Array.from(session.collaborators)
      
    } catch (error) {
      logger.error('添加协作者失败:', error)
      throw error
    }
  }

  /**
   * 移除协作者
   */
  async removeCollaborator(sessionId, userId) {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session) {
        throw new Error('编辑会话不存在')
      }
      
      session.collaborators.delete(userId)
      
      logger.info(`移除协作者: ${sessionId}, 用户: ${userId}`)
      
      // 触发协作者离开事件
      this.emit('collaboratorLeft', {
        sessionId: sessionId,
        userId: userId,
        collaborators: Array.from(session.collaborators)
      })
      
      return Array.from(session.collaborators)
      
    } catch (error) {
      logger.error('移除协作者失败:', error)
      throw error
    }
  }

  /**
   * 关闭编辑会话
   */
  async closeEditingSession(sessionId) {
    try {
      const session = this.editingSessions.get(sessionId)
      if (!session) {
        return false
      }
      
      session.isActive = false
      session.closedAt = new Date()
      
      // 清理协作者
      session.collaborators.clear()
      
      // 从活跃会话中移除
      this.editingSessions.delete(sessionId)
      
      logger.info(`关闭编辑会话: ${sessionId}`)
      
      // 触发会话关闭事件
      this.emit('sessionClosed', session)
      
      return true
      
    } catch (error) {
      logger.error('关闭编辑会话失败:', error)
      throw error
    }
  }

  /**
   * 获取活跃会话统计
   */
  getActiveSessionsStats() {
    const activeSessions = Array.from(this.editingSessions.values())
    
    return {
      totalSessions: activeSessions.length,
      totalCollaborators: activeSessions.reduce((sum, session) => sum + session.collaborators.size, 0),
      sessionsByLanguage: this.groupBy(activeSessions, 'options.language'),
      averageSessionDuration: this.calculateAverageSessionDuration(activeSessions),
      lastActivity: activeSessions.length > 0 ? Math.max(...activeSessions.map(s => s.lastActivity.getTime())) : null
    }
  }

  // 辅助方法
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateChangeId() {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateContentHash(content) {
    // 简单的内容哈希
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  segmentText(text) {
    // 按句子分段
    return text.split(/[。！？.!?]+/).filter(segment => segment.trim().length > 0)
  }

  calculateSimilarity(text1, text2) {
    // 简单的相似度计算（Levenshtein距离）
    const len1 = text1.length
    const len2 = text2.length
    
    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0
    
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0))
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i
    for (let j = 0; j <= len2; j++) matrix[0][j] = j
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = text1[i - 1] === text2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }
    
    const maxLen = Math.max(len1, len2)
    return (maxLen - matrix[len1][len2]) / maxLen
  }

  async generateSuggestions(original, translated) {
    // 这里可以集成AI服务生成改进建议
    // 暂时返回空数组
    return []
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = key.split('.').reduce((obj, k) => obj && obj[k], item)
      groups[value] = groups[value] || []
      groups[value].push(item)
      return groups
    }, {})
  }

  calculateAverageSessionDuration(sessions) {
    if (sessions.length === 0) return 0
    
    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.lastActivity.getTime() - session.createdAt.getTime())
    }, 0)
    
    return totalDuration / sessions.length
  }
}

// 创建单例实例
const advancedEditorService = new AdvancedEditorService()

module.exports = advancedEditorService
