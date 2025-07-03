const AdvancedEditorService = require('../services/AdvancedEditorService')
const logger = require('../utils/logger')

class EditorController {
  /**
   * 创建编辑会话
   */
  static async createSession(req, res) {
    try {
      const { documentId, options = {} } = req.body
      const userId = req.user.id

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: '文档ID不能为空'
        })
      }

      const session = await AdvancedEditorService.createEditingSession(
        documentId,
        userId,
        options
      )

      logger.info(`用户 ${userId} 创建编辑会话: ${session.id}`)

      res.json({
        success: true,
        message: '编辑会话创建成功',
        data: {
          sessionId: session.id,
          documentId: session.documentId,
          options: session.options,
          createdAt: session.createdAt
        }
      })

    } catch (error) {
      logger.error('创建编辑会话失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '创建编辑会话失败'
      })
    }
  }

  /**
   * 获取编辑会话信息
   */
  static async getSession(req, res) {
    try {
      const { sessionId } = req.params

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查用户权限
      if (session.userId !== req.user.id && !session.collaborators.has(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: '无权访问此编辑会话'
        })
      }

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          documentId: session.documentId,
          userId: session.userId,
          options: session.options,
          content: session.content,
          collaborators: Array.from(session.collaborators),
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          isActive: session.isActive
        }
      })

    } catch (error) {
      logger.error('获取编辑会话失败:', error)
      res.status(500).json({
        success: false,
        message: '获取编辑会话失败'
      })
    }
  }

  /**
   * 更新文档内容
   */
  static async updateContent(req, res) {
    try {
      const { sessionId } = req.params
      const { content, type = 'original' } = req.body

      if (!content && content !== '') {
        return res.status(400).json({
          success: false,
          message: '内容不能为空'
        })
      }

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查用户权限
      if (session.userId !== req.user.id && !session.collaborators.has(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: '无权修改此文档'
        })
      }

      const change = await AdvancedEditorService.updateDocumentContent(
        sessionId,
        content,
        type
      )

      res.json({
        success: true,
        message: '内容更新成功',
        data: {
          changeId: change.id,
          contentType: type,
          timestamp: change.timestamp,
          metadata: change.metadata
        }
      })

    } catch (error) {
      logger.error('更新文档内容失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '更新文档内容失败'
      })
    }
  }

  /**
   * 术语高亮处理
   */
  static async highlightTerminology(req, res) {
    try {
      const { sessionId } = req.params
      const { text, terminologyData } = req.body

      if (!text) {
        return res.status(400).json({
          success: false,
          message: '文本内容不能为空'
        })
      }

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      const result = await AdvancedEditorService.highlightTerminology(
        sessionId,
        text,
        terminologyData
      )

      res.json({
        success: true,
        message: '术语高亮处理完成',
        data: result
      })

    } catch (error) {
      logger.error('术语高亮处理失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '术语高亮处理失败'
      })
    }
  }

  /**
   * 翻译对比
   */
  static async compareTranslations(req, res) {
    try {
      const { sessionId } = req.params
      const { originalText, translatedText, options = {} } = req.body

      if (!originalText || !translatedText) {
        return res.status(400).json({
          success: false,
          message: '原文和译文不能为空'
        })
      }

      const comparison = await AdvancedEditorService.compareTranslations(
        sessionId,
        originalText,
        translatedText,
        options
      )

      res.json({
        success: true,
        message: '翻译对比完成',
        data: comparison
      })

    } catch (error) {
      logger.error('翻译对比失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '翻译对比失败'
      })
    }
  }

  /**
   * 获取版本历史
   */
  static async getVersionHistory(req, res) {
    try {
      const { sessionId } = req.params
      const { contentType = 'original' } = req.query

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查用户权限
      if (session.userId !== req.user.id && !session.collaborators.has(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: '无权访问版本历史'
        })
      }

      const versions = AdvancedEditorService.getVersionHistory(sessionId, contentType)

      res.json({
        success: true,
        data: {
          sessionId: sessionId,
          contentType: contentType,
          versions: versions.map(v => ({
            version: v.version,
            timestamp: v.timestamp,
            userId: v.userId,
            metadata: v.metadata
          }))
        }
      })

    } catch (error) {
      logger.error('获取版本历史失败:', error)
      res.status(500).json({
        success: false,
        message: '获取版本历史失败'
      })
    }
  }

  /**
   * 恢复版本
   */
  static async restoreVersion(req, res) {
    try {
      const { sessionId } = req.params
      const { contentType, versionNumber } = req.body

      if (!contentType || !versionNumber) {
        return res.status(400).json({
          success: false,
          message: '内容类型和版本号不能为空'
        })
      }

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查用户权限
      if (session.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '只有会话创建者可以恢复版本'
        })
      }

      const restoredVersion = await AdvancedEditorService.restoreVersion(
        sessionId,
        contentType,
        versionNumber
      )

      res.json({
        success: true,
        message: '版本恢复成功',
        data: {
          version: restoredVersion.version,
          contentType: contentType,
          timestamp: restoredVersion.timestamp
        }
      })

    } catch (error) {
      logger.error('恢复版本失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '恢复版本失败'
      })
    }
  }

  /**
   * 添加协作者
   */
  static async addCollaborator(req, res) {
    try {
      const { sessionId } = req.params
      const { userId } = req.body

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '用户ID不能为空'
        })
      }

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查权限（只有会话创建者可以添加协作者）
      if (session.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '只有会话创建者可以添加协作者'
        })
      }

      const collaborators = await AdvancedEditorService.addCollaborator(sessionId, userId)

      res.json({
        success: true,
        message: '协作者添加成功',
        data: {
          sessionId: sessionId,
          collaborators: collaborators
        }
      })

    } catch (error) {
      logger.error('添加协作者失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '添加协作者失败'
      })
    }
  }

  /**
   * 移除协作者
   */
  static async removeCollaborator(req, res) {
    try {
      const { sessionId, userId } = req.params

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查权限（会话创建者或协作者本人可以移除）
      if (session.userId !== req.user.id && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权移除此协作者'
        })
      }

      const collaborators = await AdvancedEditorService.removeCollaborator(sessionId, userId)

      res.json({
        success: true,
        message: '协作者移除成功',
        data: {
          sessionId: sessionId,
          collaborators: collaborators
        }
      })

    } catch (error) {
      logger.error('移除协作者失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '移除协作者失败'
      })
    }
  }

  /**
   * 关闭编辑会话
   */
  static async closeSession(req, res) {
    try {
      const { sessionId } = req.params

      const session = AdvancedEditorService.getEditingSession(sessionId)
      if (!session) {
        return res.status(404).json({
          success: false,
          message: '编辑会话不存在'
        })
      }

      // 检查权限（只有会话创建者可以关闭会话）
      if (session.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '只有会话创建者可以关闭会话'
        })
      }

      const closed = await AdvancedEditorService.closeEditingSession(sessionId)

      if (closed) {
        res.json({
          success: true,
          message: '编辑会话已关闭'
        })
      } else {
        res.status(400).json({
          success: false,
          message: '关闭编辑会话失败'
        })
      }

    } catch (error) {
      logger.error('关闭编辑会话失败:', error)
      res.status(500).json({
        success: false,
        message: error.message || '关闭编辑会话失败'
      })
    }
  }

  /**
   * 获取活跃会话统计
   */
  static async getSessionStats(req, res) {
    try {
      const stats = AdvancedEditorService.getActiveSessionsStats()

      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      logger.error('获取会话统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取会话统计失败'
      })
    }
  }

  /**
   * 获取用户的编辑会话列表
   */
  static async getUserSessions(req, res) {
    try {
      const userId = req.user.id
      const { status = 'active' } = req.query

      const allSessions = Array.from(AdvancedEditorService.editingSessions.values())
      
      // 过滤用户相关的会话
      const userSessions = allSessions.filter(session => 
        session.userId === userId || session.collaborators.has(userId)
      )

      // 根据状态过滤
      const filteredSessions = status === 'active' 
        ? userSessions.filter(session => session.isActive)
        : userSessions

      // 简化会话信息
      const sessionList = filteredSessions.map(session => ({
        sessionId: session.id,
        documentId: session.documentId,
        role: session.userId === userId ? 'owner' : 'collaborator',
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        collaborators: Array.from(session.collaborators),
        isActive: session.isActive
      }))

      res.json({
        success: true,
        data: {
          sessions: sessionList,
          total: sessionList.length
        }
      })

    } catch (error) {
      logger.error('获取用户会话列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取用户会话列表失败'
      })
    }
  }

  /**
   * WebSocket连接处理（用于实时协作）
   */
  static setupWebSocket(io) {
    // 监听高级编辑器服务的事件
    AdvancedEditorService.on('sessionCreated', (session) => {
      io.emit('sessionCreated', {
        sessionId: session.id,
        documentId: session.documentId,
        userId: session.userId
      })
    })

    AdvancedEditorService.on('contentUpdated', (data) => {
      io.to(`session_${data.sessionId}`).emit('contentUpdated', {
        sessionId: data.sessionId,
        type: data.type,
        content: data.content,
        changeId: data.change.id,
        timestamp: data.change.timestamp
      })
    })

    AdvancedEditorService.on('collaboratorJoined', (data) => {
      io.to(`session_${data.sessionId}`).emit('collaboratorJoined', data)
    })

    AdvancedEditorService.on('collaboratorLeft', (data) => {
      io.to(`session_${data.sessionId}`).emit('collaboratorLeft', data)
    })

    AdvancedEditorService.on('versionSaved', (version) => {
      io.to(`session_${version.sessionId}`).emit('versionSaved', {
        sessionId: version.sessionId,
        version: version.version,
        contentType: version.contentType,
        timestamp: version.timestamp
      })
    })

    AdvancedEditorService.on('sessionClosed', (session) => {
      io.to(`session_${session.id}`).emit('sessionClosed', {
        sessionId: session.id
      })
    })

    // WebSocket连接处理
    io.on('connection', (socket) => {
      // 加入编辑会话房间
      socket.on('joinSession', (sessionId) => {
        socket.join(`session_${sessionId}`)
        logger.info(`用户加入编辑会话: ${sessionId}`)
      })

      // 离开编辑会话房间
      socket.on('leaveSession', (sessionId) => {
        socket.leave(`session_${sessionId}`)
        logger.info(`用户离开编辑会话: ${sessionId}`)
      })

      // 实时内容同步
      socket.on('contentChange', (data) => {
        socket.to(`session_${data.sessionId}`).emit('contentChange', data)
      })

      // 光标位置同步
      socket.on('cursorMove', (data) => {
        socket.to(`session_${data.sessionId}`).emit('cursorMove', data)
      })
    })
  }
}

module.exports = EditorController
