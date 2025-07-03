const express = require('express')
const QualityController = require('../controllers/qualityController')
const { authenticate } = require('../middleware/auth')
const router = express.Router()

/**
 * @route POST /api/quality/check
 * @desc 执行质量检查
 * @access Private
 */
router.post('/check', authenticate, QualityController.performQualityCheck)

/**
 * @route GET /api/quality/reports/:checkId
 * @desc 获取质量检查报告
 * @access Private
 */
router.get('/reports/:checkId', authenticate, QualityController.getQualityReport)

/**
 * @route GET /api/quality/stats
 * @desc 获取质量检查统计信息
 * @access Private
 */
router.get('/stats', authenticate, QualityController.getQualityStats)

/**
 * @route GET /api/quality/rules
 * @desc 获取质量检查规则配置
 * @access Private
 */
router.get('/rules', authenticate, QualityController.getQualityRules)

/**
 * @route PUT /api/quality/rules
 * @desc 更新质量检查规则配置
 * @access Private
 */
router.put('/rules', authenticate, QualityController.updateQualityRules)

/**
 * @route POST /api/quality/batch-check
 * @desc 批量质量检查
 * @access Private
 */
router.post('/batch-check', authenticate, QualityController.batchQualityCheck)

/**
 * @route GET /api/quality/recommendations/:checkId
 * @desc 获取质量改进建议
 * @access Private
 */
router.get('/recommendations/:checkId', authenticate, QualityController.getQualityRecommendations)

/**
 * @route GET /api/quality/export/:checkId
 * @desc 导出质量检查报告
 * @access Private
 */
router.get('/export/:checkId', authenticate, QualityController.exportQualityReport)

module.exports = router
