const express = require('express')
const EditorController = require('../controllers/editorController')
const { authenticate } = require('../middleware/auth')
const router = express.Router()

/**
 * @route POST /api/editor/sessions
 * @desc 创建编辑会话
 * @access Private
 */
router.post('/sessions', authenticate, EditorController.createSession)

/**
 * @route GET /api/editor/sessions/:sessionId
 * @desc 获取编辑会话信息
 * @access Private
 */
router.get('/sessions/:sessionId', authenticate, EditorController.getSession)

/**
 * @route PUT /api/editor/sessions/:sessionId/content
 * @desc 更新文档内容
 * @access Private
 */
router.put('/sessions/:sessionId/content', authenticate, EditorController.updateContent)

/**
 * @route POST /api/editor/sessions/:sessionId/highlight
 * @desc 术语高亮处理
 * @access Private
 */
router.post('/sessions/:sessionId/highlight', authenticate, EditorController.highlightTerminology)

/**
 * @route POST /api/editor/sessions/:sessionId/compare
 * @desc 翻译对比
 * @access Private
 */
router.post('/sessions/:sessionId/compare', authenticate, EditorController.compareTranslations)

/**
 * @route GET /api/editor/sessions/:sessionId/versions
 * @desc 获取版本历史
 * @access Private
 */
router.get('/sessions/:sessionId/versions', authenticate, EditorController.getVersionHistory)

/**
 * @route POST /api/editor/sessions/:sessionId/restore
 * @desc 恢复版本
 * @access Private
 */
router.post('/sessions/:sessionId/restore', authenticate, EditorController.restoreVersion)

/**
 * @route POST /api/editor/sessions/:sessionId/collaborators
 * @desc 添加协作者
 * @access Private
 */
router.post('/sessions/:sessionId/collaborators', authenticate, EditorController.addCollaborator)

/**
 * @route DELETE /api/editor/sessions/:sessionId/collaborators/:userId
 * @desc 移除协作者
 * @access Private
 */
router.delete('/sessions/:sessionId/collaborators/:userId', authenticate, EditorController.removeCollaborator)

/**
 * @route DELETE /api/editor/sessions/:sessionId
 * @desc 关闭编辑会话
 * @access Private
 */
router.delete('/sessions/:sessionId', authenticate, EditorController.closeSession)

/**
 * @route GET /api/editor/stats
 * @desc 获取活跃会话统计
 * @access Private
 */
router.get('/stats', authenticate, EditorController.getSessionStats)

/**
 * @route GET /api/editor/my-sessions
 * @desc 获取用户的编辑会话列表
 * @access Private
 */
router.get('/my-sessions', authenticate, EditorController.getUserSessions)

module.exports = router
