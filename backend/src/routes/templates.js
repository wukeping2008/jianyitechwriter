const express = require('express')
const TemplateController = require('../controllers/templateController')
const { authenticate } = require('../middleware/auth')
const router = express.Router()

/**
 * @route GET /api/templates
 * @desc 获取模板列表
 * @access Private
 */
router.get('/', authenticate, TemplateController.getTemplates)

/**
 * @route GET /api/templates/types
 * @desc 获取模板类型列表
 * @access Private
 */
router.get('/types', authenticate, TemplateController.getTemplateTypes)

/**
 * @route GET /api/templates/categories
 * @desc 获取产品类别列表
 * @access Private
 */
router.get('/categories', authenticate, TemplateController.getProductCategories)

/**
 * @route GET /api/templates/recommendations
 * @desc 获取推荐模板
 * @access Private
 */
router.get('/recommendations', authenticate, TemplateController.getRecommendedTemplates)

/**
 * @route GET /api/templates/statistics
 * @desc 获取模板统计信息
 * @access Private
 */
router.get('/statistics', authenticate, TemplateController.getTemplateStatistics)

/**
 * @route GET /api/templates/my-templates
 * @desc 获取用户的模板
 * @access Private
 */
router.get('/my-templates', authenticate, TemplateController.getUserTemplates)

/**
 * @route POST /api/templates/initialize-defaults
 * @desc 初始化默认模板
 * @access Private
 */
router.post('/initialize-defaults', authenticate, TemplateController.initializeDefaultTemplates)

/**
 * @route POST /api/templates
 * @desc 创建新模板
 * @access Private
 */
router.post('/', authenticate, TemplateController.createTemplate)

/**
 * @route POST /api/templates/import
 * @desc 导入模板
 * @access Private
 */
router.post('/import', authenticate, TemplateController.importTemplate)

/**
 * @route GET /api/templates/:templateId
 * @desc 获取模板详情
 * @access Private
 */
router.get('/:templateId', authenticate, TemplateController.getTemplateById)

/**
 * @route PUT /api/templates/:templateId
 * @desc 更新模板
 * @access Private
 */
router.put('/:templateId', authenticate, TemplateController.updateTemplate)

/**
 * @route DELETE /api/templates/:templateId
 * @desc 删除模板
 * @access Private
 */
router.delete('/:templateId', authenticate, TemplateController.deleteTemplate)

/**
 * @route POST /api/templates/:templateId/duplicate
 * @desc 复制模板
 * @access Private
 */
router.post('/:templateId/duplicate', authenticate, TemplateController.duplicateTemplate)

/**
 * @route POST /api/templates/:templateId/generate
 * @desc 生成文档
 * @access Private
 */
router.post('/:templateId/generate', authenticate, TemplateController.generateDocument)

/**
 * @route POST /api/templates/:templateId/validate
 * @desc 验证模板变量
 * @access Private
 */
router.post('/:templateId/validate', authenticate, TemplateController.validateTemplateVariables)

/**
 * @route POST /api/templates/:templateId/preview
 * @desc 获取模板预览
 * @access Private
 */
router.post('/:templateId/preview', authenticate, TemplateController.getTemplatePreview)

/**
 * @route GET /api/templates/:templateId/export
 * @desc 导出模板
 * @access Private
 */
router.get('/:templateId/export', authenticate, TemplateController.exportTemplate)

/**
 * @route POST /api/templates/:templateId/review
 * @desc 添加模板评价
 * @access Private
 */
router.post('/:templateId/review', authenticate, TemplateController.addTemplateReview)

module.exports = router
