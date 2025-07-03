const express = require('express')
const multer = require('multer')
const path = require('path')
const documentController = require('../controllers/documentController')
const auth = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 支持的文件类型
  const allowedTypes = [
    // Excel
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    // Word
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    // PDF
    'application/pdf',
    // Text
    'text/plain',
    'text/markdown',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp'
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false)
  }
}

// 单文件上传配置
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1
  }
})

// 多文件上传配置
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // 最多10个文件
  }
})

// 错误处理中间件
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: '文件大小超过限制 (100MB)'
        })
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: '文件数量超过限制 (10个)'
        })
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: '意外的文件字段'
        })
      default:
        return res.status(400).json({
          success: false,
          message: `文件上传错误: ${error.message}`
        })
    }
  }
  
  if (error.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
  
  next(error)
}

// 路由定义

/**
 * @route   GET /api/documents/formats
 * @desc    获取支持的文件格式
 * @access  Public
 */
router.get('/formats', documentController.getSupportedFormats)

/**
 * @route   GET /api/documents/templates
 * @desc    获取可用的文档模板
 * @access  Private
 */
router.get('/templates', auth, documentController.getTemplates)

/**
 * @route   GET /api/documents/stats
 * @desc    获取文档生成统计信息
 * @access  Private
 */
router.get('/stats', auth, documentController.getStats)

/**
 * @route   POST /api/documents/upload
 * @desc    上传并解析文档
 * @access  Private
 */
router.post('/upload', 
  auth, 
  upload.single('document'), 
  handleMulterError,
  documentController.uploadAndParse
)

/**
 * @route   POST /api/documents/upload-multiple
 * @desc    批量上传并解析文档
 * @access  Private
 */
router.post('/upload-multiple', 
  auth, 
  uploadMultiple.array('documents', 10), 
  handleMulterError,
  documentController.uploadAndParseMultiple
)

/**
 * @route   POST /api/documents/generate
 * @desc    根据解析数据生成产品手册
 * @access  Private
 */
router.post('/generate', auth, documentController.generateManual)

/**
 * @route   POST /api/documents/generate-from-upload
 * @desc    完整的文档生成流程（上传 + 解析 + 生成）
 * @access  Private
 */
router.post('/generate-from-upload', 
  auth, 
  upload.single('document'), 
  handleMulterError,
  documentController.generateFromUpload
)

/**
 * @route   POST /api/documents/identify-type
 * @desc    识别产品类型
 * @access  Private
 */
router.post('/identify-type', auth, documentController.identifyProductType)

/**
 * @route   POST /api/documents/preview
 * @desc    预览生成的文档
 * @access  Private
 */
router.post('/preview', auth, documentController.previewDocument)

/**
 * @route   POST /api/documents/export
 * @desc    导出文档
 * @access  Private
 */
router.post('/export', auth, documentController.exportDocument)

/**
 * @route GET /api/documents/:id/download
 * @desc 下载翻译后的文档
 * @access Private
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params
    
    // 这里应该从数据库或文件系统获取翻译后的文档
    // 目前返回一个简单的文本文件作为演示
    const translatedContent = `翻译文档 - ${id}

这是一个翻译后的文档示例。

PXI-6251 数据采集设备

PXI-6251是一款适用于PXI系统的高性能多功能数据采集(DAQ)设备。
它在单个模块中提供模拟输入、模拟输出和数字I/O功能。

主要特性：
• 16个模拟输入通道，16位分辨率
• 2个模拟输出通道，16位分辨率  
• 24条数字I/O线
• 最大采样率1.25 MS/s

技术规格：
• 输入电压范围：±10V, ±5V, ±1V, ±0.2V
• 精度：±2.69 mV (±10V范围)
• 采样率：单通道1.25 MS/s，多通道1.25 MS/s总和
• 板载内存：512 kS

应用领域：
• 自动化测试设备
• 数据记录系统
• 控制系统
• 研发验证

简仪科技 - 专业的测控解决方案提供商
`

    // 设置响应头
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="translated_document_${id}.txt"`)
    
    res.send(translatedContent)

  } catch (error) {
    logger.error('文档下载失败:', error)
    next(error)
  }
})

module.exports = router
