const express = require('express')
const { BatchController, upload } = require('../controllers/batchController')
const { authenticate } = require('../middleware/auth')
const router = express.Router()

/**
 * @route POST /api/batch/tasks
 * @desc 创建批量处理任务
 * @access Private
 */
router.post('/tasks', 
  authenticate, 
  upload.array('files', 50), // 最多50个文件
  BatchController.createBatchTask
)

/**
 * @route GET /api/batch/tasks/:taskId
 * @desc 获取任务状态
 * @access Private
 */
router.get('/tasks/:taskId', authenticate, BatchController.getTaskStatus)

/**
 * @route GET /api/batch/tasks/:taskId/results
 * @desc 获取任务结果
 * @access Private
 */
router.get('/tasks/:taskId/results', authenticate, BatchController.getTaskResults)

/**
 * @route GET /api/batch/tasks
 * @desc 获取所有任务列表
 * @access Private
 */
router.get('/tasks', authenticate, BatchController.getAllTasks)

/**
 * @route DELETE /api/batch/tasks/:taskId
 * @desc 取消任务
 * @access Private
 */
router.delete('/tasks/:taskId', authenticate, BatchController.cancelTask)

/**
 * @route POST /api/batch/tasks/:taskId/retry
 * @desc 重试失败任务
 * @access Private
 */
router.post('/tasks/:taskId/retry', authenticate, BatchController.retryTask)

/**
 * @route GET /api/batch/tasks/:taskId/export
 * @desc 导出任务结果
 * @access Private
 */
router.get('/tasks/:taskId/export', authenticate, BatchController.exportTaskResults)

/**
 * @route GET /api/batch/stats
 * @desc 获取系统统计信息
 * @access Private
 */
router.get('/stats', authenticate, BatchController.getStats)

/**
 * @route POST /api/batch/cleanup
 * @desc 清理完成的任务
 * @access Private
 */
router.post('/cleanup', authenticate, BatchController.cleanupTasks)

module.exports = router
