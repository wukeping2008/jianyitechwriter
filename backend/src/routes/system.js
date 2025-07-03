const express = require('express')
const SystemController = require('../controllers/systemController')
const { authenticate } = require('../middleware/auth')
const router = express.Router()

/**
 * @route GET /api/system/status
 * @desc 获取系统状态
 * @access Private
 */
router.get('/status', authenticate, SystemController.getSystemStatus)

/**
 * @route GET /api/system/metrics
 * @desc 获取系统性能指标
 * @access Private
 */
router.get('/metrics', authenticate, SystemController.getPerformanceMetrics)

/**
 * @route GET /api/system/health
 * @desc 获取系统健康检查
 * @access Public
 */
router.get('/health', SystemController.getHealthCheck)

/**
 * @route GET /api/system/configuration
 * @desc 获取系统配置
 * @access Private
 */
router.get('/configuration', authenticate, SystemController.getSystemConfiguration)

/**
 * @route POST /api/system/initialize
 * @desc 初始化系统
 * @access Private
 */
router.post('/initialize', authenticate, SystemController.initializeSystem)

/**
 * @route POST /api/system/metrics
 * @desc 记录性能指标
 * @access Private
 */
router.post('/metrics', authenticate, SystemController.recordMetrics)

/**
 * @route GET /api/system/workflows
 * @desc 获取工作流列表
 * @access Private
 */
router.get('/workflows', authenticate, SystemController.getWorkflows)

/**
 * @route GET /api/system/workflows/:workflowId
 * @desc 获取工作流详情
 * @access Private
 */
router.get('/workflows/:workflowId', authenticate, SystemController.getWorkflowById)

/**
 * @route POST /api/system/workflows/document-generation
 * @desc 执行文档生成工作流
 * @access Private
 */
router.post('/workflows/document-generation', authenticate, SystemController.executeDocumentGenerationWorkflow)

/**
 * @route POST /api/system/workflows/batch-translation
 * @desc 执行批量翻译工作流
 * @access Private
 */
router.post('/workflows/batch-translation', authenticate, SystemController.executeBatchTranslationWorkflow)

/**
 * @route POST /api/system/workflows/quality-assurance
 * @desc 执行质量保证工作流
 * @access Private
 */
router.post('/workflows/quality-assurance', authenticate, SystemController.executeQualityAssuranceWorkflow)

module.exports = router
