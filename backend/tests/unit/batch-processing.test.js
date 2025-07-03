const BatchProcessingService = require('../../src/services/BatchProcessingService')
const DocumentParserService = require('../../src/services/DocumentParserService')
const AITranslationService = require('../../src/services/AITranslationService')
const DocumentGeneratorService = require('../../src/services/DocumentGeneratorService')

// Mock依赖服务
jest.mock('../../src/services/DocumentParserService')
jest.mock('../../src/services/AITranslationService')
jest.mock('../../src/services/DocumentGeneratorService')
jest.mock('../../src/utils/logger')

describe('BatchProcessingService', () => {
  beforeEach(() => {
    // 清理所有任务
    BatchProcessingService.taskQueue = []
    BatchProcessingService.activeTasks.clear()
    BatchProcessingService.completedTasks.clear()
    BatchProcessingService.failedTasks.clear()
    
    // 重置统计信息
    BatchProcessingService.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0
    }
    
    // 重置工作线程池
    BatchProcessingService.workerPool = {
      available: 10,
      busy: 0
    }
    
    // 清理所有mock
    jest.clearAllMocks()
  })

  describe('创建批量任务', () => {
    test('应该成功创建批量任务', async () => {
      const files = [
        { name: 'test1.txt', path: '/tmp/test1.txt', size: 1000 },
        { name: 'test2.txt', path: '/tmp/test2.txt', size: 2000 }
      ]
      
      const options = {
        targetLanguage: 'en',
        outputFormat: 'docx'
      }

      const task = await BatchProcessingService.createBatchTask(files, options)

      expect(task).toBeDefined()
      expect(task.id).toMatch(/^batch_\d+_[a-z0-9]+$/)
      expect(task.status).toBe('pending')
      expect(task.files).toEqual(files)
      expect(task.options.targetLanguage).toBe('en')
      expect(task.progress.total).toBe(2)
      expect(task.progress.completed).toBe(0)
      expect(task.progress.failed).toBe(0)
      expect(task.progress.percentage).toBe(0)
    })

    test('应该拒绝空文件列表', async () => {
      await expect(BatchProcessingService.createBatchTask([], {}))
        .rejects.toThrow('文件列表不能为空')
    })

    test('应该拒绝超过限制的文件数量', async () => {
      const files = Array(51).fill().map((_, i) => ({
        name: `test${i}.txt`,
        path: `/tmp/test${i}.txt`,
        size: 1000
      }))

      await expect(BatchProcessingService.createBatchTask(files, {}))
        .rejects.toThrow('批量文件数量超过限制')
    })

    test('应该拒绝超过大小限制的文件', async () => {
      const files = [
        { name: 'large.txt', path: '/tmp/large.txt', size: 2 * 1024 * 1024 * 1024 } // 2GB
      ]

      await expect(BatchProcessingService.createBatchTask(files, {}))
        .rejects.toThrow('批量文件总大小超过限制')
    })
  })

  describe('任务处理', () => {
    test('应该成功处理单个文件', async () => {
      // Mock服务响应
      DocumentParserService.parseDocument.mockResolvedValue({
        text: '这是测试文档内容',
        metadata: { pages: 1 }
      })
      
      AITranslationService.translateDocument.mockResolvedValue({
        translatedText: 'This is test document content',
        confidence: 0.95
      })

      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {
        targetLanguage: 'en'
      })

      // 等待任务完成
      await new Promise(resolve => {
        BatchProcessingService.on('taskCompleted', (completedTask) => {
          if (completedTask.id === task.id) {
            resolve()
          }
        })
      })

      const completedTask = BatchProcessingService.getTaskStatus(task.id)
      expect(completedTask.status).toBe('completed')
      expect(completedTask.progress.completed).toBe(1)
      expect(completedTask.progress.failed).toBe(0)
      expect(completedTask.progress.percentage).toBe(100)
      expect(completedTask.results).toHaveLength(1)
      expect(completedTask.results[0].status).toBe('completed')
    })

    test('应该处理文件解析失败', async () => {
      // Mock服务失败
      DocumentParserService.parseDocument.mockRejectedValue(
        new Error('文件解析失败')
      )

      const files = [
        { name: 'invalid.txt', path: '/tmp/invalid.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {})

      // 等待任务完成
      await new Promise(resolve => {
        BatchProcessingService.on('taskCompleted', (completedTask) => {
          if (completedTask.id === task.id) {
            resolve()
          }
        })
      })

      const completedTask = BatchProcessingService.getTaskStatus(task.id)
      expect(completedTask.status).toBe('failed')
      expect(completedTask.progress.completed).toBe(0)
      expect(completedTask.progress.failed).toBe(1)
      expect(completedTask.results[0].status).toBe('failed')
      expect(completedTask.results[0].error).toBe('文件解析失败')
    })

    test('应该处理部分成功的批量任务', async () => {
      // Mock第一个文件成功，第二个文件失败
      DocumentParserService.parseDocument
        .mockResolvedValueOnce({
          text: '成功的文档',
          metadata: { pages: 1 }
        })
        .mockRejectedValueOnce(new Error('解析失败'))

      AITranslationService.translateDocument.mockResolvedValue({
        translatedText: 'Successful document',
        confidence: 0.95
      })

      const files = [
        { name: 'success.txt', path: '/tmp/success.txt', size: 1000 },
        { name: 'fail.txt', path: '/tmp/fail.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {
        targetLanguage: 'en'
      })

      // 等待任务完成
      await new Promise(resolve => {
        BatchProcessingService.on('taskCompleted', (completedTask) => {
          if (completedTask.id === task.id) {
            resolve()
          }
        })
      })

      const completedTask = BatchProcessingService.getTaskStatus(task.id)
      expect(completedTask.status).toBe('partial')
      expect(completedTask.progress.completed).toBe(1)
      expect(completedTask.progress.failed).toBe(1)
      expect(completedTask.progress.percentage).toBe(100)
      expect(completedTask.results).toHaveLength(2)
    })
  })

  describe('任务管理', () => {
    test('应该能够获取任务状态', async () => {
      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {})
      const status = BatchProcessingService.getTaskStatus(task.id)

      expect(status).toBeDefined()
      expect(status.id).toBe(task.id)
      expect(status.status).toBe('pending')
    })

    test('应该能够获取所有任务列表', async () => {
      const files1 = [{ name: 'test1.txt', path: '/tmp/test1.txt', size: 1000 }]
      const files2 = [{ name: 'test2.txt', path: '/tmp/test2.txt', size: 1000 }]

      const task1 = await BatchProcessingService.createBatchTask(files1, {})
      const task2 = await BatchProcessingService.createBatchTask(files2, {})

      const allTasks = BatchProcessingService.getAllTasks()

      expect(allTasks).toHaveLength(2)
      expect(allTasks.map(t => t.id)).toContain(task1.id)
      expect(allTasks.map(t => t.id)).toContain(task2.id)
    })

    test('应该能够取消等待中的任务', async () => {
      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {})
      const cancelled = BatchProcessingService.cancelTask(task.id)

      expect(cancelled).toBe(true)
      
      const cancelledTask = BatchProcessingService.getTaskStatus(task.id)
      expect(cancelledTask.status).toBe('cancelled')
    })

    test('应该能够重试失败的任务', async () => {
      // 创建一个失败的任务
      DocumentParserService.parseDocument.mockRejectedValue(
        new Error('解析失败')
      )

      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {})

      // 等待任务失败
      await new Promise(resolve => {
        BatchProcessingService.on('taskCompleted', resolve)
      })

      // 修复mock，然后重试
      DocumentParserService.parseDocument.mockResolvedValue({
        text: '修复后的文档',
        metadata: { pages: 1 }
      })

      const retriedTask = await BatchProcessingService.retryTask(task.id)

      expect(retriedTask.status).toBe('pending')
      expect(retriedTask.retryCount).toBe(1)
    })
  })

  describe('统计信息', () => {
    test('应该正确计算统计信息', async () => {
      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      await BatchProcessingService.createBatchTask(files, {})
      
      const stats = BatchProcessingService.getStats()

      expect(stats.totalTasks).toBe(1)
      expect(stats.queueLength).toBe(1)
      expect(stats.activeTasks).toBe(0)
      expect(stats.completedTasks).toBe(0)
      expect(stats.failedTasks).toBe(0)
      expect(stats.workerPool.available).toBe(10)
      expect(stats.workerPool.busy).toBe(0)
    })
  })

  describe('任务导出', () => {
    test('应该能够导出JSON格式的任务结果', async () => {
      // Mock成功的任务
      DocumentParserService.parseDocument.mockResolvedValue({
        text: '测试文档',
        metadata: { pages: 1 }
      })

      AITranslationService.translateDocument.mockResolvedValue({
        translatedText: 'Test document',
        confidence: 0.95
      })

      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {
        targetLanguage: 'en'
      })

      // 等待任务完成
      await new Promise(resolve => {
        BatchProcessingService.on('taskCompleted', resolve)
      })

      const exportData = await BatchProcessingService.exportTaskResults(task.id, 'json')

      expect(exportData.format).toBe('json')
      expect(exportData.taskId).toBe(task.id)
      expect(exportData.results).toBeDefined()
      expect(exportData.exportedAt).toBeDefined()
    })

    test('应该拒绝导出未完成的任务', async () => {
      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {})

      await expect(BatchProcessingService.exportTaskResults(task.id, 'json'))
        .rejects.toThrow('任务未完成，无法导出结果')
    })
  })

  describe('任务清理', () => {
    test('应该能够清理过期的完成任务', async () => {
      // 创建一个模拟的旧任务
      const oldTask = {
        id: 'old_task',
        status: 'completed',
        completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25小时前
      }

      BatchProcessingService.completedTasks.set('old_task', oldTask)

      const cleanedCount = BatchProcessingService.cleanupCompletedTasks(24)

      expect(cleanedCount).toBe(1)
      expect(BatchProcessingService.completedTasks.has('old_task')).toBe(false)
    })
  })

  describe('事件处理', () => {
    test('应该触发任务创建事件', async () => {
      const eventSpy = jest.fn()
      BatchProcessingService.on('taskCreated', eventSpy)

      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      await BatchProcessingService.createBatchTask(files, {})

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          files: files
        })
      )
    })

    test('应该触发进度更新事件', async () => {
      const progressSpy = jest.fn()
      BatchProcessingService.on('progressUpdated', progressSpy)

      DocumentParserService.parseDocument.mockResolvedValue({
        text: '测试文档',
        metadata: { pages: 1 }
      })

      const files = [
        { name: 'test.txt', path: '/tmp/test.txt', size: 1000 }
      ]

      const task = await BatchProcessingService.createBatchTask(files, {})

      // 等待进度更新
      await new Promise(resolve => {
        BatchProcessingService.on('progressUpdated', (data) => {
          if (data.taskId === task.id && data.progress.percentage === 100) {
            resolve()
          }
        })
      })

      expect(progressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: task.id,
          progress: expect.objectContaining({
            percentage: expect.any(Number)
          })
        })
      )
    })
  })
})
